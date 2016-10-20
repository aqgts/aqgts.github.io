import "babel-polyfill";
import "./lodash-extension";
import Vector2 from "./vector2";
import Vector3 from "./vector3";
import Vector4 from "./vector4";
import Packer from "./packer";

export default class PMX {
  constructor(header, model, vertices, faces, textures, materials, unknown) {
    this.header = header;
    this.model = model;
    this.vertices = vertices;
    this.faces = faces;
    this.textures = textures;
    this.materials = materials;
    this.unknown = unknown;
  }
  establishConsistency() {
    // 重いのでスキップ
    /*
    const extraUVCount = this.vertices.map(vertex => vertex.extraUVs.length).reduce(Math.max, 0)
    this.vertices.forEach(vertex => {
      _.range(vertex.extraUVs.length, extraUVCount).forEach(() => {
        vertex.extraUVs.push(new Vector4(0, 0, 0, 0));
      });
    });
    */
    this.header = new PMX.Header(
      this.header.encoding,
//      extraUVCount,
      this.header.extraUVCount,
      this.vertices.length <= 255 ? 1 : this.vertices.length <= 65535 ? 2 : 4,
      this.textures.length <= 127 ? 1 : this.textures.length <= 32767 ? 2 : 4,
      this.materials.length <= 127 ? 1 : this.materials.length <= 32767 ? 2 : 4,
      this.header.boneIndexSize,
      this.header.morphIndexSize,
      this.header.rigidBodyIndexSize
    );
  }
  write(io) {
    this.establishConsistency();
    const utils = new PMX.Utils(this.header);
    utils.writeString(io, "PMX ", "utf-8");
    utils.writeFloat32(io, 2.0);
    this.header.write(io);
    this.model.write(io, utils);
    utils.writeInt32(io, this.vertices.length);
    this.vertices.forEach(vertex => {
      vertex.write(io, utils);
    });
    utils.writeInt32(io, this.faces.length * 3);
    this.faces.forEach(face => {
      face.write(io, utils);
    });
    utils.writeInt32(io, this.textures.length);
    this.textures.forEach(texture => {
      texture.write(io, utils);
    });
    utils.writeInt32(io, this.materials.length);
    this.materials.forEach(material => {
      material.write(io, utils);
    });
    utils.writeUint8Array(io, this.unknown);
  }
  static read(io) {
    if (Packer.readString(io, 4, "utf-8") != "PMX ") throw new Error("Not PMX.");
    if (Packer.readFloat32(io) != 2.0) throw new Error("Incompatible version.");
    const header = this.Header.read(io);
    const utils = new this.Utils(header);
    const model = this.Model.read(io, utils);
    const vertices = new Array(utils.readInt32(io)).fill().map(() => this.Vertex.read(io, utils));
    const faces = new Array(utils.readInt32(io) / 3).fill().map(() => this.Face.read(io, utils));
    const textures = new Array(utils.readInt32(io)).fill().map(() => this.Texture.read(io, utils));
    const materials = new Array(utils.readInt32(io)).fill().map(() => this.Material.read(io, utils));
    const unknown = utils.readUint8Array(io, io.view.byteLength - io.offset);
    return new this(header, model, vertices, faces, textures, materials, unknown)
  }
}
PMX.Header = class Header {
  constructor(encoding, extraUVCount, vertexIndexSize, textureIndexSize, materialIndexSize, boneIndexSize, morphIndexSize, rigidBodyIndexSize) {
    this.encoding = encoding;
    this.extraUVCount = extraUVCount;
    this.vertexIndexSize = vertexIndexSize;
    this.textureIndexSize = textureIndexSize;
    this.materialIndexSize = materialIndexSize;
    this.boneIndexSize = boneIndexSize;
    this.morphIndexSize = morphIndexSize;
    this.rigidBodyIndexSize = rigidBodyIndexSize;
  }
  write(io) {
    Packer.writeUint8(io, 8);
    Packer.writeUint8(io, {"utf-16le": 0, "utf-8": 1}[this.encoding]);
    Packer.writeUint8(io, this.extraUVCount);
    Packer.writeUint8(io, this.vertexIndexSize);
    Packer.writeUint8(io, this.textureIndexSize);
    Packer.writeUint8(io, this.materialIndexSize);
    Packer.writeUint8(io, this.boneIndexSize);
    Packer.writeUint8(io, this.morphIndexSize);
    Packer.writeUint8(io, this.rigidBodyIndexSize);
  }
  static read(io) {
    if (Packer.readUint8(io) != 8) throw new Error("Invalid header size.");
    const encoding = ["utf-16le", "utf-8"][Packer.readUint8(io)];
    const extraUVCount = Packer.readUint8(io);
    const vertexIndexSize = Packer.readUint8(io);
    const textureIndexSize = Packer.readUint8(io);
    const materialIndexSize = Packer.readUint8(io);
    const boneIndexSize = Packer.readUint8(io);
    const morphIndexSize = Packer.readUint8(io);
    const rigidBodyIndexSize = Packer.readUint8(io);
    return new this(encoding, extraUVCount, vertexIndexSize, textureIndexSize, materialIndexSize, boneIndexSize, morphIndexSize, rigidBodyIndexSize);
  }
};
PMX.Utils = class Utils {
  constructor(header) {
    this.header = header;
  }
  readTextBuffer(io) {
    const byteLength = this.readInt32(io);
    return this.readString(io, byteLength, this.header.encoding);
  }
  writeTextBuffer(io, value) {
    const byteLength = new TextEncoder(this.header.encoding, {NONSTANDARD_allowLegacyEncoding: true}).encode(value).length;
    this.writeInt32(io, byteLength);
    this.writeString(io, value, this.header.encoding);
  }
  readExtraUVs(io) {
    return new Array(this.header.extraUVCount).fill().map(() => new Vector4(...this.readFloat32Array(io, 4)));
  }
  writeExtraUVs(io, values) {
    values.forEach(value => {
      this.writeFloat32Array(io, Array.from(value));
    });
  }
  readVertexIndex(io) {
    return this[{1: "readUint8", 2: "readUint16", 4: "readInt32"}[this.header.vertexIndexSize]](io);
  }
  writeVertexIndex(io, value) {
    this[{1: "writeUint8", 2: "writeUint16", 4: "writeInt32"}[this.header.vertexIndexSize]](io, value);
  }
  readTextureIndex(io) {
    return this["readInt" + (8 * this.header.textureIndexSize)](io);
  }
  writeTextureIndex(io, value) {
    return this["writeInt" + (8 * this.header.textureIndexSize)](io, value);
  }
  readMaterialIndex(io) {
    return this["readInt" + (8 * this.header.materialIndexSize)](io);
  }
  writeMaterialIndex(io, value) {
    return this["writeInt" + (8 * this.header.materialIndexSize)](io, value);
  }
  readBoneIndex(io) {
    return this["readInt" + (8 * this.header.boneIndexSize)](io);
  }
  writeBoneIndex(io, value) {
    return this["writeInt" + (8 * this.header.boneIndexSize)](io, value);
  }
  readMorphIndex(io) {
    return this["readInt" + (8 * this.header.morphIndexSize)](io);
  }
  writeMorphIndex(io, value) {
    return this["writeInt" + (8 * this.header.morphIndexSize)](io, value);
  }
  readRigidBodyIndex(io) {
    return this["readInt" + (8 * this.header.rigidBodyIndexSize)](io);
  }
  writeRigidBodyIndex(io, value) {
    return this["writeInt" + (8 * this.header.rigidBodyIndexSize)](io, value);
  }
};
_.extend(PMX.Utils.prototype, Packer);
PMX.Model = class Model {
  constructor(japaneseName, englishName, japaneseComment, englishComment) {
    this.japaneseName = japaneseName;
    this.englishName = englishName;
    this.japaneseComment = japaneseComment;
    this.englishComment= englishComment;
  }
  write(io, utils) {
    utils.writeTextBuffer(io, this.japaneseName);
    utils.writeTextBuffer(io, this.englishName);
    utils.writeTextBuffer(io, this.japaneseComment);
    utils.writeTextBuffer(io, this.englishComment);
  }
  static read(io, utils) {
    const japaneseName = utils.readTextBuffer(io);
    const englishName = utils.readTextBuffer(io);
    const japaneseComment = utils.readTextBuffer(io);
    const englishComment = utils.readTextBuffer(io);
    return new this(japaneseName, englishName, japaneseComment, englishComment);
  }
};
PMX.Vertex = class Vertex {
  constructor(position, normal, uv, extraUVs, weight, edgeSizeRate) {
    this.position = position;
    this.normal = normal;
    this.uv = uv;
    this.extraUVs = extraUVs;
    this.weight = weight;
    this.edgeSizeRate = edgeSizeRate;
  }
  write(io, utils) {
    utils.writeFloat32Array(io, Array.from(this.position));
    utils.writeFloat32Array(io, Array.from(this.normal));
    utils.writeFloat32Array(io, Array.from(this.uv));
    utils.writeExtraUVs(io, this.extraUVs);
    utils.writeUint8(io, new Map([
      [this.constructor.Weight.BDEF1, 0],
      [this.constructor.Weight.BDEF2, 1],
      [this.constructor.Weight.BDEF4, 2],
      [this.constructor.Weight.SDEF, 3]
    ]).get(this.weight.constructor));
    this.weight.write(io, utils);
    utils.writeFloat32(io, this.edgeSizeRate);
  }
  static read(io, utils) {
    const position = new Vector3(...utils.readFloat32Array(io, 3));
    const normal = new Vector3(...utils.readFloat32Array(io, 3));
    const uv = new Vector2(...utils.readFloat32Array(io, 2));
    const extraUVs = utils.readExtraUVs(io);
    const weight = [this.Weight.BDEF1, this.Weight.BDEF2, this.Weight.BDEF4, this.Weight.SDEF][utils.readUint8(io)].read(io, utils);
    const edgeSizeRate = utils.readFloat32(io);
    return new this(position, normal, uv, extraUVs, weight, edgeSizeRate);
  }
}
PMX.Vertex.Weight = {
  BDEF1: class BDEF1 {
    constructor(bones) {
      this.bones = bones;
    }
    write(io, utils) {
      utils.writeBoneIndex(io, this.bones[0].index);
    }
    static read(io, utils) {
      const index = utils.readBoneIndex(io);
      return new this([{index: index, weight: 1}]);
    }
  },
  BDEF2: class BDEF2 {
    constructor(bones) {
      this.bones = bones;
    }
    write(io, utils) {
      this.bones.forEach(bone => {
        utils.writeBoneIndex(io, bone.index);
      });
      utils.writeFloat32(io, this.bones[0].weight);
    }
    static read(io, utils) {
      const indices = new Array(2).fill().map(() => utils.readBoneIndex(io));
      const weight = utils.readFloat32(io);
      return new this([{index: indices[0], weight: weight}, {index: indices[1], weight: 1 - weight}]);
    }
  },
  BDEF4: class BDEF4 {
    constructor(bones) {
      this.bones = bones;
    }
    write(io, utils) {
      this.bones.forEach(bone => {
        utils.writeBoneIndex(io, bone.index);
      });
      this.bones.forEach(bone => {
        utils.writeFloat32(io, bone.weight);
      });
    }
    static read(io, utils) {
      const indices = new Array(4).fill().map(() => utils.readBoneIndex(io));
      const weights = new Array(4).fill().map(() => utils.readFloat32(io));
      return new this(_.range(4).map(i => ({index: indices[i], weight: weights[i]})));
    }
  },
  SDEF: class SDEF {
    constructor(bones, c, r0, r1) {
      this.bones = bones;
      this.c = c;
      this.r0 = r0;
      this.r1 = r1;
    }
    write(io, utils) {
      this.bones.forEach(bone => {
        utils.writeBoneIndex(io, bone.index);
      });
      utils.writeFloat32(io, this.bones[0].weight);
      utils.writeFloat32Array(io, Array.from(this.c));
      utils.writeFloat32Array(io, Array.from(this.r0));
      utils.writeFloat32Array(io, Array.from(this.r1));
    }
    static read(io, utils) {
      const indices = new Array(2).fill().map(() => utils.readBoneIndex(io));
      const weight = utils.readFloat32(io);
      const c = new Vector3(...utils.readFloat32Array(io, 3));
      const r0 = new Vector3(...utils.readFloat32Array(io, 3));
      const r1 = new Vector3(...utils.readFloat32Array(io, 3));
      return new this([{index: indices[0], weight: weight}, {index: indices[1], weight: 1 - weight}], c, r0, r1);
    }
  }
};
PMX.Face = class Face {
  constructor(vertexIndices) {
    this.vertexIndices = vertexIndices;
  }
  write(io, utils) {
    this.vertexIndices.forEach(vertexIndex => {
      utils.writeVertexIndex(io, vertexIndex);
    });
  }
  static read(io, utils) {
    const vertexIndices = new Array(3).fill().map(() => utils.readVertexIndex(io));
    return new this(vertexIndices);
  }
};
PMX.Texture = class Texture {
  constructor(filePath) {
    this.filePath = filePath;
  }
  write(io, utils) {
    utils.writeTextBuffer(io, this.filePath);
  }
  static read(io, utils) {
    const filePath = utils.readTextBuffer(io);
    return new this(filePath);
  }
};
PMX.Material = class Material {
  constructor(japaneseName, englishName, diffuse, specular, ambient, isDoubleSided, rendersGroundShadow, makesSelfShadow, rendersSelfShadow, rendersEdge, edge, textureIndex, sphereTexture, toonTexture, memo, faceCount) {
    this.japaneseName = japaneseName;
    this.englishName = englishName;
    this.diffuse = diffuse;
    this.specular = specular;
    this.ambient = ambient;
    this.isDoubleSided = isDoubleSided;
    this.rendersGroundShadow = rendersGroundShadow;
    this.makesSelfShadow = makesSelfShadow;
    this.rendersSelfShadow = rendersSelfShadow;
    this.rendersEdge = rendersEdge;
    this.edge = edge;
    this.textureIndex = textureIndex;
    this.sphereTexture = sphereTexture;
    this.toonTexture = toonTexture;
    this.memo = memo;
    this.faceCount = faceCount;
  }
  write(io, utils) {
    utils.writeTextBuffer(io, this.japaneseName);
    utils.writeTextBuffer(io, this.englishName);
    utils.writeFloat32Array(io, [this.diffuse.red, this.diffuse.green, this.diffuse.blue, this.diffuse.alpha]);
    utils.writeFloat32Array(io, [this.specular.red, this.specular.green, this.specular.blue, this.specular.coefficient]);
    utils.writeFloat32Array(io, [this.ambient.red, this.ambient.green, this.ambient.blue]);
    utils.writeUint8(io,
      (this.isDoubleSided ? 0x01 : 0x00) |
      (this.rendersGroundShadow ? 0x02 : 0x00) |
      (this.makesSelfShadow ? 0x04 : 0x00) |
      (this.rendersSelfShadow ? 0x08 : 0x00) |
      (this.rendersEdge ? 0x10 : 0x00)
    );
    utils.writeFloat32Array(io, [this.edge.red, this.edge.green, this.edge.blue, this.edge.alpha, this.edge.size]);
    utils.writeTextureIndex(io, this.textureIndex);
    utils.writeTextureIndex(io, this.sphereTexture.index);
    utils.writeUint8(io, {disabled: 0, multiply: 1, add: 2, subTexture: 3}[this.sphereTexture.mode]);
    utils.writeUint8(io, this.toonTexture.isShared ? 1 : 0);
    if (this.toonTexture.isShared) {
      utils.writeUint8(io, this.toonTexture.index);
    } else {
      utils.writeTextureIndex(io, this.toonTexture.index);
    }
    utils.writeTextBuffer(io, this.memo);
    utils.writeInt32(io, this.faceCount * 3);
  }
  static read(io, utils) {
    const japaneseName = utils.readTextBuffer(io);
    const englishName = utils.readTextBuffer(io);
    const diffuse = {
      red: utils.readFloat32(io),
      green: utils.readFloat32(io),
      blue: utils.readFloat32(io),
      alpha: utils.readFloat32(io)
    };
    const specular = {
      red: utils.readFloat32(io),
      green: utils.readFloat32(io),
      blue: utils.readFloat32(io),
      coefficient: utils.readFloat32(io)
    };
    const ambient = {
      red: utils.readFloat32(io),
      green: utils.readFloat32(io),
      blue: utils.readFloat32(io)
    };
    const bitFlag = utils.readUint8(io);
    const isDoubleSided = bitFlag & 0x01 == 0x01;
    const rendersGroundShadow = bitFlag & 0x02 == 0x02;
    const makesSelfShadow = bitFlag & 0x04 == 0x04;
    const rendersSelfShadow = bitFlag & 0x08 == 0x08;
    const rendersEdge = bitFlag & 0x10 == 0x10;
    const edge = {
      red: utils.readFloat32(io),
      green: utils.readFloat32(io),
      blue: utils.readFloat32(io),
      alpha: utils.readFloat32(io),
      size: utils.readFloat32(io)
    };
    const textureIndex = utils.readTextureIndex(io);
    const sphereTexture = {
      index: utils.readTextureIndex(io),
      mode: ["disabled", "multiply", "add", "subTexture"][utils.readUint8(io)]
    };
    const toonTextureShared = utils.readUint8(io) == 1;
    const toonTexture = {
      isShared: toonTextureShared,
      index: toonTextureShared ? utils.readUint8(io) : utils.readTextureIndex(io)
    };
    const memo = utils.readTextBuffer(io);
    const faceCount = utils.readInt32(io) / 3;
    return new this(japaneseName, englishName, diffuse, specular, ambient, isDoubleSided, rendersGroundShadow, makesSelfShadow, rendersSelfShadow, rendersEdge, edge, textureIndex, sphereTexture, toonTexture, memo, faceCount);
  }
};
