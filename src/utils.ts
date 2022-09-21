// Import types and APIs from graph-ts
import { BigInt, ByteArray, ethereum } from "@graphprotocol/graph-ts";
import { Domain } from "./types/schema";

export function createEventID(event: ethereum.Event): string {
  return event.block.number
    .toString()
    .concat("-")
    .concat(event.logIndex.toString());
}

export function createCallID(call: ethereum.Call): string {
  return call.block.number
    .toString()
    .concat("-")
    .concat(call.transaction.index.toString());
}

export const ROOT_NODE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

export const BIG_INT_ZERO = BigInt.fromI32(0);

function createDomain(
  node: string,
  timestamp: BigInt,
  owner: string,
  subdomainCount: BigInt
): Domain {
  let domain = new Domain(node);
  domain.owner = owner;
  domain.createdAt = timestamp;
  domain.subdomainCount = subdomainCount.toI32();
  return domain;
}

export function getDomain(
  node: string,
  timestamp: BigInt = BIG_INT_ZERO,
  owner: string = EMPTY_ADDRESS,
  subdomainCount: BigInt = BigInt.zero()
): Domain {
  let domain = Domain.load(node);
  if (domain === null) {
    return createDomain(node, timestamp, owner, subdomainCount);
  } else {
    return domain;
  }
}

function recurseDomainDelete(domain: Domain): string | null {
  if (
    (domain.resolver == null ||
      domain.resolver!.split("-")[0] == EMPTY_ADDRESS) &&
    domain.owner == EMPTY_ADDRESS &&
    domain.subdomainCount == 0
  ) {
    let parentId = domain.parent;
    if (parentId == null) {
      parentId = "";
    }
    const parentDomain = Domain.load(parentId!);
    if (parentDomain != null) {
      parentDomain.subdomainCount = parentDomain.subdomainCount - 1;
      parentDomain.save();
      return recurseDomainDelete(parentDomain);
    }

    return null;
  }

  return domain.id;
}

export function saveDomain(domain: Domain): void {
  recurseDomainDelete(domain);
  domain.save();
}
