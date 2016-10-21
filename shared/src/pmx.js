import "babel-polyfill";
import "./lodash-extension";
import Vector2 from "./vector2";
import Vector3 from "./vector3";
import Vector4 from "./vector4";
import Packer from "./packer";

export default class PMX {
  constructor(header, model, vertices, faces, textures, materials, bones, morphs, displayElementGroups, unknown) {
    this.header = header;
    this.model = model;
    this.vertices = vertices;
    this.faces = faces;
    this.textures = textures;
    this.materials = materials;
    this.bones = bones;
    this.morphs = morphs;
    this.displayElementGroups = displayElementGroups;
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
      this.bones.length <= 127 ? 1 : this.bones.length <= 32767 ? 2 : 4,
      this.morphs.length <= 127 ? 1 : this.morphs.length <= 32767 ? 2 : 4,
      this.header.rigidBodyIndexSize
    );
  }
  write() {
    const io = {
      view: new DataView(new ArrayBuffer(4096)),
      offset: 0
    };
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
    utils.writeInt32(io, this.bones.length);
    this.bones.forEach(bone => {
      bone.write(io, utils);
    });
    utils.writeInt32(io, this.morphs.length);
    this.morphs.forEach(morph => {
      morph.write(io, utils);
    });
    utils.writeInt32(io, this.displayElementGroups.length);
    this.displayElementGroups.forEach(displayElementGroup => {
      displayElementGroup.write(io, utils);
    });
    utils.writeUint8Array(io, this.unknown);
    return new Uint8Array(io.view.buffer, io.view.byteOffset, io.offset);
  }
  static read(binary) {
    const io = {
      view: new DataView(binary.buffer, binary.byteOffset, binary.byteLength),
      offset: 0
    };
    if (Packer.readString(io, 4, "utf-8") != "PMX ") throw new Error("Not PMX.");
    if (Packer.readFloat32(io) != 2.0) throw new Error("Incompatible version.");
    const header = this.Header.read(io);
    const utils = new this.Utils(header);
    const model = this.Model.read(io, utils);
    const vertices = new Array(utils.readInt32(io)).fill().map(() => this.Vertex.read(io, utils));
    const faces = new Array(utils.readInt32(io) / 3).fill().map(() => this.Face.read(io, utils));
    const textures = new Array(utils.readInt32(io)).fill().map(() => this.Texture.read(io, utils));
    const materials = new Array(utils.readInt32(io)).fill().map(() => this.Material.read(io, utils));
    const bones = new Array(utils.readInt32(io)).fill().map(() => this.Bone.read(io, utils));
    const morphs = new Array(utils.readInt32(io)).fill().map(() => this.Morph.read(io, utils));
    const displayElementGroups = new Array(utils.readInt32(io)).fill().map(() => this.DisplayElementGroup.read(io, utils));
    const unknown = utils.readUint8Array(io, io.view.byteLength - io.offset);
    return new this(header, model, vertices, faces, textures, materials, bones, morphs, displayElementGroups, unknown)
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
    const isDoubleSided = (bitFlag & 0x01) == 0x01;
    const rendersGroundShadow = (bitFlag & 0x02) == 0x02;
    const makesSelfShadow = (bitFlag & 0x04) == 0x04;
    const rendersSelfShadow = (bitFlag & 0x08) == 0x08;
    const rendersEdge = (bitFlag & 0x10) == 0x10;
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
PMX.Bone = class Bone {
  constructor(japaneseName, englishName, position, parentIndex, deformationOrder, connection, isRotatable, isMovable, isVisible, isControllable, ikInfo, localAdditionMode, additionalRotation, additionalDisplacement, fixedAxis, localAxis, deformsAfterPhysics, keyValue) {
    this.japaneseName = japaneseName;
    this.englishName = englishName;
    this.position = position;
    this.parentIndex = parentIndex;
    this.deformationOrder = deformationOrder;
    this.connection = connection;
    this.isRotatable = isRotatable;
    this.isMovable = isMovable;
    this.isVisible = isVisible;
    this.isControllable = isControllable;
    this.ikInfo = ikInfo;
    this.localAdditionMode = localAdditionMode;
    this.additionalRotation = additionalRotation;
    this.additionalDisplacement = additionalDisplacement;
    this.fixedAxis = fixedAxis;
    this.localAxis = localAxis;
    this.deformsAfterPhysics = deformsAfterPhysics;
    this.keyValue = keyValue;
  }
  get isIk() {
    return this.ikInfo !== null;
  }
  get addsRotation() {
    return this.additionalRotation !== null;
  }
  get addsDisplacement() {
    return this.additionalDisplacement !== null;
  }
  get fixesAxis() {
    return this.fixedAxis !== null;
  }
  get hasLocalAxis() {
    return this.localAxis !== null;
  }
  get deformsUsingExternalParent() {
    return this.keyValue !== null;
  }
  write(io, utils) {
    utils.writeTextBuffer(io, this.japaneseName);
    utils.writeTextBuffer(io, this.englishName);
    utils.writeFloat32Array(io, Array.from(this.position));
    utils.writeBoneIndex(io, this.parentIndex);
    utils.writeInt32(io, this.deformationOrder);
    utils.writeUint8(io,
      (this.connection instanceof Vector3 ? 0x00 : 0x01) |
      (this.isRotatable ? 0x02 : 0x00) |
      (this.isMovable ? 0x04 : 0x00) |
      (this.isVisible ? 0x08 : 0x00) |
      (this.isControllable ? 0x10 : 0x00) |
      (this.isIk ? 0x20 : 0x00) |
      (this.localAdditionMode * 0x80)
    );
    utils.writeUint8(io,
      (this.addsRotation ? 0x01 : 0x00) |
      (this.addsDisplacement ? 0x02 : 0x00) |
      (this.fixesAxis ? 0x04 : 0x00) |
      (this.hasLocalAxis ? 0x08 : 0x00) |
      (this.deformsAfterPhysics ? 0x10 : 0x00) |
      (this.deformsUsingExternalParent ? 0x20 : 0x00)
    );
    if (this.connection instanceof Vector3) {
      utils.writeFloat32Array(io, Array.from(this.connection));
    } else {
      utils.writeBoneIndex(io, this.connection);
    }
    if (this.addsRotation) {
      utils.writeBoneIndex(io, this.additionalRotation.parentIndex);
      utils.writeFloat32(io, this.additionalRotation.rate);
    }
    if (!this.addsRotation && this.addsDisplacement) {
      utils.writeBoneIndex(io, this.additionalDisplacement.parentIndex);
      utils.writeFloat32(io, this.additionalDisplacement.rate);
    }
    if (this.fixesAxis) {
      utils.writeFloat32Array(io, Array.from(this.fixedAxis));
    }
    if (this.hasLocalAxis) {
      utils.writeFloat32Array(io, Array.from(this.localAxis.x));
      utils.writeFloat32Array(io, Array.from(this.localAxis.z));
    }
    if (this.deformsUsingExternalParent) {
      utils.writeInt32(io, this.keyValue);
    }
    if (this.isIk) {
      this.ikInfo.write(io, utils);
    }
  }
  static read(io, utils) {
    const japaneseName = utils.readTextBuffer(io);
    const englishName = utils.readTextBuffer(io);
    const position = new Vector3(...utils.readFloat32Array(io, 3));
    const parentIndex = utils.readBoneIndex(io);
    const deformationOrder = utils.readInt32(io);
    const bitFlags = utils.readUint8Array(io, 2);
    const connection = (bitFlags[0] & 0x01) == 0x00 ? new Vector3(...utils.readFloat32Array(io, 3)) : utils.readBoneIndex(io);
    const isRotatable = (bitFlags[0] & 0x02) == 0x02;
    const isMovable = (bitFlags[0] & 0x04) == 0x04;
    const isVisible = (bitFlags[0] & 0x08) == 0x08;
    const isControllable = (bitFlags[0] & 0x10) == 0x10;
    const isIk = (bitFlags[0] & 0x20) == 0x20;
    const localAdditionMode = (bitFlags[0] & 0x80) / 0x80;
    const addsRotation = (bitFlags[1] & 0x01) == 0x01;
    const addsDisplacement = (bitFlags[1] & 0x02) == 0x02;
    const fixesAxis = (bitFlags[1] & 0x04) == 0x04;
    const hasLocalAxis = (bitFlags[1] & 0x08) == 0x08;
    const deformsAfterPhysics = (bitFlags[1] & 0x10) == 0x10;
    const deformsUsingExternalParent = (bitFlags[1] & 0x20) == 0x20;
    const addition = addsRotation || addsDisplacement ? {
      parentIndex: utils.readBoneIndex(io),
      rate: utils.readFloat32(io)
    } : null;
    const additionalRotation = addsRotation ? addition : null;
    const additionalDisplacement = addsDisplacement ? addition : null;
    const fixedAxis = fixesAxis ? new Vector3(...utils.readFloat32Array(io, 3)) : null;
    const localAxis = hasLocalAxis ? {
      x: new Vector3(...utils.readFloat32Array(io, 3)),
      z: new Vector3(...utils.readFloat32Array(io, 3))
    } : null;
    const keyValue = deformsUsingExternalParent ? utils.readInt32(io) : null;
    const ikInfo = isIk ? this.IKInfo.read(io, utils) : null;
    return new this(japaneseName, englishName, position, parentIndex, deformationOrder, connection, isRotatable, isMovable, isVisible, isControllable, ikInfo, localAdditionMode, additionalRotation, additionalDisplacement, fixedAxis, localAxis, deformsAfterPhysics, keyValue);
  }
};
PMX.Bone.IKInfo = class IKInfo {
  constructor(targetIndex, loopCount, angleLimit, links) {
    this.targetIndex = targetIndex;
    this.loopCount = loopCount;
    this.angleLimit = angleLimit;
    this.links = links;
  }
  write(io, utils) {
    utils.writeBoneIndex(io, this.targetIndex);
    utils.writeInt32(io, this.loopCount);
    utils.writeFloat32(io, this.angleLimit);
    utils.writeInt32(io, this.links.length);
    this.links.forEach(link => {
      link.write(io, utils);
    });
  }
  static read(io, utils) {
    const targetIndex = utils.readBoneIndex(io);
    const loopCount = utils.readInt32(io);
    const angleLimit = utils.readFloat32(io);
    const links = new Array(utils.readInt32(io)).fill().map(() => this.Link.read(io, utils));
    return new this(targetIndex, loopCount, angleLimit, links);
  }
};
PMX.Bone.IKInfo.Link = class Link {
  constructor(boneIndex, lowerLimit, upperLimit) {
    this.boneIndex = boneIndex;
    this.lowerLimit = lowerLimit;
    this.upperLimit = upperLimit;
  }
  get hasLimit() {
    return this.lowerLimit !== null && this.upperLimit !== null;
  }
  write(io, utils) {
    utils.writeBoneIndex(io, this.boneIndex);
    utils.writeUint8(io, this.hasLimit ? 1 : 0);
    if (this.hasLimit) {
      utils.writeFloat32Array(io, Array.from(this.lowerLimit));
      utils.writeFloat32Array(io, Array.from(this.upperLimit));
    }
  }
  static read(io, utils) {
    const boneIndex = utils.readBoneIndex(io);
    const hasLimit = utils.readUint8(io) == 1;
    const lowerLimit = hasLimit ? new Vector3(...utils.readFloat32Array(io, 3)) : null;
    const upperLimit = hasLimit ? new Vector3(...utils.readFloat32Array(io, 3)) : null;
    return new this(boneIndex, lowerLimit, upperLimit);
  }
};
PMX.Morph = class Morph {
  constructor(japaneseName, englishName, panel, type, offsets) {
    this.japaneseName = japaneseName;
    this.englishName = englishName;
    this.panel = panel;
    this.type = type;
    this.offsets = offsets;
  }
  write(io, utils) {
    utils.writeTextBuffer(io, this.japaneseName);
    utils.writeTextBuffer(io, this.englishName);
    utils.writeUint8(io, {reserved: 0, eyebrows: 1, eyes: 2, mouth: 3, others: 4}[this.panel]);
    utils.writeUint8(io, {group: 0, vertex: 1, bone: 2, uv: 3, extraUV1: 4, extraUV2: 5, extraUV3: 6, extraUV4: 7, material: 8}[this.type]);
    utils.writeInt32(io, this.offsets.length);
    this.offsets.forEach(offset => {
      offset.write(io, utils);
    });
  }
  static read(io, utils) {
    const japaneseName = utils.readTextBuffer(io);
    const englishName = utils.readTextBuffer(io);
    const panel = ["reserved", "eyebrows", "eyes", "mouth", "others"][utils.readUint8(io)];
    const rawType = utils.readUint8(io);
    const type = ["group", "vertex", "bone", "uv", "extraUV1", "extraUV2", "extraUV3", "extraUV4", "material"][rawType];
    const offsets = new Array(utils.readInt32(io)).fill().map(() => [
      this.Offset.Group,
      this.Offset.Vertex,
      this.Offset.Bone,
      this.Offset.UV,
      this.Offset.UV,
      this.Offset.UV,
      this.Offset.UV,
      this.Offset.UV,
      this.Offset.Material
    ][rawType].read(io, utils));
    return new this(japaneseName, englishName, panel, type, offsets);
  }
};
PMX.Morph.Offset = {
  Group: class Group {
    constructor(morphIndex, rate) {
      this.morphIndex = morphIndex;
      this.rate = rate;
    }
    write(io, utils) {
      utils.writeMorphIndex(io, this.morphIndex);
      utils.writeFloat32(io, this.rate);
    }
    static read(io, utils) {
      const morphIndex = utils.readMorphIndex(io);
      const rate = utils.readFloat32(io);
      return new this(morphIndex, rate);
    }
  },
  Vertex: class Vertex {
    constructor(vertexIndex, displacement) {
      this.vertexIndex = vertexIndex;
      this.displacement = displacement;
    }
    write(io, utils) {
      utils.writeVertexIndex(io, this.vertexIndex);
      utils.writeFloat32Array(io, Array.from(this.displacement));
    }
    static read(io, utils) {
      const vertexIndex = utils.readVertexIndex(io);
      const displacement = new Vector3(...utils.readFloat32Array(io, 3));
      return new this(vertexIndex, displacement);
    }
  },
  Bone: class Bone {
    constructor(boneIndex, displacement, rotation) {
      this.boneIndex = boneIndex;
      this.displacement = displacement;
      this.rotation = rotation;
    }
    write(io, utils) {
      utils.writeBoneIndex(io, this.boneIndex);
      utils.writeFloat32Array(io, Array.from(this.displacement));
      utils.writeFloat32Array(io, Array.from(this.rotation.toVector()));
    }
    static read(io, utils) {
      const boneIndex = utils.readBoneIndex(io);
      const displacement = new Vector3(...utils.readFloat32Array(io, 3));
      const rotation = new Vector4(...utils.readFloat32Array(io, 4)).toQuaternion();
      return new this(boneIndex, displacement, rotation);
    }
  },
  UV: class Vertex {
    constructor(vertexIndex, displacement) {
      this.vertexIndex = vertexIndex;
      this.displacement = displacement;
    }
    write(io, utils) {
      utils.writeVertexIndex(io, this.vertexIndex);
      utils.writeFloat32Array(io, Array.from(this.displacement));
    }
    static read(io, utils) {
      const vertexIndex = utils.readVertexIndex(io);
      const displacement = new Vector4(...utils.readFloat32Array(io, 4));
      return new this(vertexIndex, displacement);
    }
  },
  Material: class Material {
    constructor(materialIndex, mode, diffuse, specular, ambient, edge, textureCoefficient, sphereTextureCoefficient, toonTextureCoefficient) {
      this.materialIndex = materialIndex;
      this.mode = mode;
      this.diffuse = diffuse;
      this.specular = specular;
      this.ambient = ambient;
      this.edge = edge;
      this.textureCoefficient = textureCoefficient;
      this.sphereTextureCoefficient = sphereTextureCoefficient;
      this.toonTextureCoefficient = toonTextureCoefficient;
    }
    write(io, utils) {
      utils.writeMaterialIndex(io, this.materialIndex);
      utils.writeUint8(io, {multiply: 0, add: 1}[this.mode]);
      utils.writeFloat32Array(io, [this.diffuse.red, this.diffuse.green, this.diffuse.blue, this.diffuse.alpha]);
      utils.writeFloat32Array(io, [this.specular.red, this.specular.green, this.specular.blue, this.specular.coefficient]);
      utils.writeFloat32Array(io, [this.ambient.red, this.ambient.green, this.ambient.blue]);
      utils.writeFloat32Array(io, [this.edge.red, this.edge.green, this.edge.blue, this.edge.alpha, this.edge.size]);
      utils.writeFloat32Array(io, [
        this.textureCoefficient.red,
        this.textureCoefficient.green,
        this.textureCoefficient.blue,
        this.textureCoefficient.alpha
      ]);
      utils.writeFloat32Array(io, [
        this.sphereTextureCoefficient.red,
        this.sphereTextureCoefficient.green,
        this.sphereTextureCoefficient.blue,
        this.sphereTextureCoefficient.alpha
      ]);
      utils.writeFloat32Array(io, [
        this.toonTextureCoefficient.red,
        this.toonTextureCoefficient.green,
        this.toonTextureCoefficient.blue,
        this.toonTextureCoefficient.alpha
      ]);
    }
    static read(io, utils) {
      const materialIndex = utils.readMaterialIndex(io);
      const mode = ["multiply", "add"][utils.readUint8(io)];
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
      const edge = {
        red: utils.readFloat32(io),
        green: utils.readFloat32(io),
        blue: utils.readFloat32(io),
        alpha: utils.readFloat32(io),
        size: utils.readFloat32(io)
      };
      const textureCoefficient = {
        red: utils.readFloat32(io),
        green: utils.readFloat32(io),
        blue: utils.readFloat32(io),
        alpha: utils.readFloat32(io)
      };
      const sphereTextureCoefficient = {
        red: utils.readFloat32(io),
        green: utils.readFloat32(io),
        blue: utils.readFloat32(io),
        alpha: utils.readFloat32(io)
      };
      const toonTextureCoefficient = {
        red: utils.readFloat32(io),
        green: utils.readFloat32(io),
        blue: utils.readFloat32(io),
        alpha: utils.readFloat32(io)
      };
      return new this(materialIndex, mode, diffuse, specular, ambient, edge, textureCoefficient, sphereTextureCoefficient, toonTextureCoefficient);
    }
  }
};
PMX.DisplayElementGroup = class DisplayElementGroup {
  constructor(japaneseName, englishName, isSpecial, elements) {
    this.japaneseName = japaneseName;
    this.englishName = englishName;
    this.isSpecial = isSpecial;
    this.elements = elements;
  }
  write(io, utils) {
    utils.writeTextBuffer(io, this.japaneseName);
    utils.writeTextBuffer(io, this.englishName);
    utils.writeUint8(io, this.isSpecial ? 1 : 0);
    utils.writeInt32(io, this.elements.length);
    this.elements.forEach(element => {
      element.write(io, utils);
    });
  }
  static read(io, utils) {
    const japaneseName = utils.readTextBuffer(io);
    const englishName = utils.readTextBuffer(io);
    const isSpecial = utils.readUint8(io) == 1;
    const count = utils.readInt32(io);
    const elements = new Array(count).fill().map(() => this.DisplayElement.read(io, utils));
    return new this(japaneseName, englishName, isSpecial, elements);
  }
};
PMX.DisplayElementGroup.DisplayElement = class DisplayElement {
  constructor(type, index) {
    this.type = type;
    this.index = index;
  }
  write(io, utils) {
    utils.writeUint8(io, {bone: 0, morph: 1}[this.type]);
    utils[{bone: "writeBoneIndex", morph: "writeMorphIndex"}[this.type]](io, this.index);
  }
  static read(io, utils) {
    const type = ["bone", "morph"][utils.readUint8(io)];
    const index = utils[{bone: "readBoneIndex", morph: "readMorphIndex"}[type]](io);
    return new this(type, index);
  }
};
