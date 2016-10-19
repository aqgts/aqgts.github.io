import Vector4 from "./vector4";

export default class Quaternion {
  constructor(w, x, y, z) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  toVector() {
    return new Vector4(this.x, this.y, this.z, this.w);
  }
}
Quaternion.identity = new Quaternion(1, 0, 0, 0);
