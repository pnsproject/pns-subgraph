import { crypto, Bytes, ByteArray } from "@graphprotocol/graph-ts";

import {
  Approval as ApprovalEvent,
  Transfer as TransferEvent,
  ApprovalForAll as ApprovalForAllEvent,
  NewResolver as NewResolverEvent,
  Set as SetEvent,
  SetName as SetNameEvent,
  SetNftName as SetNftNameEvent,
  NewSubdomain as NewSubdomainEvent,
  SetLink as SetLinkEvent,
} from "./types/PNS10-16/PNS";

import {
  Account,
  Transfer,
  NewSubdomain,
  Approval,
  AuthorisationChanged,
  Resolver,
  NewResolver,
  Domain,
  Set,
  SetName,
  SetNftName,
  SetLink,
} from "./types/schema";
import {
  createEventID,
  defaultDomain,
  EMPTY_ADDRESS,
  fetchTokenId,
  initRootDomain,
  ROOT_TOKEN_ID,
} from "./utils";

export function handleTransfer(event: TransferEvent): void {
  let node = event.params.tokenId;

  let fromAccount = new Account(event.params.to);
  fromAccount.save();

  let toAccount = new Account(event.params.to);
  toAccount.save();

  // Update the domain owner
  let domain = Domain.load(fetchTokenId(node));

  if (domain === null) {
    domain = defaultDomain(fetchTokenId(node), event.block.timestamp);
  }

  domain.owner = toAccount.id;

  domain.save();

  let domainEvent = new Transfer(createEventID(event));
  domainEvent.blockNumber = event.block.number.toI32();
  domainEvent.transactionID = event.transaction.hash;
  domainEvent.triggeredDate = event.block.timestamp;
  domainEvent.domain = fetchTokenId(node);
  domainEvent.from = event.params.from;
  domainEvent.to = event.params.to;
  domainEvent.save();
}

export function handleNewSubdomain(event: NewSubdomainEvent): void {
  let subnode = fetchTokenId(event.params.subtokenId);
  let parentNode = fetchTokenId(event.params.tokenId);

  let account = new Account(event.params.to);
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

  if (parentNode == ROOT_TOKEN_ID && parent != null) {
    if (parent.name === null) {
      parent.name = "dot";
      parent.save();
    }
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

  domain.owner = event.params.to;
  domain.parent = fetchTokenId(event.params.tokenId);
  domain.labelName = event.params.name;
  domain.labelhash = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8(event.params.name))
  );
  domain.save();

  let domainEvent = new NewSubdomain(createEventID(event));
  domainEvent.blockNumber = event.block.number.toI32();
  domainEvent.transactionID = event.transaction.hash;
  domainEvent.triggeredDate = event.block.timestamp;
  domainEvent.domain = subnode;
  domainEvent.parentId = parentNode;
  domainEvent.to = event.params.to;
  domainEvent.name = event.params.name;
  domainEvent.save();
}

// Handler for NewResolver events
export function handleNewResolver(event: NewResolverEvent): void {
  let id = event.params.resolver
    .toHexString()
    .concat("-")
    .concat(fetchTokenId(event.params.tokenId).toHex());

  let node = fetchTokenId(event.params.tokenId);
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
    resolver.domain = fetchTokenId(event.params.tokenId);
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
  let node = fetchTokenId(event.params.tokenId);

  let owner = new Account(event.params.owner);
  owner.save();

  let approved = new Account(event.params.approved);
  approved.save();

  let approval = new Approval(createEventID(event));
  approval.blockNumber = event.block.number.toI32();
  approval.transactionID = event.transaction.hash;
  approval.triggeredDate = event.block.timestamp;
  approval.account = event.params.owner;
  approval.operator = event.params.approved;
  approval.tokens = fetchTokenId(event.params.tokenId);
  approval.save();
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let owner = new Account(event.params.owner);
  owner.save();

  let operator = new Account(event.params.operator);
  operator.save();

  let approvalForAll = new AuthorisationChanged(createEventID(event));
  approvalForAll.blockNumber = event.block.number.toI32();
  approvalForAll.transactionID = event.transaction.hash;
  approvalForAll.triggeredDate = event.block.timestamp;
  approvalForAll.owner = event.params.owner;
  approvalForAll.target = event.params.operator;
  approvalForAll.isAuthorized = event.params.approved;

  approvalForAll.save();
}

export function handleSet(event: SetEvent): void {
  let node = fetchTokenId(event.params.tokenId);

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
  let account = new Account(event.params.addr);
  account.save();

  let setNameEvent = new SetName(createEventID(event));
  setNameEvent.blockNumber = event.block.number.toI32();
  setNameEvent.transactionID = event.transaction.hash;
  setNameEvent.triggeredDate = event.block.timestamp;
  setNameEvent.tokenId = fetchTokenId(event.params.tokenId);
  setNameEvent.account = event.params.addr;

  setNameEvent.save();
}

export function handleSetNftName(event: SetNftNameEvent): void {
  let node = fetchTokenId(event.params.tokenId);

  let setEvent = new SetNftName(createEventID(event));
  setEvent.blockNumber = event.block.number.toI32();
  setEvent.transactionID = event.transaction.hash;
  setEvent.triggeredDate = event.block.timestamp;
  setEvent.domain = node;
  setEvent.nftAddr = event.params.nftAddr;
  setEvent.nftTokenId = event.params.nftTokenId;
  setEvent.save();
}

export function handleSetLink(event: SetLinkEvent): void {
  let node = fetchTokenId(event.params.tokenId);

  let setEvent = new SetLink(createEventID(event));
  setEvent.blockNumber = event.block.number.toI32();
  setEvent.transactionID = event.transaction.hash;
  setEvent.triggeredDate = event.block.timestamp;
  setEvent.domain = node;
  setEvent.keyHash = event.params.keyHash;
  setEvent.value = event.params.value;
  setEvent.save();
}
