import { ByteArray, crypto, Bytes } from "@graphprotocol/graph-ts";

import {
  Approval as ApprovalEvent,
  Transfer as TransferEvent,
  ApprovalForAll as ApprovalForAllEvent,
  NewResolver as NewResolverEvent,
  Set as SetEvent,
  SetName as SetNameEvent,
  SetNftName as SetNftNameEvent,
  NewSubdomain,
} from "./types/PNS/PNS";
import {
  Account,
  Transfer,
  Approval,
  AuthorisationChanged,
  Resolver,
  NewResolver,
  Domain,
  Set,
  SetName,
  SetNftName,
} from "./types/schema";
import {
  createEventID,
  defaultDomain,
  EMPTY_ADDRESS,
  initRootDomain,
  ROOT_TOKEN_ID,
} from "./utils";

export function handleTransfer(event: TransferEvent): void {
  let node = event.params.tokenId.toHexString();

  let fromAccount = new Account(event.params.to.toHexString());
  fromAccount.save();

  let toAccount = new Account(event.params.to.toHexString());
  toAccount.save();

  // Update the domain owner
  let domain = Domain.load(node);

  if (domain === null) {
    domain = defaultDomain(node, event.block.timestamp);
  }

  domain.owner = event.params.from.toHexString();

  domain.save();

  let domainEvent = new Transfer(createEventID(event));
  domainEvent.blockNumber = event.block.number.toI32();
  domainEvent.transactionID = event.transaction.hash;
  domainEvent.triggeredDate = event.block.timestamp;
  domainEvent.domain = node;
  domainEvent.from = event.params.from.toHexString();
  domainEvent.to = event.params.to.toHexString();
  domainEvent.save();
}

export function handleNewSubdomain(event: NewSubdomain): void {
  let subnode = event.params.subtokenId.toHexString();
  let parentNode = event.params.tokenId.toHexString();

  let account = new Account(event.params.to.toHexString());
  account.save();

  let domain = Domain.load(subnode);

  if (domain === null) {
    if (account.id == EMPTY_ADDRESS && subnode == ROOT_TOKEN_ID) {
      domain = initRootDomain();
    } else {
      domain = defaultDomain(subnode, event.block.timestamp);
    }
  }

  let parent = Domain.load(parentNode);

  if (parentNode === ROOT_TOKEN_ID && parent === null) {
    parent = initRootDomain();
    parent.save();
  }

  if (domain.parent === null && parent !== null) {
    parent.subdomainCount = parent.subdomainCount + 1;
    parent.save();
  }

  if (domain.name == null) {
    // Get label and node names
    if (domain.labelName == null) {
      domain.labelName = event.params.name;
    }

    if (parent != null && parent.name != null) {
      domain.name = domain.labelName + "." + parent.name!;
    } else {
      domain.name = domain.labelName + ".dot";
    }
  }

  domain.owner = event.params.to.toHexString();
  domain.parent = event.params.tokenId.toHexString();
  domain.labelName = event.params.name;
  domain.labelhash = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8(event.params.name))
  );
  domain.save();
}

// Handler for NewResolver events
export function handleNewResolver(event: NewResolverEvent): void {
  let id = event.params.resolver
    .toHexString()
    .concat("-")
    .concat(event.params.tokenId.toHexString());

  let node = event.params.tokenId.toHexString();
  let domain = Domain.load(node);
  if (domain === null) {
    if (node == ROOT_TOKEN_ID) {
      domain = initRootDomain();
    } else {
      domain = defaultDomain(node, event.block.timestamp);
    }
  }

  domain.resolver = id;

  let resolver = Resolver.load(id);
  if (resolver == null) {
    resolver = new Resolver(id);
    resolver.domain = event.params.tokenId.toHexString();
    resolver.address = event.params.resolver;
    resolver.save();
  } else {
    domain.resolvedAddress = resolver.addr;
  }
  domain.save();

  let domainEvent = new NewResolver(createEventID(event));
  domainEvent.blockNumber = event.block.number.toI32();
  domainEvent.transactionID = event.transaction.hash;
  domainEvent.triggeredDate = event.block.timestamp;
  domainEvent.domain = node;
  domainEvent.resolver = id;
  domainEvent.save();
}

export function handleApproval(event: ApprovalEvent): void {
  let node = event.params.tokenId.toHexString();

  let owner = new Account(event.params.owner.toHexString());
  owner.save();

  let approved = new Account(event.params.approved.toHexString());
  approved.save();

  let approval = new Approval(createEventID(event));
  approval.blockNumber = event.block.number.toI32();
  approval.transactionID = event.transaction.hash;
  approval.triggeredDate = event.block.timestamp;
  approval.account = event.params.owner.toHexString();
  approval.operator = event.params.approved.toHexString();
  approval.tokens = event.params.tokenId.toHexString();
  approval.save();
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let owner = new Account(event.params.owner.toHexString());
  owner.save();

  let operator = new Account(event.params.operator.toHexString());
  operator.save();

  let approvalForAll = new AuthorisationChanged(createEventID(event));
  approvalForAll.blockNumber = event.block.number.toI32();
  approvalForAll.transactionID = event.transaction.hash;
  approvalForAll.triggeredDate = event.block.timestamp;
  approvalForAll.owner = event.params.owner.toHexString();
  approvalForAll.target = event.params.operator.toHexString();
  approvalForAll.isAuthorized = event.params.approved;
  approvalForAll.save();
}

export function handleSet(event: SetEvent): void {
  let node = event.params.tokenId.toHexString();

  let setEvent = new Set(createEventID(event));
  setEvent.blockNumber = event.block.number.toI32();
  setEvent.transactionID = event.transaction.hash;
  setEvent.triggeredDate = event.block.timestamp;
  setEvent.domain = node;
  setEvent.keyHash = event.params.keyHash;
  setEvent.value = event.params.value;
  setEvent.save();
}

export function handleSetName(event: SetNameEvent): void {
  let account = new Account(event.params.addr.toHexString());
  account.save();

  let setNameEvent = new SetName(createEventID(event));
  setNameEvent.blockNumber = event.block.number.toI32();
  setNameEvent.transactionID = event.transaction.hash;
  setNameEvent.triggeredDate = event.block.timestamp;
  setNameEvent.tokenId = event.params.tokenId.toHexString();
  setNameEvent.account = event.params.addr.toHexString();

  setNameEvent.save();
}

export function handleSetNftName(event: SetNftNameEvent): void {
  let node = event.params.tokenId.toHexString();

  let setEvent = new SetNftName(createEventID(event));
  setEvent.blockNumber = event.block.number.toI32();
  setEvent.transactionID = event.transaction.hash;
  setEvent.triggeredDate = event.block.timestamp;
  setEvent.domain = node;
  setEvent.nftAddr = event.params.nftAddr.toHexString();
  setEvent.nftTokenId = event.params.nftTokenId;
  setEvent.save();
}
