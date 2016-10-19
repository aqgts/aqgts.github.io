export default class Vector {
  constructor(...values) {
    values.forEach((value, i) => {
      this[i] = value;
    });
    this.length = values.length;
  }
  neg() {
    return new this.constructor(...new Array(this.length).fill().map((_, i) => -this[i]));
  }
  add(other) {
    return new this.constructor(...new Array(this.length).fill().map((_, i) => this[i] + other[i]));
  }
  sub(other) {
    return new this.constructor(...new Array(this.length).fill().map((_, i) => this[i] - other[i]));
  }
  mul(scale) {
    return new this.constructor(...new Array(this.length).fill().map((_, i) => this[i] * other[i]));
  }
  div(scale) {
    return new this.constructor(...new Array(this.length).fill().map((_, i) => this[i] / other[i]));
  }
}
