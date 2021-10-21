// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IController {

    // ownable

    event RootOwnershipTransferred(address indexed previousRoot, address indexed newRoot);

    function root() external view virtual returns (address);

    function transferRootOwnership(address newRoot) external virtual;

    event BasePriceChanged(uint[] prices);
    event RentPriceChanged(uint[] prices);

    event NameRenewed(string name, uint256 node, uint256 cost, uint256 expires);
    event NameRegistered(string name, uint256 indexed node, address indexed owner, uint256 cost, uint256 expires);
    event NewSubdomain(string name, uint256 indexed node, uint256 indexed parent, address indexed owner);

    function nameExpires(uint256 tokenId) external view returns(uint);

    function expires(uint256 tokenId) external view returns(uint);

    function capacity(uint256 tokenId) external view returns(uint256);

    function children(uint256 tokenId) external view returns(uint256);

    function origin(uint256 tokenId) external view returns(uint256);

    function parent(uint256 tokenId) external view returns(uint256);

    function available(uint256 tokenId) external view returns(bool);

    function nameRegister(string calldata name, address owner, uint duration) external payable;

    function renew(string calldata name, uint duration) external payable;

    function renewByRoot(string calldata name, uint duration) external;

    function mintRedeem(uint256 start, uint256 end) external;

    function nameRedeem(string calldata name, address owner, uint duration, uint nonce, bytes memory code) external payable;

    function nameRedeemAny(string calldata name, address owner, uint duration, uint nonce, bytes memory code) external payable;

    function setSubdomain(uint256 tokenId, string calldata name, address to) external virtual;

    function burn(uint256 tokenId) external virtual;

    function setBasePrices(uint[] memory _basePrices) external;

    function setRentPrices(uint[] memory _rentPrices) external;

    function totalRegisterPrice(string memory name, uint duration) view external returns(uint);

    function registerPrice(string memory name) view external returns(uint);

    function rentPrice(string memory name, uint duration) view external returns(uint);

}
