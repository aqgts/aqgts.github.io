import Vector from "./vector";
import Quaternion from "./quaternion";

export default class Vector4 extends Vector {
  constructor(x, y, z, w) {
    super(x, y, z, w);
  }
  get x() {
    return this[0];
  }
  get y() {
    return this[1];
  }
  get z() {
    return this[2];
  }
  get w() {
    return this[3];
  }
  toQuaternion() {
    return new Quaternion(this.w, this.x, this.y, this.z);
  }
}
