import { randomBytes } from "node:crypto";

const maxRandom = 1n << 74n;
let lastTimestampMs = 0n;
let lastRandom = 0n;

function random74Bits() {
  const bytes = randomBytes(10);
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value & (maxRandom - 1n);
}

function formatUuid(bytes: Uint8Array) {
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export function newId() {
  const now = BigInt(Date.now());
  const timestamp = now > lastTimestampMs ? now : lastTimestampMs;

  if (timestamp === lastTimestampMs) {
    lastRandom = (lastRandom + 1n) % maxRandom;
  } else {
    lastTimestampMs = timestamp;
    lastRandom = random74Bits();
  }

  const random = lastRandom;
  const randomA = (random >> 62n) & 0xfffn;
  const randomB = random & ((1n << 62n) - 1n);
  const bytes = new Uint8Array(16);

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
  }

  bytes[6] = 0x70 | Number((randomA >> 8n) & 0x0fn);
  bytes[7] = Number(randomA & 0xffn);
  bytes[8] = 0x80 | Number((randomB >> 56n) & 0x3fn);

  for (let index = 9; index < 16; index += 1) {
    bytes[index] = Number((randomB >> BigInt((15 - index) * 8)) & 0xffn);
  }

  return formatUuid(bytes);
}
