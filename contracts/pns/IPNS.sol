// SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol';

pragma solidity ^0.8.0;

interface IPNS is IERC721Enumerable {

    // ownable

    event RootOwnershipTransferred(address indexed previousRoot, address indexed newRoot);

    function root() external view virtual returns (address);

    function transferRootOwnership(address newRoot) external virtual;

    // registry

    event NewResolver(uint256 tokenId, address resolver);
    event NewSubnameOwner(uint256 tokenId, string name, address owner);

    function resolver(uint256 tokenId) external virtual view returns (address);

    function setResolver(uint256 tokenId, address resolver) external virtual;

    function mintSubdomain(uint256 tokenId, string calldata name, address to) external returns (uint256);

    function burn(uint256 tokenId) external virtual;

    function isApprovedOrOwner(address addr, uint256 tokenId) external virtual view returns(bool);

    function exists(uint256 tokenId) external view virtual returns(bool);

    function mint(address to, uint256 newTokenId) external virtual;

}