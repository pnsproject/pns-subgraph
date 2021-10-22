import { crypto, BigInt, ByteArray } from "@graphprotocol/graph-ts"

import { NewSubnameOwner as NewSubnameOwnerEvent } from '../generated/Subdomain/IPNS'
import { NameRegistered as NameRegisteredEvent } from '../generated/Domain/IController'
import { Domain , Subdomain } from '../generated/schema'


export function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new ByteArray(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  return out
}

//IPNS.sol: event NewSubnameOwner(uint256 tokenId, string name, address owner);
export function handleNewSubnameOwner(event: NewSubnameOwnerEvent): void {
  // let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let id = event.params.tokenId.toHex()
  let subdomain = Subdomain.load(id)
  if (subdomain == null) {
    subdomain = new Subdomain(id)
  }
  subdomain.tokenId = event.params.tokenId
  subdomain.name = event.params.name
  subdomain.owner = event.params.owner
  subdomain.save()
}

//IController.sol: event NameRegistered(string name, uint256 indexed node, address indexed owner, uint256 cost, uint256 expires);
export function handleNameRegistered(event: NameRegisteredEvent): void {
  let id = event.params.name
  let domain = Domain.load(id)
  if (domain == null) {
    domain = new Domain(id)
  }
  domain.name = event.params.name
  domain.node = event.params.node
  domain.owner = event.params.owner
  domain.cost = event.params.cost
  domain.expires = event.params.expires
  domain.save()
}
