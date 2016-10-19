export default class ComplexWave {
  constructor(fundamentalWaves) {
    this.fundamentalWaves = fundamentalWaves;
  }
  displacement(t) {
    return _.sum(this.fundamentalWaves.map(wave => wave.displacement(t)));
  }
  velocity(t) {
    return _.sum(this.fundamentalWaves.map(wave => wave.velocity(t)));
  }
  acceleration(t) {
    return _.sum(this.fundamentalWaves.map(wave => wave.acceleration(t)));
  }
}
