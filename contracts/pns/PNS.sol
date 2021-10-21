// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./IPNS.sol";

contract PNS is IPNS, ERC721Enumerable {

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

    // ERC721 methods

    constructor() public ERC721("PNS", "pns") {
        _setRoot(msg.sender);
    }

    function exists(uint256 tokenId) public view virtual override returns(bool) {
        return _exists(tokenId);
    }

    // todo : put `to` last
    function mint(address to, uint256 newTokenId) public virtual override onlyRoot {
        _mint(to, newTokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return "https://meta.dot.site/";
    }

    modifier authorised(uint256 tokenId) {
        require(_root == msg.sender || isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _;
    }

    function isApprovedOrOwner(address addr, uint256 tokenId) public view override returns(bool) {
        return _isApprovedOrOwner(addr, tokenId);
    }


    // registry


    mapping (uint256 => address) resolvers;

    function resolver(uint256 tokenId) public virtual override view returns (address) {
        return resolvers[tokenId];
    }

    function setResolver(uint256 tokenId, address resolver) public virtual override authorised(tokenId) {
        emit NewResolver(tokenId, resolver);
        resolvers[tokenId] = resolver;
    }

    function _mintSubnode(uint256 tokenId, bytes32 label, address to) private authorised(tokenId) returns (uint256) {
        bytes32 subnode = keccak256(abi.encodePacked(tokenId, label));
        uint256 subtokenId = uint256(subnode);
        _mint(to, subtokenId);
        return subtokenId;
    }

    function mintSubdomain(uint256 tokenId, string calldata name, address to) public virtual override onlyRoot returns (uint256) {
        bytes32 label = keccak256(bytes(name));
        uint256 subtokenId = _mintSubnode(tokenId, label, to);

        emit NewSubnameOwner(tokenId, name, to);
        return subtokenId;
    }

    function burn(uint256 tokenId) public virtual override onlyRoot {
        _burn(tokenId);
    }
    // registrar
}
