import Vector from "./vector";

export default class Vector2 extends Vector {
  constructor(x, y) {
    super(x, y);
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
}
