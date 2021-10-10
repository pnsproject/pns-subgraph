pragma solidity ^0.8.4;

import "../registry/ENS.sol";
import "../../node_modules/@openzeppelin/contracts/access/Ownable.sol";

abstract contract Registrar is Ownable {

    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);

    event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint cost, uint expires);
    event NameRenewed(string name, bytes32 indexed label, uint cost, uint expires);

    uint constant public GRACE_PERIOD = 90 days;

    ENS public ens;
    bytes32 public baseNode;

    mapping(address=>bool) public controllers;

    uint public minCommitmentAge;
    uint public maxCommitmentAge;

    // Authorises a controller, who can register and renew domains.
    function addController(address controller) virtual external;

    // Revoke controller permission for an address.
    function removeController(address controller) virtual external;

    function nameExpires(uint256 id) virtual external view returns(uint);

    function available(uint256 id) virtual public view returns(bool);
    
    // function register(uint256 id, address owner, uint duration) virtual external returns(uint);

    // function renew(uint256 id, uint duration) virtual external returns(uint);
}