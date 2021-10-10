pragma solidity >=0.8.4;

interface Resolver{
    event NameChanged(bytes32 indexed node, string name);
    event AddressChanged(bytes32 indexed node, uint coinType, bytes newAddress);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key);
    event ContenthashChanged(bytes32 indexed node, bytes hash);

}