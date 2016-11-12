import Vector2 from "./vector2";
import DirectedLineSegment2D from "./directed-line-segment-2d";

export default class Rectangle {
  constructor(x, y, width, height) { // x, y は左上の点の座標
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  left() {
    return this.x;
  }
  right() {
    return this.x + this.width;
  }
  top() {
    return this.y;
  }
  bottom() {
    return this.y - this.height;
  }
  containsProperly(p) {
    return this.left() < p.x && p.x < this.right() && this.bottom() < p.y && p.y < this.top();
  }
  contains(p) {
    return this.left() <= p.x && p.x <= this.right() && this.bottom() <= p.y && p.y <= this.top();
  }
  intersection(other) {
    const left = Math.max(this.left(), other.left());
    const right = Math.min(this.right(), other.right());
    const top = Math.min(this.top(), other.top());
    const bottom = Math.max(this.bottom(), other.bottom());
    if (right < left || top < bottom) return [];
    if (left === right && bottom === top) return [new Vector2(left, top)];
    if (left < right && bottom === top) return [new DirectedLineSegment2D(new Vector2(left, top), new Vector2(right, top))];
    if (left === right && bottom < top) return [new DirectedLineSegment2D(new Vector2(left, top), new Vector2(left, bottom))];
    return [new this.constructor(left, top, right - left, top - bottom)];
  }
  equals(other) {
    return this === other || (this.x === other.x && this.y === other.y && this.width === other.width && this.height === other.height);
  }
}
