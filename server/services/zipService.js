const zlib = require("zlib");

/**
 * High-performance, RFC 1951/PKZIP compliant zero-dependency ZIP archive generator.
 * Uses native Node.js zlib for DEFLATE compression and CRC-32 calculation.
 *
 * @param {Array<{ name: string, content: Buffer | string, date?: Date }>} files
 * @returns {Buffer} The complete ZIP file buffer
 */
function createZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  const defaultDate = new Date();

  for (const file of files) {
    const filenameBuffer = Buffer.from(file.name.replace(/\\/g, "/"), "utf8");
    const dataBuffer = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(typeof file.content === "string" ? file.content : String(file.content), "utf8");

    const crc = zlib.crc32(dataBuffer);
    const compressed = zlib.deflateRawSync(dataBuffer);

    // Compute MS-DOS time and date
    const d = file.date || defaultDate;
    const dosTime =
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const dosDate =
      (((d.getFullYear() - 1980) & 0x7f) << 9) |
      (((d.getMonth() + 1) & 0x0f) << 5) |
      (d.getDate() & 0x1f);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // general purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(8, 8); // compression method (DEFLATE = 8)
    localHeader.writeUInt16LE(dosTime, 10); // last mod file time
    localHeader.writeUInt16LE(dosDate, 12); // last mod file date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(compressed.length, 18); // compressed size
    localHeader.writeUInt32LE(dataBuffer.length, 22); // uncompressed size
    localHeader.writeUInt16LE(filenameBuffer.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length
    filenameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    // Central directory file header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central file header signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed to extract
    centralHeader.writeUInt16LE(0x0800, 8); // general purpose bit flag (UTF-8)
    centralHeader.writeUInt16LE(8, 10); // compression method
    centralHeader.writeUInt16LE(dosTime, 12); // last mod file time
    centralHeader.writeUInt16LE(dosDate, 14); // last mod file date
    centralHeader.writeUInt32LE(crc, 16); // crc-32
    centralHeader.writeUInt32LE(compressed.length, 20); // compressed size
    centralHeader.writeUInt32LE(dataBuffer.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(filenameBuffer.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0x81a40000, 38); // external file attributes (regular file 0644)
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    filenameBuffer.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuffer.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  eocd.writeUInt16LE(0, 4); // number of this disk
  eocd.writeUInt16LE(0, 6); // number of the disk with the start of central dir
  eocd.writeUInt16LE(files.length, 8); // total number of entries in central dir on this disk
  eocd.writeUInt16LE(files.length, 10); // total number of entries in central dir
  eocd.writeUInt32LE(centralDirSize, 12); // size of the central dir
  eocd.writeUInt32LE(centralDirOffset, 16); // offset of start of central dir with respect to starting disk number
  eocd.writeUInt16LE(0, 20); // .ZIP file comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}

module.exports = {
  createZip
};
