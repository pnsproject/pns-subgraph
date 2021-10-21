// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../registrar/StringUtils.sol";
import "../registrar/SafeMath.sol";

import "./IPNS.sol";
import "./IController.sol";

contract Controller is IController {

    // ownable

    address private _root;

    modifier onlyRoot() {
        require(_root == msg.sender, "Ownable: caller is not the root");
        _;
    }

    function transferRootOwnership(address newRoot) public virtual override onlyRoot {
        require(newRoot != address(0), "Ownable: new root is the zero address");
        _setRoot(newRoot);
    }

    function _setRoot(address newRoot) private {
        address oldRoot = _root;
        _root = newRoot;
        emit RootOwnershipTransferred(oldRoot, _root);
    }

    function root() public view virtual override returns (address) {
        return _root;
    }

    // methods

    using SafeMath for *;
    using StringUtils for *;

    IPNS public _pns;

    struct Record {
        uint expire;
        uint register_fee;
        uint deposit;

        uint origin;
        uint parent;
        uint children;
        uint capacity;
    }

    mapping(uint256=>Record) records;

    uint256 public baseNode;

    uint constant public DEFAULT_DOMAIN_CAPACITY = 20;
    uint constant public MIN_REGISTRATION_DURATION = 28 days;

    uint constant public GRACE_PERIOD = 90 days;

    constructor(IPNS pns, uint256 _baseNode, uint[] memory _basePrices, uint[] memory _rentPrices) public {
        _setRoot(msg.sender);
        _pns = pns;
        baseNode = _baseNode;
        setBasePrices(_basePrices);
        setRentPrices(_rentPrices);
    }

    function nameExpires(uint256 tokenId) public override view returns(uint) {
        return records[tokenId].expire;
    }

    function expires(uint256 tokenId) public override view returns(uint) {
        return records[records[tokenId].origin].expire;
    }

    function capacity(uint256 tokenId) public override view returns(uint256) {
        return records[tokenId].capacity;
    }

    function children(uint256 tokenId) public override view returns(uint256) {
        return records[tokenId].children;
    }

    function origin(uint256 tokenId) public override view returns(uint256) {
        return records[tokenId].origin;
    }

    function parent(uint256 tokenId) public override view returns(uint256) {
        return records[tokenId].parent;
    }

    // Returns true iff the specified name is available for registration.
    function available(uint256 tokenId) public override view returns(bool) {
        // Not available if it's registered here or in its grace period.
        return records[tokenId].expire + GRACE_PERIOD < block.timestamp;
    }

    // register

    modifier live {
        require(_pns.ownerOf(baseNode) == address(this));
        _;
    }

    function _register(uint256 id, string calldata name, address owner, uint duration) internal live returns(uint) {
    }

    function nameRegister(string calldata name, address owner, uint duration) external override payable {
        uint len = name.strlen();
        require(len >= 10, "name must be longer than 10 chars");

        require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD); // Prevent future overflow
        uint256 tokenId = _pns.mintSubdomain(baseNode, name, owner);
        require(available(tokenId));

        uint expire = block.timestamp + duration;
        uint register_fee = registerPrice(name);
        uint deposit = register_fee.div(2);
        records[tokenId].expire = expire;
        records[tokenId].register_fee = register_fee;
        records[tokenId].deposit = deposit;
        records[tokenId].capacity = DEFAULT_DOMAIN_CAPACITY;
        records[tokenId].origin = tokenId;

        uint cost = register_fee + rentPrice(name, duration);
        require(duration >= MIN_REGISTRATION_DURATION, "duration must be longer than MIN_REGISTRATION_DURATION");
        require(msg.value >= cost, "insufficient fee");

        emit NameRegistered(name, tokenId, owner, cost, expire);

        // Refund any extra payment
        if(msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function _renew(uint256 id, uint duration) internal live returns(uint) {
        require(records[id].expire + GRACE_PERIOD >= block.timestamp, "Name must be registered here or in grace period"); // Name must be registered here or in grace period
        require(records[id].expire + duration + GRACE_PERIOD > duration + GRACE_PERIOD, "Prevent future overflow"); // Prevent future overflow

        records[id].expire += duration;
        return records[id].expire;
    }

    // controller methods

    function renew(string calldata name, uint duration) external override payable {
        bytes32 label = keccak256(bytes(name));
        bytes32 subnode = keccak256(abi.encodePacked(baseNode, label));
        uint256 tokenId = uint256(subnode);
        uint expires = _renew(tokenId, duration);

        uint cost = rentPrice(name, duration);
        require(msg.value >= cost, "insufficient fee");

        emit NameRenewed(name, tokenId, cost, expires);

        if(msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function renewByRoot(string calldata name, uint duration) external override onlyRoot {
        bytes32 label = keccak256(bytes(name));
        bytes32 subnode = keccak256(abi.encodePacked(baseNode, label));
        uint256 tokenId = uint256(subnode);
        uint expires = _renew(tokenId, duration);

        emit NameRenewed(name, tokenId, 0, expires);
    }

    // redeem

    mapping(uint256=>bool) redeems;

    function mintRedeem(uint256 start, uint256 end) external override onlyRoot {
        for (uint256 nonce=start; nonce < end; nonce += 1) {
          redeems[nonce] = true;
        }
    }

    function nameRedeem(string calldata name, address owner, uint duration, uint nonce, bytes memory code) external override payable {
        bytes32 label = keccak256(bytes(name));
        uint256 nameTokenId = uint256(label);
        require(recoverKey(abi.encodePacked(bytes32(nameTokenId), duration, nonce), code) == _root);

        require(redeems[nonce], "nonce is not available");
        redeems[nonce] = false;

        require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD); // Prevent future overflow
        uint256 tokenId = _pns.mintSubdomain(baseNode, name, owner);
        require(available(tokenId));

        uint expire = block.timestamp + duration;
        records[tokenId].expire = expire;
        records[tokenId].capacity = DEFAULT_DOMAIN_CAPACITY;
        records[tokenId].origin = tokenId;

        emit NameRegistered(name, tokenId, owner, 0, expire);
    }

    function nameRedeemAny(string calldata name, address owner, uint duration, uint nonce, bytes memory code) external override payable {
        bytes32 label = keccak256(bytes(name));
        uint256 nameTokenId = uint256(label);
        require(recoverKey(abi.encodePacked(duration, nonce), code) == _root);

        require(redeems[nonce], "nonce is not available");
        redeems[nonce] = false;

        require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD); // Prevent future overflow
        uint256 tokenId = _pns.mintSubdomain(baseNode, name, owner);
        require(available(tokenId));

        uint expire = block.timestamp + duration;
        records[tokenId].expire = expire;
        records[tokenId].capacity = DEFAULT_DOMAIN_CAPACITY;
        records[tokenId].origin = tokenId;

        emit NameRegistered(name, tokenId, owner, 0, expire);
    }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8, bytes32, bytes32)
    {
        require(sig.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function recoverKey(bytes memory data, bytes memory code) public view returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;
        (v, r, s) = splitSignature(code);

        bytes32 msghash = keccak256(data);
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msghash));

        return ecrecover(hash, v, r, s);
    }

    modifier authorised(uint256 tokenId) {
        require(_root == msg.sender || _pns.isApprovedOrOwner(msg.sender, tokenId), "not owner nor approved");
        _;
    }


    function setSubdomain(uint256 tokenId, string calldata name, address to) public virtual override authorised(tokenId) {
        require(records[tokenId].children < records[tokenId].capacity, "reach subdomain capacity");
        uint256 subtokenId = _pns.mintSubdomain(tokenId, name, to);

        emit NewSubdomain(name, subtokenId, tokenId, to);

        records[tokenId].children += 1;
        records[subtokenId].parent = tokenId;
        records[subtokenId].origin = records[tokenId].origin;
    }

    function burn(uint256 tokenId) public virtual override authorised(tokenId) {
        _pns.burn(tokenId);

        if (records[tokenId].origin == tokenId) {
          payable(msg.sender).transfer(records[tokenId].deposit);
          records[tokenId].deposit = 0;
        } else {
          records[records[tokenId].origin].children -= 1;
        }

        // todo : clear records
        records[tokenId].expire = 0;
        records[tokenId].register_fee = 0;
        records[tokenId].capacity = 0;
        records[tokenId].origin = 0;
    }

    // price

    uint[] public basePrices;
    uint[] public rentPrices;
    
    function setBasePrices(uint[] memory _basePrices) public override onlyRoot {
        basePrices = _basePrices;
        emit BasePriceChanged(_basePrices);
    }
    
    function setRentPrices(uint[] memory _rentPrices) public override onlyRoot {
        rentPrices = _rentPrices;
        emit RentPriceChanged(_rentPrices);
    }

    function totalRegisterPrice(string memory name, uint duration) view public override returns(uint) {
        return registerPrice(name) + rentPrice(name, duration);
    }

    function registerPrice(string memory name) view public override returns(uint) {
        uint len = name.strlen();
        if(len > basePrices.length) {
            len = basePrices.length;
        }
        uint basePrice = basePrices[len - 1];

        return basePrice;
    }

    function rentPrice(string memory name, uint duration) view public override returns(uint) {
        uint len = name.strlen();
        if(len > rentPrices.length) {
            len = rentPrices.length;
        }
        uint basePrice = rentPrices[len - 1].mul(duration);

        return basePrice;
    }

    function valid(string memory name) public pure returns(bool) {
        return name.strlen() >= 3;
    }

    function validLong(string memory name) public pure returns(bool) {
        return name.strlen() >= 10;
    }
}
