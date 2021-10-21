pragma solidity ^0.8.0;

contract Auction {
    // Payable address can receive Ether
    address payable public root;
    mapping (bytes32 => Record) records;
    mapping (address => mapping (bytes32 => Bid)) public bids;

    uint32 constant totalAuctionLength = 2 days;

    struct Record {
        address owner;
        uint registrationDate;
        uint value;
        uint highestBid;
    }

    struct Bid {
        // address owner;
        // bytes32 node;
        uint value;
        uint timestamp;
    }

    // Payable constructor can receive Ether
    constructor() payable {
        root = payable(msg.sender);
    }

    function finishAt(string memory label) public view returns (uint) {
        bytes32 hash = keccak256(abi.encode(label));
        return records[hash].registrationDate;
    }

    function bidding(string memory label) public payable {
        bytes32 hash = keccak256(abi.encode(label));
        if (records[hash].registrationDate == 0) {
            records[hash].registrationDate = block.timestamp + totalAuctionLength;
        } else if (block.timestamp > records[hash].registrationDate) {
            // auction finished
            return;
        }
        if (msg.value == 0) {
            revert();
        }
        if (msg.value <= records[hash].highestBid) {
            revert();
        }
        if (bids[msg.sender][hash].value > 0) {
            bids[msg.sender][hash].value += msg.value;
        } else {
            bids[msg.sender][hash].value = msg.value;
            bids[msg.sender][hash].timestamp = block.timestamp;
        }
        if (bids[msg.sender][hash].value > records[hash].highestBid) {
          records[hash].highestBid = bids[msg.sender][hash].value;
        }

        // add value
        // sub annual fee
    }

    function claim(string memory label) public {
        bytes32 hash = keccak256(abi.encode(label));
        if (records[hash].registrationDate == 0) {
            // auction not started
            return;
        } else if (block.timestamp < records[hash].registrationDate) {
            // auction not finished
            revert();
            // return;
        }
        Bid storage bid = bids[msg.sender][hash];
        if (bid.value == records[hash].highestBid) {
            records[hash].owner = msg.sender;
            records[hash].value = records[hash].highestBid;
        } else {
            uint amount = bid.value;
            (bool success, ) = root.call{value: amount}("");
        }
    }

    function owner(string memory label) public view returns (address) {
        bytes32 hash = keccak256(abi.encode(label));
        return records[hash].owner;
    }

    // Function to deposit Ether into this contract.
    // Call this function along with some Ether.
    // The balance of this contract will be automatically updated.
    function deposit() public payable {}

    // Call this function along with some Ether.
    // The function will throw an error since this function is not payable.
    function notPayable() public {}

    // Function to withdraw all Ether from this contract.
    function withdraw() public {
        // get the amount of Ether stored in this contract
        uint amount = address(this).balance;

        // send all Ether to root
        // root can receive Ether since the address of root is payable
        (bool success, ) = root.call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    // Function to transfer Ether from this contract to address from input
    function transfer(address payable _to, uint _amount) public {
        // Note that "to" is declared as payable
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }
}
