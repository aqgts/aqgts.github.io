import Vector3 from "./vector3";

export default class Plane {
  constructor(a, b, c, d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
  }
  contains(p) {
    return this.a * p.x + this.b * p.y + this.c * p.z + this.d === 0;
  }
  normal() {
    return new Vector3(this.a, this.b, this.c).normalize();
  }
  isParallelTo(other) { // 同一平面である場合は含まない
    return this.a * other.b === this.b * other.a &&
      this.a * other.c === this.c * other.a &&
      this.b * other.c === this.c * other.b &&
      this.a * other.d !== this.d * other.a &&
      this.b * other.d !== this.d * other.b &&
      this.c * other.d !== this.d * other.c;
  }
  equals(other) {
    return this === other || (
      this.a * other.b === this.b * other.a &&
      this.a * other.c === this.c * other.a &&
      this.a * other.d === this.d * other.a &&
      this.b * other.c === this.c * other.b &&
      this.b * other.d === this.d * other.b &&
      this.c * other.d === this.d * other.c
    );
  }
  toString() {
    return `${this.a}x${this.b < 0 ? "-" : "+"}${Math.abs(this.b)}y${this.c < 0 ? "-" : "+"}${Math.abs(this.c)}z${this.d < 0 ? "-" : "+"}${Math.abs(this.d)}=0`;
  }
  static through(p1, p2, p3) {
    if (p1.equals(p2)) throw new Error("p1 is identical to p2");
    if (p2.equals(p3)) throw new Error("p2 is identical to p3");
    if (p3.equals(p1)) throw new Error("p3 is identical to p1");
    const normal = p2.subtract(p1).crossProduct(p3.subtract(p1));
    return new this(normal.x, normal.y, normal.z, normal.x * p1.x + normal.y * p1.y + normal.z * p1.z);
  }
}
