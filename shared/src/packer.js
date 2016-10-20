function extend(io) {
  const newBuffer = new ArrayBuffer(io.view.byteLength * 2);
  new Uint8Array(newBuffer).set(new Uint8Array(io.view.buffer, 0, io.view.byteLength));
  io.view = new DataView(newBuffer);
}

export default {
  readValue(io, byteLength, methodName) {
    const value = io.view[methodName](io.offset, true);
    io.offset += byteLength;
    return value;
  },
  writeValue(io, value, byteLength, methodName) {
    while (io.offset + byteLength > io.view.byteLength) extend(io);
    io.view[methodName](io.offset, value, true);
    io.offset += byteLength;
  },

  readUint8(io) {
    return this.readValue(io, 1, "getUint8");
  },
  writeUint8(io, value) {
    this.writeValue(io, value, 1, "setUint8");
  },
  readUint8Array(io, arrayLength) {
    return new Uint8Array(_.range(arrayLength).map(() => this.readUint8(io)));
  },
  writeUint8Array(io, values) {
    values.forEach(value => {
      this.writeUint8(io, value);
    });
  },

  readInt8(io) {
    return this.readValue(io, 1, "getInt8");
  },
  writeInt8(io, value) {
    this.writeValue(io, value, 1, "setInt8");
  },
  readInt8Array(io, arrayLength) {
    return new Int8Array(_.range(arrayLength).map(() => this.readInt8(io)));
  },
  writeInt8Array(io, values) {
    values.forEach(value => {
      this.writeInt8(io, value);
    });
  },

  readUint16(io) {
    return this.readValue(io, 2, "getUint16");
  },
  writeUint16(io, value) {
    this.writeValue(io, value, 2, "setUint16");
  },
  readUint16Array(io, arrayLength) {
    return new Uint16Array(_.range(arrayLength).map(() => this.readUint16(io)));
  },
  writeUint16Array(io, values) {
    values.forEach(value => {
      this.writeUint16(io, value);
    });
  },

  readInt16(io) {
    return this.readValue(io, 2, "getInt16");
  },
  writeInt16(io, value) {
    this.writeValue(io, value, 2, "setInt16");
  },
  readInt16Array(io, arrayLength) {
    return new Int16Array(_.range(arrayLength).map(() => this.readInt16(io)));
  },
  writeInt16Array(io, values) {
    values.forEach(value => {
      this.writeInt16(io, value);
    });
  },

  readUint32(io) {
    return this.readValue(io, 4, "getUint32");
  },
  writeUint32(io, value) {
    this.writeValue(io, value, 4, "setUint32");
  },
  readUint32Array(io, arrayLength) {
    return new Uint32Array(_.range(arrayLength).map(() => this.readUint32(io)));
  },
  writeUint32Array(io, values) {
    values.forEach(value => {
      this.writeUint32(io, value);
    });
  },

  readInt32(io) {
    return this.readValue(io, 4, "getInt32");
  },
  writeInt32(io, value) {
    this.writeValue(io, value, 4, "setInt32");
  },
  readInt32Array(io, arrayLength) {
    return new Int32Array(_.range(arrayLength).map(() => this.readInt32(io)));
  },
  writeInt32Array(io, values) {
    values.forEach(value => {
      this.writeInt32(io, value);
    });
  },

  readFloat32(io) {
    return this.readValue(io, 4, "getFloat32");
  },
  writeFloat32(io, value) {
    this.writeValue(io, value, 4, "setFloat32");
  },
  readFloat32Array(io, arrayLength) {
    return new Float32Array(_.range(arrayLength).map(() => this.readFloat32(io)));
  },
  writeFloat32Array(io, values) {
    values.forEach(value => {
      this.writeFloat32(io, value);
    });
  },

  readString(io, byteLength, encoding) {
    return new TextDecoder(encoding).decode(this.readUint8Array(io, byteLength));
  },
  writeString(io, value, encoding) {
    this.writeUint8Array(io, new TextEncoder(encoding, {NONSTANDARD_allowLegacyEncoding: true}).encode(value));
  },

  readNullTerminatedString(io, byteLength, encoding) {
    return new TextDecoder(encoding).decode(_.takeWhile(this.readUint8Array(io, byteLength), x => x > 0));
  },
  writeNullTerminatedString(io, value, byteLength, encoding) {
    const previousOffset = io.offset;
    this.writeString(io, value, encoding);
    _.range(io.offset - previousOffset, byteLength).forEach(() => {
      this.writeUint8(io, 0);
    });
  }
}
