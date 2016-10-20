import Packer from "./packer";

const CAMERA_MODEL_NAME = "カメラ・照明\0on Data";
export default class VMD {
  constructor(modelName, keyFrames) {
    this.modelName = modelName;
    this.keyFrames = keyFrames;
  }
  write() {
    const io = {
      view: new DataView(new ArrayBuffer(4096)),
      offset: 0
    };
    Packer.writeNullTerminatedString(io, "Vocaloid Motion Data 0002", 30, "shift_jis");
    if (this.modelName == CAMERA_MODEL_NAME) {
      Packer.writeString(io, CAMERA_MODEL_NAME, "shift_jis");
    } else {
      Packer.writeNullTerminatedString(io, this.modelName, 20, "shift_jis");
    }
    Packer.writeUint32(io, _.flatten(Array.from(this.keyFrames.bone.values())).length);
    this.keyFrames.bone.forEach(keyFrames => {
      keyFrames.forEach(keyFrame => {
        keyFrame.write(io);
      });
    });
    Packer.writeUint32(io, this.keyFrames.morph.length);
    this.keyFrames.morph.forEach(keyFrame => {
      keyFrame.write(io);
    });
    Packer.writeUint32(io, this.keyFrames.camera.length);
    this.keyFrames.camera.forEach(keyFrame => {
      keyFrame.write(io);
    });
    Packer.writeUint32(io, this.keyFrames.light.length);
    this.keyFrames.light.forEach(keyFrame => {
      keyFrame.write(io);
    });
    Packer.writeUint32(io, this.keyFrames.selfShadow.length);
    this.keyFrames.selfShadow.forEach(keyFrame => {
      keyFrame.write(io);
    });
    Packer.writeUint32(io, this.keyFrames.showIK.length);
    this.keyFrames.showIK.forEach(keyFrame => {
      keyFrame.write(io);
    });
    return new Uint8Array(io.view.buffer, 0, io.offset);
  }
}
VMD.BoneKeyFrame = class BoneKeyFrame {
  constructor(boneName, frameNumber, position, quaternion, bezierCurves) {
    this.boneName = boneName;
    this.frameNumber = frameNumber;
    this.position = position;
    this.quaternion = quaternion;
    this.bezierCurves = bezierCurves;
  }
  write(io) {
    Packer.writeNullTerminatedString(io, this.boneName, 15, "shift_jis");
    Packer.writeUint32(io, this.frameNumber);
    Packer.writeFloat32Array(io, Array.from(this.position));
    Packer.writeFloat32Array(io, Array.from(this.quaternion.toVector()));
    Packer.writeInt8Array(io, [
      this.bezierCurves.x.controlPoints[1].x, this.bezierCurves.y.controlPoints[1].x,
      this.bezierCurves.z.controlPoints[1].x, this.bezierCurves.rotation.controlPoints[1].x,
      this.bezierCurves.x.controlPoints[1].y, this.bezierCurves.y.controlPoints[1].y,
      this.bezierCurves.z.controlPoints[1].y, this.bezierCurves.rotation.controlPoints[1].y,
      this.bezierCurves.x.controlPoints[2].x, this.bezierCurves.y.controlPoints[2].x,
      this.bezierCurves.z.controlPoints[2].x, this.bezierCurves.rotation.controlPoints[2].x,
      this.bezierCurves.x.controlPoints[2].y, this.bezierCurves.y.controlPoints[2].y,
      this.bezierCurves.z.controlPoints[2].y, this.bezierCurves.rotation.controlPoints[2].y,
                                              this.bezierCurves.y.controlPoints[1].x,
      this.bezierCurves.z.controlPoints[1].x, this.bezierCurves.rotation.controlPoints[1].x,
      this.bezierCurves.x.controlPoints[1].y, this.bezierCurves.y.controlPoints[1].y,
      this.bezierCurves.z.controlPoints[1].y, this.bezierCurves.rotation.controlPoints[1].y,
      this.bezierCurves.x.controlPoints[2].x, this.bezierCurves.y.controlPoints[2].x,
      this.bezierCurves.z.controlPoints[2].x, this.bezierCurves.rotation.controlPoints[2].x,
      this.bezierCurves.x.controlPoints[2].y, this.bezierCurves.y.controlPoints[2].y,
      this.bezierCurves.z.controlPoints[2].y, this.bezierCurves.rotation.controlPoints[2].y,
      0,
      this.bezierCurves.z.controlPoints[1].x, this.bezierCurves.rotation.controlPoints[1].x,
      this.bezierCurves.x.controlPoints[1].y, this.bezierCurves.y.controlPoints[1].y,
      this.bezierCurves.z.controlPoints[1].y, this.bezierCurves.rotation.controlPoints[1].y,
      this.bezierCurves.x.controlPoints[2].x, this.bezierCurves.y.controlPoints[2].x,
      this.bezierCurves.z.controlPoints[2].x, this.bezierCurves.rotation.controlPoints[2].x,
      this.bezierCurves.x.controlPoints[2].y, this.bezierCurves.y.controlPoints[2].y,
      this.bezierCurves.z.controlPoints[2].y, this.bezierCurves.rotation.controlPoints[2].y,
      0, 0,
                                              this.bezierCurves.rotation.controlPoints[1].x,
      this.bezierCurves.x.controlPoints[1].y, this.bezierCurves.y.controlPoints[1].y,
      this.bezierCurves.z.controlPoints[1].y, this.bezierCurves.rotation.controlPoints[1].y,
      this.bezierCurves.x.controlPoints[2].x, this.bezierCurves.y.controlPoints[2].x,
      this.bezierCurves.z.controlPoints[2].x, this.bezierCurves.rotation.controlPoints[2].x,
      this.bezierCurves.x.controlPoints[2].y, this.bezierCurves.y.controlPoints[2].y,
      this.bezierCurves.z.controlPoints[2].y, this.bezierCurves.rotation.controlPoints[2].y,
      0, 0, 0
    ].map(v => v * 127));
  }
};
