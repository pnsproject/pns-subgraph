import {
  CapacityUpdated as CapacityUpdatedEvent,
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
  PriceChanged as PriceChangedEvent,
} from "./types/Controller6-20/Controller";
import {
  createEventID,
  defaultDomain,
  initRootDomain,
  ROOT_TOKEN_ID,
} from "./utils";
import {
  Account,
  CapacityUpdated,
  Domain,
  NameRegistered,
  NameRenewed,
  PriceChanged,
  Registration,
} from "./types/schema";

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
