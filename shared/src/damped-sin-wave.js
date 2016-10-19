export default class DampedSinWave {
  constructor(amplitude, period, halfLife, offset) {
    this.amplitude = amplitude;
    this.period = period;
    this.halfLife = halfLife;
    this.offset = offset;
  }
  get angularVelocity() {
    return 2 * Math.PI / this.period;
  }
  displacement(t) {
    return t < this.offset ? 0 : -this.amplitude * Math.sin(this.angularVelocity * (t - this.offset)) * Math.pow(0.5, (t - this.offset) / this.halfLife);
  }
  velocity(t) {
    return t < this.offset ? 0 : this.amplitude * Math.pow(0.5, (t - this.offset) / this.halfLife) * (
      Math.log(2) / this.halfLife * Math.sin(this.angularVelocity * (t - this.offset)) -
      this.angularVelocity * Math.cos(this.angularVelocity * (t - this.offset))
    );
  }
  acceleration(t) {
    return t < this.offset ? 0 : this.amplitude * Math.pow(0.5, (t - this.offset) / this.halfLife) * (
      (Math.pow(this.angularVelocity, 2) - Math.pow(Math.log(2) / this.halfLife, 2)) * Math.sin(this.angularVelocity * (t - this.offset)) +
      2 * this.angularVelocity * (Math.log(2) / this.halfLife) * Math.cos(this.angularVelocity * (t - this.offset))
    );
  }
}
