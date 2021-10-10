
import { NameRegistered as NameRegisteredEvent } from '../generated/Domain/Registrar'
import { Domain } from '../generated/schema'


export function handleNameRegistered(event: NameRegisteredEvent): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let domain = Domain.load(id)
  if (domain == null) {
    domain = new Domain(id)
  }
  domain.name = event.params.name
  domain.labelHash = event.params.label
  domain.owner = event.params.owner
  domain.expires = event.params.expires
  domain.save()
}
