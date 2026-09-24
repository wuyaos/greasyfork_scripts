// 自包含 ZIP（STORE）打包器：纯同步计算，不依赖 JSZip 与沙箱异步调度。
// JSZip 的 setImmediate 垫片在部分油猴沙箱里静默失效，会让流管线卡死；
// 种子文件体积小，STORE 不压缩即可，任何解压工具都支持。
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function dosDateTime(d = new Date()) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  }
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

const u16 = v => new Uint8Array([v & 255, (v >>> 8) & 255])
const u32 = v => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255])

// entries: [{ name: string, bytes: Uint8Array }]，同名去重由调用方负责。
function buildZipBlob(entries) {
  const encoder = new TextEncoder()
  const { time, date } = dosDateTime()
  const body = []
  const central = []
  let offset = 0
  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const data = entry.bytes
    const crc = crc32(data)
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name
    ])
    body.push(local, data)
    central.push(concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name
    ]))
    offset += local.length + data.length
  }
  const centralBytes = concatBytes(central)
  const eocd = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBytes.length), u32(offset), u16(0)
  ])
  return new Blob([...body, centralBytes, eocd], { type: 'application/zip' })
}

export { buildZipBlob, crc32 }
