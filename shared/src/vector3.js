import Vector from "./vector";

export default class Vector3 extends Vector {
  constructor(x, y, z) {
    super(x, y, z);
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
  crossProduct(other) {
    return new this.constructor(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x);
  }
}
