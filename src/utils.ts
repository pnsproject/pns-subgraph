// Import types and APIs from graph-ts
import {
  BigInt,
  // ByteArray,
  Bytes,
  ethereum,
  // crypto,
  log,
} from "@graphprotocol/graph-ts";
import { Domain } from "./types/schema";

export function createEventID(event: ethereum.Event): string {
  return event.block.number
    .toString()
    .concat("-")
    .concat(event.logIndex.toString());
}

export const EMPTY_ADDRESS = Bytes.fromHexString(
  "0x0000000000000000000000000000000000000000"
);

export const ROOT_TOKEN_ID = Bytes.fromHexString(
  "0x3fce7d1364a893e213bc4212792b517ffc88f5b13b86c8ef9c8d390c3a1370ce"
);

export const BIG_INT_ZERO = BigInt.fromI32(0);

export function defaultDomain(node: Bytes, timestamp: BigInt): Domain {
  let domain = new Domain(node);
  domain.createdAt = timestamp;
  domain.subdomainCount = BIG_INT_ZERO.toI32();
  return domain;
}

export function initRootDomain(): Domain {
  let domain = new Domain(ROOT_TOKEN_ID);
  domain.owner = EMPTY_ADDRESS;
  domain.createdAt = BIG_INT_ZERO;
  domain.subdomainCount = BIG_INT_ZERO.toI32();
  domain.name = "dot";
  return domain;
}

export function fetchTokenId(token: BigInt): Bytes {
  let hex = token.toHex();
  let zeros = 66 - hex.length;
  if (zeros != 0) {
    return Bytes.fromHexString("0x" + "0".repeat(zeros) + hex.slice(2));
  }
  return Bytes.fromHexString(hex);
}

// function toBytes(value: BigInt): Bytes {
//   return (value as Uint8Array) as Bytes;
// }

// export function getNamehash(name: string): Bytes {
//   let node = ByteArray.fromHexString(
//     "0000000000000000000000000000000000000000000000000000000000000000"
//   );

//   if (name) {
//     let labels = name.split(".");

//     for (let i = labels.length - 1; i >= 0; i--) {
//       let labelSha = crypto.keccak256(ByteArray.fromUTF8(labels[i]));
//       node = crypto.keccak256(node.concat(labelSha));
//     }
//   }

//   return Bytes.fromByteArray(node);
// }
