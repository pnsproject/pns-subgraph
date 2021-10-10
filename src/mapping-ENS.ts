
import { NewSubnameOwner as NewSubnameOwnerEvent } from '../generated/Subdomain/ENS'
import { Subdomain } from '../generated/schema'

export function handleNewSubnameOwner(event: NewSubnameOwnerEvent): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let subdomain = Subdomain.load(id)
  if (subdomain == null) {
    subdomain = new Subdomain(id)
  }
  subdomain.node = event.params.node
  subdomain.label = event.params.label
  subdomain.owner = event.params.owner
  subdomain.save()
}
