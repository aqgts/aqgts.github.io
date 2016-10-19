export default class BezierCurve {
  constructor(...controlPoints) {
    if (controlPoints.length == 0) throw new Error("Empty control points.");
    this.controlPoints = controlPoints;
  }
  degree() {
    return this.controlPoints.length - 1;
  }
}
