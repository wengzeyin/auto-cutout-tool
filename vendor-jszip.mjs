const textEncoder = new TextEncoder();
const crcTable = buildCrcTable();

export default class JSZip {
  constructor(prefix = "", root = null) {
    this.prefix = prefix;
    this.root = root || this;
    if (!root) this.entries = [];
  }

  folder(name) {
    const safeName = normalizePath(name).replace(/\/?$/, "/");
    return new JSZip(`${this.prefix}${safeName}`, this.root);
  }

  file(name, content) {
    const path = `${this.prefix}${normalizePath(name)}`;
    this.root.entries.push({ path, content });
    return this;
  }

  async generateAsync(options = {}) {
    const files = await Promise.all(this.entries.map(async (entry) => {
      const nameBytes = textEncoder.encode(entry.path);
      const data = await contentToBytes(entry.content);
      const crc = crc32(data);
      return { ...entry, nameBytes, data, crc };
    }));

    const chunks = [];
    const centralDirectory = [];
    let offset = 0;

    for (const file of files) {
      const localHeader = createLocalHeader(file);
      chunks.push(localHeader, file.nameBytes, file.data);
      centralDirectory.push({ file, offset });
      offset += localHeader.length + file.nameBytes.length + file.data.length;
    }

    const centralStart = offset;
    for (const record of centralDirectory) {
      const header = createCentralDirectoryHeader(record.file, record.offset);
      chunks.push(header, record.file.nameBytes);
      offset += header.length + record.file.nameBytes.length;
    }

    const centralSize = offset - centralStart;
    chunks.push(createEndRecord(files.length, centralSize, centralStart));
    const bytes = concatBytes(chunks);

    if (options.type === "uint8array") return bytes;
    if (options.type === "arraybuffer") return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new Blob([bytes], { type: "application/zip" });
  }
}

async function contentToBytes(content) {
  if (content == null) return new Uint8Array();
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (typeof Blob !== "undefined" && content instanceof Blob) return new Uint8Array(await content.arrayBuffer());
  if (typeof content === "string") return textEncoder.encode(content);
  return textEncoder.encode(String(content));
}

function normalizePath(path) {
  return String(path || "file").replace(/\\/g, "/").replace(/^\/+/, "");
}

function createLocalHeader(file) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, file.crc, true);
  view.setUint32(18, file.data.length, true);
  view.setUint32(22, file.data.length, true);
  view.setUint16(26, file.nameBytes.length, true);
  view.setUint16(28, 0, true);
  return header;
}

function createCentralDirectoryHeader(file, localOffset) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, file.crc, true);
  view.setUint32(20, file.data.length, true);
  view.setUint32(24, file.data.length, true);
  view.setUint16(28, file.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localOffset, true);
  return header;
}

function createEndRecord(fileCount, centralSize, centralOffset) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return header;
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}
