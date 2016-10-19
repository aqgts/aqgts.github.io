import Vector from "./vector";

export default class Vector4 extends Vector {
  constructor(x, y, z, w) {
    super(x, y, z, w);
  }
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  get z() {
    return this[2];
  }
  set z(value) {
    this[2] = value;
  }
  get w() {
    return this[3];
  }
  set w(value) {
    this[3] = value;
  }
}
