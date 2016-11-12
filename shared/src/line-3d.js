export default class Line3D {
  constructor(a, d) {
    this.a = a;
    this.d = d;
  }
  contains(p) {
    return this.d.y * p.x + this.d.x * this.a.y === this.d.x * p.y + this.d.y * this.a.x &&
      this.d.z * p.x + this.d.x * this.a.z === this.d.x * p.z + this.d.z * this.a.x &&
      this.d.z * p.y + this.d.y * this.a.z === this.d.y * p.z + this.d.z * this.a.y;
  }
  equals(other) {
    return this === other || (this.contains(other.a) && this.contains(other.a.add(other.d)));
  }
  static through(p1, p2) {
    if (p1.equals(p2)) throw new Error("p1 is identical to p2");
    return new this(p1, p2.subtract(p1));
  }
}
