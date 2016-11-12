import Vector3 from "./vector3";
import Vector4 from "./vector4";
import MyMath from "./my-math";

export default class Quaternion {
  constructor(w, x, y, z) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  multiply(other) {
    return new this.constructor(
      this.real() * other.real() - this.imaginary().innerProduct(other.imaginary()),
      ...other.imaginary().multiply(this.real()).add(this.imaginary().multiply(other.real())).add(this.imaginary().crossProduct(other.imaginary()))
    );
  }
  rotate(other) {
    return this.multiply(new this.constructor(0, ...other)).multiply(this.conjugate()).imaginary();
  }
  power(t) {
    return new this.constructor(Math.cos(t * this.angle() / 2), ...this.axis().multiply(Math.sin(t * this.angle() / 2)));
  }
  add(other) {
    return new this.constructor(this.real() + other.real(), ...this.imaginary().add(other.imaginary()));
  }
  subtract(other) {
    return new this.constructor(this.real() - other.real(), ...this.imaginary().subtract(other.imaginary()));
  }
  negate() {
    return new this.constructor(-this.real(), ...this.imaginary().negate());
  }
  divide(other) {
    return this.multiply(other.inverse());
  }
  equals(other) {
    return this === other || (this.real() === other.real() && this.imaginary().equals(other.imaginary()));
  }
  abs() {
    return this.toVector().norm();
  }
  abs2() {
    return this.toVector().squaredNorm();
  }
  angle() {
    return Math.acos(MyMath.clamp(this.real(), -1, 1)) * 2;
  }
  axis() {
    return Math.abs(this.real()) >= 1 ? new Vector3(1, 0, 0) : this.imaginary().normalize();
  }
  conjugate() {
    return new this.constructor(this.real(), ...this.imaginary().negate());
  }
  imaginary() {
    return new Vector3(this.x, this.y, this.z);
  }
  inverse() {
    const conj = this.conjugate();
    const abs2 = this.abs2();
    return new this.constructor(conj.w / abs2, conj.x / abs2, conj.y / abs2, conj.z / abs2);
  }
  real() {
    return this.w;
  }
  toString() {
    return `${this.w}${this.x < 0 ? "-" : "+"}${Math.abs(this.x)}i${this.y < 0 ? "-" : "+"}${Math.abs(this.y)}j${this.z < 0 ? "-" : "+"}${Math.abs(this.z)}k`;
  }
  toVector() {
    return new Vector4(this.x, this.y, this.z, this.w);
  }
  yxzEulerAngles() {
    const cosPitchSinYaw = 2 * (this.w * this.y + this.x * this.z);
    const cosPitchCosYaw = 1 - 2 * (this.x * this.x + this.y * this.y);
    const sinPitch = 2 * (this.w * this.x - this.y * this.z);
    const cosPitchSinRoll = 2 * (this.w * this.z + this.x * this.y);
    const cosPitchCosRoll = 1 - 2 * (this.x * this.x + this.z * this.z);
    if (sinPitch > 0.9999) {
      return [2 * Math.atan2(this.y, this.w), Math.PI / 2, 0];
    } else if (sinPitch < -0.9999) {
      return [2 * Math.atan2(this.y, this.w), -Math.PI / 2, 0];
    } else {
      return [
        Math.atan2(cosPitchSinYaw, cosPitchCosYaw),
        Math.asin(MyMath.clamp(sinPitch, -1, 1)),
        Math.atan2(cosPitchSinRoll, cosPitchCosRoll)
      ];
    }
  }
  static angleAxis(angle, axis) {
    return new this(Math.cos(angle / 2), ...axis.normalize().multiply(Math.sin(angle / 2)));
  }
  static fromToRotation(fromDirection, toDirection) {
    fromDirection = fromDirection.normalize();
    toDirection = toDirection.normalize();
    if (fromDirection.innerProduct(toDirection) < -0.9999) { // 正反対
      return this.angleAxis(
        Math.PI,
        fromDirection.x !== 0 || fromDirection.y !== 0
          ? new Vector3(-fromDirection.y, fromDirection.x, 0)
          : new Vector3(-fromDirection.z, 0, 0)
      );
    }
    const bisect = fromDirection.add(toDirection).normalize();
    return new this(fromDirection.innerProduct(bisect), ...fromDirection.crossProduct(bisect));
  }
  static lookRotation(forward, upwards = new Vector3(0, 1, 0)) {
    forward = forward.normalize();
    upwards = upwards.normalize();
    const q1 = this.fromToRotation(new Vector3(0, 0, 1), forward);
    const side = upwards.crossProduct(forward);
    const q2 = this.fromToRotation(
      q1.multiply(new Vector3(0, 1, 0)),
      side.norm() < 0.0001 ? new Vector3(0, 0, -1) : forward.crossProduct(side.normalize())
    );
    return q2.multiply(q1);
  }
  static slerp(q0, q1, t) {
    return q0.multiply(q0.power(-1).multiply(q1).power(t));
  }
  static yxzEuler(yaw, pitch, roll) {
    return this.angleAxis(yaw, new Vector3(0, 1, 0))
      .multiply(this.angleAxis(pitch, new Vector3(1, 0, 0)))
      .multiply(this.angleAxis(roll, new Vector3(0, 0, 1)));
  }
}
Quaternion.identity = new Quaternion(1, 0, 0, 0);
Quaternion.I = new Quaternion(0, 1, 0, 0);
Quaternion.J = new Quaternion(0, 0, 1, 0);
Quaternion.K = new Quaternion(0, 0, 0, 1);
