pragma solidity ^0.8.4;

import "./Registrar.sol";
import "./SafeMath.sol";
import "./StringUtils.sol";

contract BaseRegistrar is Registrar {
    
    mapping(uint256=>uint) expiries;

    uint constant public MIN_REGISTRATION_DURATION = 28 days;

    constructor(ENS _ens, bytes32 _baseNode, uint[] memory _rentPrices) {
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

    // function _nameExpires(uint256 id) view returns(uint) {
    //     return expiries[id];
    // }

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

    // commit

    mapping(bytes32=>uint) public commitments;

    function setCommitmentAges(uint _minCommitmentAge, uint _maxCommitmentAge) public onlyOwner {
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function makeCommitment(string memory name, address owner, bytes32 secret) pure public returns(bytes32) {
        bytes32 label = keccak256(bytes(name));
        return keccak256(abi.encodePacked(label, owner, secret));
    }

    function commit(bytes32 commitment) public {
        require(commitments[commitment] + maxCommitmentAge < block.timestamp);
        commitments[commitment] = block.timestamp;
    }

    function valid(string memory name) public pure returns(bool) {
        return name.strlen() >= 3;
    }

    function _consumeCommitment(string memory name, uint duration, bytes32 commitment) internal returns (uint256) {
        // Require a valid commitment
        require(commitments[commitment] + minCommitmentAge <= block.timestamp);

        // If the commitment is too old, or the name is registered, stop
        require(commitments[commitment] + maxCommitmentAge > block.timestamp);
        bytes32 label = keccak256(bytes(name));
        require(valid(name) && available(uint256(label)));

        delete(commitments[commitment]);

        uint cost = rentPrice(name, duration);
        require(duration >= MIN_REGISTRATION_DURATION);
        require(msg.value >= cost);

        return cost;
    }

}