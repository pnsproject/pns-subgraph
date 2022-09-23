import {
  SetMetadataBatchCall,
  CapacityUpdated as CapacityUpdatedEvent,
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
  PriceChanged as PriceChangedEvent,
} from "./types/Controller/Controller";
import {
  createCallID,
  createEventID,
  defaultDomain,
  initRootDomain,
  ROOT_TOKEN_ID,
} from "./utils";
import {
  Account,
  CapacityUpdated,
  Domain,
  InitMetadataRecord,
  NameRegistered,
  NameRenewed,
  PriceChanged,
  Registration,
} from "./types/schema";
import { log } from "@graphprotocol/graph-ts";

export function setMetadataBatchHandle(call: SetMetadataBatchCall): void {
  let tokenIds = call.inputs.tokenIds;
  let data = call.inputs.data;
  if (tokenIds.length == data.length) {
    for (let i = 0; i < tokenIds.length; i++) {
      let tokenId = tokenIds[i];
      let d = data[i];
      let domain = Domain.load(tokenId.toHexString());
      if (domain === null && tokenId.toHexString() === ROOT_TOKEN_ID) {
        domain = initRootDomain();
      }
      if (domain === null) {
        domain = defaultDomain(tokenId.toHexString(), call.block.timestamp);
      }
      domain.subdomainCount = d.children.toI32();
      domain.save();
      let origin = Domain.load(d.origin.toHexString());
      if (origin === null && d.origin.toHexString() === ROOT_TOKEN_ID) {
        origin = initRootDomain();
      }
      if (origin === null) {
        origin = defaultDomain(d.origin.toHexString(), call.block.timestamp);
      }
      origin.save();
      let registration = new Registration(tokenId.toHexString());
      registration.domain = tokenId.toHexString();
      registration.expiryDate = d.expire;
      registration.capacity = d.capacity;
      registration.origin = d.origin.toHexString();
      registration.labelName = domain.labelName;
      registration.save();

      let registrationEvent = new InitMetadataRecord(
        createCallID(call) + "-" + i.toString()
      );
      registrationEvent.registration = registration.id;
      registrationEvent.blockNumber = call.block.number.toI32();
      registrationEvent.transactionID = call.transaction.hash;
      registrationEvent.triggeredDate = call.block.timestamp;
      registrationEvent.registrant = call.from.toHexString();
      registrationEvent.expiryDate = d.expire;
      registrationEvent.capacity = d.capacity;
      registrationEvent.origin = d.origin.toHexString();
      registrationEvent.subdomainCount = d.children.toI32();
      registrationEvent.save();
    }
  } else {
    log.warning("set matadata failed: {} {} data len: {} tokenIds len: {}", [
      data.toString(),
      tokenIds.toString(),
      data.length.toString(),
      tokenIds.length.toString(),
    ]);
  }
}

export function handleCapacityUpdated(event: CapacityUpdatedEvent): void {
  let tokenId = event.params.tokenId.toHexString();
  let domain = Domain.load(tokenId);
  if (domain === null && tokenId === ROOT_TOKEN_ID) {
    domain = initRootDomain();
  }
  if (domain === null) {
    domain = defaultDomain(tokenId, event.block.timestamp);
  }
  domain.save();

  let registration = Registration.load(tokenId)!;

  registration.capacity = event.params.capacity;
  registration.save();

  let registrationEvent = new CapacityUpdated(createEventID(event));
  registrationEvent.registration = registration.id;
  registrationEvent.blockNumber = event.block.number.toI32();
  registrationEvent.transactionID = event.transaction.hash;
  registrationEvent.triggeredDate = event.block.timestamp;
  registrationEvent.registrant = event.transaction.from.toHexString();
  registrationEvent.capacity = event.params.capacity;
  registrationEvent.domain = domain.id;
  registrationEvent.save();
}

export function handleNameRegistered(event: NameRegisteredEvent): void {
  let account = new Account(event.params.to.toHex());
  account.save();

  let registration = new Registration(event.params.node.toHexString());
  registration.domain = event.params.node.toHexString();
  registration.expiryDate = event.params.expires;

  let labelName = event.params.name;
  if (labelName != null) {
    registration.labelName = labelName;
  }
  registration.save();

  let registrationEvent = new NameRegistered(createEventID(event));
  registrationEvent.registration = registration.id;
  registrationEvent.blockNumber = event.block.number.toI32();
  registrationEvent.transactionID = event.transaction.hash;
  registrationEvent.triggeredDate = event.block.timestamp;
  let registrant = new Account(event.transaction.from.toHex());
  registrant.save();
  registrationEvent.registrant = registrant.id;
  registrationEvent.expiryDate = event.params.expires;
  registrationEvent.cost = event.params.cost;
  registrationEvent.save();
}

export function handleNameRenewed(event: NameRenewedEvent): void {
  let registration = Registration.load(event.params.node.toHexString())!;
  registration.expiryDate = event.params.expires;
  registration.save();

  let registrationEvent = new NameRenewed(createEventID(event));
  registrationEvent.registration = registration.id;
  registrationEvent.blockNumber = event.block.number.toI32();
  registrationEvent.transactionID = event.transaction.hash;
  registrationEvent.triggeredDate = event.block.timestamp;
  let registrant = new Account(event.transaction.from.toHex());
  registrant.save();
  registrationEvent.registrant = registrant.id;
  registrationEvent.expiryDate = event.params.expires;
  registrationEvent.cost = event.params.cost;
  registrationEvent.save();
}

export function handlePriceChanged(event: PriceChangedEvent): void {
  let priceChangedEvent = new PriceChanged(createEventID(event));
  priceChangedEvent.blockNumber = event.block.number.toI32();
  priceChangedEvent.transactionID = event.transaction.hash;
  priceChangedEvent.triggeredDate = event.block.timestamp;
  priceChangedEvent.basePrices = event.params.basePrices;
  priceChangedEvent.rentPrices = event.params.rentPrices;
  priceChangedEvent.save();
}
