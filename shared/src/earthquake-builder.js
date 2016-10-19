import DampedSinWave from "./damped-sin-wave";
import ComplexWave from "./complex-wave";
import Earthquake from "./earthquake";

const primes = [2, 3, 5, 7, 11, 13, 17];

function amplitude2(k, amplitude1, period1, halfLife1, period2, halfLife2) {
  const angularVelocity1 = 2 * Math.PI / period1;
  const angularVelocity2 = 2 * Math.PI / period2;
  return k * amplitude1 * Math.sqrt(
    Math.pow(Math.pow(angularVelocity1, 2) - Math.pow(Math.log(2) / halfLife1, 2), 2) +
    Math.pow(2 * angularVelocity1 * (Math.log(2) / halfLife1), 2)
  ) / Math.sqrt(
    Math.pow(Math.pow(angularVelocity2, 2) - Math.pow(Math.log(2) / halfLife2, 2), 2) +
    Math.pow(2 * angularVelocity2 * (Math.log(2) / halfLife2), 2)
  );
}

function createFundamentalWaves(amplitude, period, halfLife, offset, hasMainWave) {
  return (hasMainWave ? [new DampedSinWave(amplitude, period, halfLife, offset)] : []).concat(primes.map(prime => new DampedSinWave(
    amplitude2(0.03 * prime, amplitude, period, halfLife, period / prime, halfLife),
    period / prime,
    halfLife,
    offset
  )));
}

export default {
  create(infoPieces, period, halfLife) {
    return new Earthquake(
      new ComplexWave(
        _(infoPieces).flatMap(infoPiece => createFundamentalWaves(infoPiece.amplitude, period, halfLife, infoPiece.offset, false)).value()
      ),
      new ComplexWave(
        _(infoPieces).flatMap(infoPiece => createFundamentalWaves(infoPiece.amplitude, period, halfLife, infoPiece.offset, true)).value()
      ),
      new ComplexWave(
        _(infoPieces).flatMap(infoPiece => createFundamentalWaves(infoPiece.amplitude, period, halfLife, infoPiece.offset, false)).value()
      )
    );
  }
};
