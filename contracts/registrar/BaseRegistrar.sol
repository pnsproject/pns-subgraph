pragma solidity ^0.8.4;

import "./Registrar.sol";
import "./SafeMath.sol";
import "./StringUtils.sol";

contract BaseRegistrar is Registrar {

    address root;
    
    mapping(uint256=>uint) expiries;

    uint constant public MIN_REGISTRATION_DURATION = 28 days;

    constructor(ENS _ens, bytes32 _baseNode, uint[] memory _rentPrices) {
        root = msg.sender;
        ens = _ens;
        baseNode = _baseNode;
        setPrices(_rentPrices);
    }

    modifier live {
        require(ens.owner(baseNode) == address(this));
        _;
    }

    // Authorises a controller, who can register and renew domains.
    function addController(address controller) external override onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    // Revoke controller permission for an address.
    function removeController(address controller) external override onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        require(expiries[tokenId] > block.timestamp);
        // return super.ownerOf(tokenId);
        return ens.owner(bytes32(tokenId));
    }

    // Returns the expiration timestamp of the specified id.
    function nameExpires(uint256 id) public view override returns(uint) {
        return expiries[id];
    }

    // Returns true iff the specified name is available for registration.
    function available(uint256 id) public view override returns(bool) {
        // Not available if it's registered here or in its grace period.
        return expiries[id] + GRACE_PERIOD < block.timestamp;
    }

    function _register(uint256 id, address owner, uint duration) internal live returns(uint) {
        require(available(id));
        require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD); // Prevent future overflow

        expiries[id] = block.timestamp + duration;
        ens.setSubnodeOwner(baseNode, bytes32(id), owner);

        return block.timestamp + duration;
    }

    function _renew(uint256 id, uint duration) internal live returns(uint) {
        require(expiries[id] + GRACE_PERIOD >= block.timestamp); // Name must be registered here or in grace period
        require(expiries[id] + duration + GRACE_PERIOD > duration + GRACE_PERIOD); // Prevent future overflow

        expiries[id] += duration;
        return expiries[id];
    }

    // controller methods

    function renew(string calldata name, uint duration) external payable {
        bytes32 label = keccak256(bytes(name));
        uint expires = _renew(uint256(label), duration);

        uint cost = rentPrice(name, duration);
        require(msg.value >= cost);

        emit NameRenewed(name, label, cost, expires);

        if(msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function register(string calldata name, address owner, uint duration) external payable {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        uint expires = _register(tokenId, owner, duration);

        uint cost = rentPrice(name, duration);
        require(duration >= MIN_REGISTRATION_DURATION);
        require(msg.value >= cost);

        emit NameRegistered(name, label, owner, cost, expires);

        // Refund any extra payment
        if(msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function nameRegister(string calldata name, address owner, uint duration) external payable {
        uint len = name.strlen();
        require(len > 10);

        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        uint expires = _register(tokenId, owner, duration);

        uint cost = rentPrice(name, duration);
        require(duration >= MIN_REGISTRATION_DURATION);
        require(msg.value >= cost);

        emit NameRegistered(name, label, owner, cost, expires);

        // Refund any extra payment
        if(msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function nameRedeem(string calldata name, address owner, uint duration, bytes memory code) external payable {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        require(recoverKey(name, duration, code) == root);

        uint expires = _register(tokenId, owner, duration);
        emit NameRegistered(name, label, owner, 0, expires);
    }

    // todo: mitigate security attack
    //
    // function nameRedeemAny(string calldata name, address owner, uint duration, bytes32 code) external payable {
    //     uint len = name.strlen();
    //     require(len > 10);

    //     bytes32 label = keccak256(bytes(name));
    //     uint256 tokenId = uint256(label);

    //     uint expires = _register(tokenId, owner, duration);
    //     emit NameRegistered(name, label, owner, 0, expires);
    // }

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

    // todo : use hash label instead
    function recoverKey(string memory name, uint duration, bytes memory code) public view returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;
        (v, r, s) = splitSignature(code);

        bytes32 msghash = keccak256(abi.encodePacked(name, duration));
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msghash));

        return ecrecover(hash, v, r, s);
    }

    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);        
    }

    function rentPrice(string memory name, uint duration) view public returns(uint) {
        bytes32 hash = keccak256(bytes(name));
        return price(name, nameExpires(uint256(hash)), duration);
    }

    // price oracle

    using SafeMath for *;
    using StringUtils for *;

    event RentPriceChanged(uint[] prices);
    
    function setPrices(uint[] memory _rentPrices) public onlyOwner {
        rentPrices = _rentPrices;
        emit RentPriceChanged(_rentPrices);
    }

    uint[] public rentPrices;

    function price(string memory name, uint expires, uint duration) public view returns(uint) {
        uint len = name.strlen();
        if(len > rentPrices.length) {
            len = rentPrices.length;
        }
        require(len > 3);
        
        uint basePrice = rentPrices[len - 1].mul(duration);

        return basePrice.mul(1e8);
    }

    function valid(string memory name) public pure returns(bool) {
        return name.strlen() >= 3;
    }

}
