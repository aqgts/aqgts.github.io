import Vector2 from "./vector2";
import DirectedLineSegment2D from "./directed-line-segment-2d";
import Rectangle from "./rectangle";
import MyMath from "./my-math";

export default class Polygon {
  constructor(points) { // 起点と終点は同一要素にしなくてよい
    if (points.length < 3) throw new Error("Polygon must have three or more vertices.");
    if (!points.every(point => point instanceof Vector2)) throw new Error("points must be Vector2 array.");
    this.points = points;
    const left = points.reduce((min, point) => Math.min(min, point.x), Number.POSITIVE_INFINITY);
    const right = points.reduce((max, point) => Math.max(max, point.x), Number.NEGATIVE_INFINITY);
    const top = points.reduce((max, point) => Math.max(max, point.y), Number.NEGATIVE_INFINITY);
    const bottom = points.reduce((min, point) => Math.min(min, point.y), Number.POSITIVE_INFINITY);
    this._outline = new Rectangle(left, top, right - left, top - bottom);
  }
  reverse() {
    return new this.constructor(Array.from(this.points).reverse());
  }
  lineSegments() {
    return new Array(this.points.length).fill().map((_, i) => new DirectedLineSegment2D(this.points[i], this.points[(i + 1) % this.points.length]));
  }
  isClockwise() {
    return this.lineSegments().reduce((sum, lineSegment) => sum + (lineSegment.p2.x - lineSegment.p1.x) * (lineSegment.p2.y + lineSegment.p1.y), 0) > 0;
  }
  _contains(p) {
    let cn = 0;
    for (const lineSegment of this.lineSegments()) {
      if ((lineSegment.p1.y <= p.y && p.y < lineSegment.p2.y) || (lineSegment.p2.y <= p.y && p.y < lineSegment.p1.y)) {
        const t = (p.y - lineSegment.p1.y) / (lineSegment.p2.y - lineSegment.p1.y);
        if (p.x < MyMath.lerp(lineSegment.p1.x, lineSegment.p2.x, t)) {
          ++cn;
        }
      }
    }
    return cn % 2 === 1;
  }
  containsProperly(p) {
    return this._outline.containsProperly(p) && (this._contains(p) && !this.lineSegments().some(lineSegment => lineSegment.contains(p)));
  }
  contains(p) {
    return this._outline.contains(p) && (this._contains(p) || this.lineSegments().some(lineSegment => lineSegment.contains(p)));
  }
  equals(other) {
    if (this === other) return true;
    const otherPoints = other.points;
    if (this.points.length !== otherPoints.length) return false;
    {
      let i;
      for (i = 0; i < otherPoints.length && !otherPoints[0].equals(this.points[0]); ++i) {
        otherPoints.unshift(otherPoints.pop());
      }
      if (i === otherPoints.length) return false;
    }
    return new Array(otherPoints.length).fill().every((_, i) => this.points[i].equals(otherPoints[i]));
  }
  subtract(other) { // thisとotherが両方ともclockwiseである必要がある
    {
      const intersections = this._outline.intersection(other._outline);
      if (intersections.length === 0 || !(intersections[0] instanceof Rectangle)) return [this];
    }

    const inThis = other.points.map(point => this.containsProperly(point));
    if (inThis.every(flag => flag)) { // otherがthisの内側に完全に入っている場合（接している場合は含まない）
      if (this.points.length > 3) throw new Error("Triangulation of four or more sided polygon with holes is currently not supported.");
      const [targetI, targetJ] = _(MyMath.cartesianProduct(_.range(0, this.points.length), _.range(0, other.points.length)))
        .minBy(([i, j]) => this.points[i].subtract(other.points[j]).squaredNorm());
      const otherTargetPoint = other.points[targetJ];
      const thisPoints = Array.from(this.points);
      const otherPoints = Array.from(other.points);
      while (otherPoints[0] !== otherTargetPoint) {
        otherPoints.unshift(otherPoints.pop());
      }
      thisPoints.splice(targetI + 1, 0, ...otherPoints.concat(otherPoints[0]).reverse(), thisPoints[targetI]);
      return [new this.constructor(thisPoints)];
    }

    const thisVertices = this.points.map(point => ({
      point: point,
      isOutside: !other.contains(point),
      cross: null,
      isInserted: false,
      isProcessed: false
    }));
    if (thisVertices.every(point => !point.isOutside)) return [];
    const otherVertices = other.points.map(point => ({
      point: point,
      isOutside: !this.contains(point),
      cross: null,
      isInserted: false,
      isProcessed: false
    })).reverse();
    for (let i = 0; i < thisVertices.length; ++i) {
      for (let j = 0; j < otherVertices.length; ++j) {
        const thisLineSegment = new DirectedLineSegment2D(thisVertices[i].point, thisVertices[(i + 1) % thisVertices.length].point);
        const otherLineSegment = new DirectedLineSegment2D(otherVertices[j].point, otherVertices[(j + 1) % otherVertices.length].point);
        const intersections = thisLineSegment.intersection(otherLineSegment);
        if (intersections.length === 0) continue;
        for (const crossPoint of intersections[0] instanceof DirectedLineSegment2D ? [intersections[0].p1, intersections[0].p2] : [intersections[0]]) {
          const thisVertex = {
            point: crossPoint,
            isOutside: false,
            isInserted: false,
            isProcessed: false
          };
          const otherVertex = {
            point: crossPoint,
            isOutside: false,
            isInserted: false,
            isProcessed: false
          };
          thisVertex.cross = otherVertex;
          otherVertex.cross = thisVertex;
          if (crossPoint.equals(thisLineSegment.p1)) {
            if (thisVertices[i].cross === null) thisVertices.splice(i, 1, thisVertex);
          } else if (crossPoint.equals(thisLineSegment.p2)) {
            if (thisVertices[(i + 1) % thisVertices.length].cross === null) thisVertices.splice((i + 1) % thisVertices.length, 1, thisVertex);
          } else {
            thisVertices.splice(i + 1, 0, thisVertex);
          }
          if (crossPoint.equals(otherLineSegment.p1)) {
            if (otherVertices[j].cross === null) otherVertices.splice(j, 1, otherVertex);
          } else if (crossPoint.equals(otherLineSegment.p2)) {
            if (otherVertices[(j + 1) % otherVertices.length].cross === null) otherVertices.splice((j + 1) % otherVertices.length, 1, otherVertex);
          } else {
            otherVertices.splice(j + 1, 0, otherVertex);
            ++j;
          }
        }
      }
    }
    for (let i = 0; i < thisVertices.length; ++i) {
      if (thisVertices[i].cross === null || thisVertices[(i + 1) % thisVertices.length].cross === null) continue;
      const insertedPoint = thisVertices[i].point.add(thisVertices[(i + 1) % thisVertices.length].point).divide(2);
      if (other.contains(insertedPoint)) continue;
      thisVertices.splice(i + 1, 0, {
        point: insertedPoint,
        isOutside: true,
        cross: null,
        isInserted: true,
        isProcessed: false
      });
      ++i;
    }
    for (let i = 0; i < otherVertices.length; ++i) {
      if (otherVertices[i].cross === null || otherVertices[(i + 1) % otherVertices.length].cross === null) continue;
      const insertedPoint = otherVertices[i].point.add(otherVertices[(i + 1) % otherVertices.length].point).divide(2);
      if (this.contains(insertedPoint)) continue;
      otherVertices.splice(i + 1, 0, {
        point: insertedPoint,
        isOutside: true,
        cross: null,
        isInserted: true,
        isProcessed: false
      });
      ++i;
    }
    for (let i = 0; i < thisVertices.length; ++i) thisVertices[i].index = i;
    for (let i = 0; i < otherVertices.length; ++i) otherVertices[i].index = i;

    function opposite(currentVertices) {
      return currentVertices === thisVertices ? otherVertices: thisVertices;
    }
    function next(currentVertices, currentVertex) {
      return currentVertices[(currentVertex.index + 1) % currentVertices.length];
    }
    const polygons = [];
    while (true) {
      const startVertex = _(thisVertices.filter(vertex => !vertex.isProcessed && vertex.isOutside)).minBy(vertex => vertex.index);
      if (typeof(startVertex) === "undefined") break;
      const outputVertices = [startVertex];
      startVertex.isProcessed = true;
      let currentVertex = startVertex;
      let currentVertices = thisVertices;
      while (true) {
        currentVertex = next(currentVertices, currentVertex);
        currentVertex.isProcessed = true;
        if (currentVertex === startVertex) break;
        outputVertices.push(currentVertex);
        if (
          currentVertex.cross !== null &&
          (
            (currentVertices === thisVertices && !next(opposite(currentVertices), currentVertex.cross).isOutside) ||
            (currentVertices === otherVertices && next(opposite(currentVertices), currentVertex.cross).isOutside)
          ) &&
          next(opposite(currentVertices), currentVertex.cross).cross !== next(currentVertices, currentVertex)
        ) {
          currentVertex = currentVertex.cross;
          currentVertex.isProcessed = true;
          currentVertices = opposite(currentVertices);
        }
      }
      polygons.push(new this.constructor(outputVertices.filter(vertex => !vertex.isInserted).map(vertex => vertex.point)));
    }

    return polygons;
  }
  triangulate() {
    function outer(p1, p2) {
      return p1.x * p2.y - p1.y * p2.x;
    }
    const triangles = [];
    const points = Array.from(this.points);
    while (points.length > 3) {
      let targetID = _(points.map((point, i) => [point, i])).maxBy(([point, i]) => point.squaredNorm())[1];
      let previousID = targetID - 1 < 0 ? points.length - 1 : targetID - 1;
      let nextID = (targetID + 1) % points.length;
      const outerProduct2 = outer(points[targetID].subtract(points[previousID]), points[nextID].subtract(points[targetID]));
      while (true) {
        const outerProduct = outer(points[targetID].subtract(points[previousID]), points[nextID].subtract(points[targetID]));
        if (points.every((point, i) =>
          i === previousID ||
          i === targetID ||
          i === nextID ||
          outer(points[targetID].subtract(points[previousID]), point.subtract(points[previousID])) * outerProduct <= 0 ||
          outer(points[nextID].subtract(points[targetID]), point.subtract(points[targetID])) * outerProduct <= 0 ||
          outer(points[previousID].subtract(points[nextID]), point.subtract(points[nextID])) * outerProduct <= 0
        )) {
          triangles.push(new this.constructor([points[previousID], points[targetID], points[nextID]]));
          points.splice(targetID, 1);
          break;
        } else {
          do {
            previousID = targetID;
            targetID = nextID;
            nextID = (nextID + 1) % points.length;
          } while (outer(points[targetID].subtract(points[previousID]), points[nextID].subtract(points[targetID])) * outerProduct2 < 0);
        }
      }
    }
    triangles.push(new this.constructor([points[0], points[1], points[2]]));
    return triangles;
  }
}
