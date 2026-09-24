// 离线结构校验：内置 ZIP 打包器产物按 ZIP 规范逐字段走查，全程无网络请求。
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildZipBlob, crc32 } from '../src/scripts/pt-batch-download/zip.js';

const text = string => new TextEncoder().encode(string);

function u16at(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32at(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function parseZip(bytes) {
  const eocdOffset = bytes.length - 22;
  assert.equal(u32at(bytes, eocdOffset), 0x06054b50, 'EOCD signature');
  const count = u16at(bytes, eocdOffset + 10);
  assert.equal(u16at(bytes, eocdOffset + 4), 0, 'disk number');
  assert.equal(u16at(bytes, eocdOffset + 6), 0, 'central directory disk');
  assert.equal(u16at(bytes, eocdOffset + 20), 0, 'comment length');
  const cdSize = u32at(bytes, eocdOffset + 12);
  const cdOffset = u32at(bytes, eocdOffset + 16);
  assert.equal(cdOffset + cdSize + 22, bytes.length, 'EOCD covers central directory exactly');
  const entries = [];
  let cursor = cdOffset;
  for (let index = 0; index < count; index++) {
    assert.equal(u32at(bytes, cursor), 0x02014b50, 'central header signature');
    const flags = u16at(bytes, cursor + 8);
    const method = u16at(bytes, cursor + 10);
    const crc = u32at(bytes, cursor + 16);
    const packedSize = u32at(bytes, cursor + 20);
    const size = u32at(bytes, cursor + 24);
    const nameLength = u16at(bytes, cursor + 28);
    const extraLength = u16at(bytes, cursor + 30);
    const commentLength = u16at(bytes, cursor + 32);
    const localOffset = u32at(bytes, cursor + 42);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    assert.equal(extraLength + commentLength, 0, 'no extra/comment fields');
    entries.push({ flags, method, crc, packedSize, size, localOffset, name });
    cursor += 46 + nameLength;
  }
  assert.equal(cursor, cdOffset + cdSize, 'central directory length');
  for (const entry of entries) {
    const at = entry.localOffset;
    assert.equal(u32at(bytes, at), 0x04034b50, 'local header signature');
    assert.equal(u16at(bytes, at + 6), entry.flags, 'local flags match central');
    assert.equal(u16at(bytes, at + 8), 0, 'local STORE method');
    assert.equal(u16at(bytes, at + 26), text(entry.name).length, 'local name length');
    const nameLength = u16at(bytes, at + 26);
    const payloadStart = at + 30 + nameLength + u16at(bytes, at + 28);
    entry.payload = bytes.subarray(payloadStart, payloadStart + entry.packedSize);
  }
  return entries;
}

test('crc32 matches published check vectors', () => {
  assert.equal(crc32(text('123456789')), 0xCBF43926);
  assert.equal(crc32(text('a')), 0xE8B7BE43);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('zip stores entries verbatim with UTF-8 names and valid CRCs', async () => {
  const payloadA = text('hello torrent');
  const payloadB = new Uint8Array(70000).map((_, index) => index & 255);
  const entries = [
    { name: 'a.bin', bytes: payloadA },
    { name: '音乐乌托邦_17108.torrent', bytes: payloadB }
  ];
  const blob = buildZipBlob(entries);
  assert.equal(blob.type, 'application/zip');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parsed = parseZip(bytes);
  assert.deepEqual(parsed.map(entry => entry.name), entries.map(entry => entry.name));
  for (const [index, entry] of parsed.entries()) {
    assert.equal(entry.method, 0, 'STORE method');
    assert.equal(entry.flags & 0x0800, 0x0800, 'UTF-8 name flag');
    assert.equal(entry.size, entries[index].bytes.length);
    assert.equal(entry.packedSize, entries[index].bytes.length);
    assert.equal(entry.crc, crc32(entries[index].bytes));
    assert.deepEqual([...entry.payload], [...entries[index].bytes]);
  }
});

test('empty payload and single-entry archives stay structurally valid', async () => {
  const bytes = new Uint8Array(await buildZipBlob([{ name: 'empty.torrent', bytes: new Uint8Array(0) }]).arrayBuffer());
  const parsed = parseZip(bytes);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].crc, 0);
  assert.equal(parsed[0].payload.length, 0);
});
