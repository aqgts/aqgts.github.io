import Vector2 from "./vector2";
import Line2D from "./line-2d";
import Polygon from "./polygon";

export default class DirectedLineSegment2D {
  constructor(p1, p2) {
    if (p1.equals(p2)) throw new Error("Zero length line segment.");
    this.p1 = p1;
    this.p2 = p2;
  }
  reverse() {
    return new this.constructor(this.p2, this.p1);
  }
  equals(other) {
    return this === other || (this.p1.equals(other.p1) && this.p2.equals(other.p2));
  }
  toVector() {
    return this.p2.subtract(this.p1);
  }
  length() {
    return this.toVector().norm();
  }
  contains(p) {
    if (p.equals(this.p1) || p.equals(this.p2)) return true;
    const l = Line2D.through(this.p1, this.p2);
    if (!l.contains(p)) return false;
    const d = p.subtract(this.p1).innerProduct(this.toVector());
    return 0 <= d && d <= this.toVector().squaredNorm();
  }
  crosses(other) { // 唯一の交点を持つ
    return this.crossPoint(other) !== null;
  }
  crossPoint(other) { // 唯一の交点
    const intersections = this.intersection(other);
    return intersections.length > 0 && intersections[0] instanceof Vector2 ? intersections[0] : null;
  }
  intersects(other) { // 共通部分を持つ
    return this.intersection(other).length > 0;
  }
  intersection(other) { // 共通部分
    const l1 = Line2D.through(this.p1, this.p2);
    const l2 = Line2D.through(other.p1, other.p2);
    if (l1.equals(l2)) {
      const base = this.toVector();
      const fixedOther = base.innerProduct(other.toVector()) > 0 ? other : other.reverse();
      const d1 = 0;
      const d2 = base.innerProduct(base);
      const d3 = base.innerProduct(fixedOther.p1.subtract(this.p1));
      const d4 = base.innerProduct(fixedOther.p2.subtract(this.p1));
      if (d1 === d4) return [this.p1];
      if (d2 === d3) return [this.p2];
      if (d3 <= d1 && d2 <= d4) return [this];
      if (d1 <= d3 && d4 <= d2) return [fixedOther];
      if (d3 <= d1 && d1 <= d4 && d4 <= d2) return [new this.constructor(this.p1, fixedOther.p2)];
      if (d1 <= d3 && d3 <= d2 && d2 <= d4) return [new this.constructor(fixedOther.p1, this.p2)];
      return [];
    }
    if (l1.isParallelTo(l2)) return [];
    if (this.p1.equals(other.p1) || this.p1.equals(other.p2)) return [this.p1];
    if (this.p2.equals(other.p1) || this.p2.equals(other.p2)) return [this.p2];
    if (((other.p1.y - this.p1.y) * (this.p2.x - this.p1.x) - (this.p2.y - this.p1.y) * (other.p1.x - this.p1.x)) *
      ((other.p2.y - this.p1.y) * (this.p2.x - this.p1.x) - (this.p2.y - this.p1.y) * (other.p2.x - this.p1.x)) > 0 ||
      ((this.p1.y - other.p1.y) * (other.p2.x - other.p1.x) - (other.p2.y - other.p1.y) * (this.p1.x - other.p1.x)) *
      ((this.p2.y - other.p1.y) * (other.p2.x - other.p1.x) - (other.p2.y - other.p1.y) * (this.p2.x - other.p1.x)) > 0) return [];
    return [l1.crossPoint(l2)];
  }
  subtract(other) {
    if (other instanceof this.constructor) {
      const intersections = this.intersection(other);
      if (intersections.length === 0 || intersections[0] instanceof Vector2) return [this];
      const lineSegment = intersections[0];
      if (this.equals(lineSegment)) return [];
      if (this.p1.equals(lineSegment.p1)) return [new this.constructor(lineSegment.p2, this.p2)];
      if (this.p2.equals(lineSegment.p2)) return [new this.constructor(this.p1, lineSegment.p1)];
      return [
        new this.constructor(this.p1, lineSegment.p1),
        new this.constructor(lineSegment.p2, this.p2)
      ];
    } else if (other instanceof Polygon) {
      const keys = _([this.p1].concat(
        other.lineSegments()
        .map(lineSegment => this.intersection(lineSegment))
        .filter(intersections => intersections.length > 0)
        .map(intersections => intersections[0]),
        [this.p2]
      )).sortBy(
        key => (key instanceof Vector2 ? key : key.p1.add(key.p2).divide(2)).subtract(this.p1).innerProduct(this.toVector())
      ).value();
      return _(keys.slice(0, -1)).zip(keys.slice(1)).flatMap(([key1, key2]) => {
        const p1 = key1 instanceof Vector2 ? key1 : key1.p2;
        const p2 = key2 instanceof Vector2 ? key2 : key2.p1;
        return p1.equals(p2) ? [] : [new this.constructor(p1, p2)];
      }).value().filter(difference => !other.contains(difference.p1.add(difference.p2).divide(2)));
    }
  }
}
