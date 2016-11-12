export default class CanvasWrapper {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.lines = [];
  }
  clear() {
    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    delete(this.minX);
    delete(this.maxX);
    delete(this.minY);
    delete(this.maxY);
  }
  savePolygon(polygon, color) {
    this.lines.push({points: polygon.points.concat([polygon.points[0]]), color: color});
  }
  saveLineSegment(lineSegment, color) {
    this.lines.push({points: [lineSegment.p1, lineSegment.p2], color: color});
  }
  draw(option = {}) {
    if (this.lines.length == 0) return;
    const dataMinX = _.flatMap(this.lines, line => line.points).map(point => point.x).reduce((a, b) => Math.min(a, b), Infinity);
    const dataMaxX = _.flatMap(this.lines, line => line.points).map(point => point.x).reduce((a, b) => Math.max(a, b), -Infinity);
    const dataMinY = _.flatMap(this.lines, line => line.points).map(point => point.y).reduce((a, b) => Math.min(a, b), Infinity);
    const dataMaxY = _.flatMap(this.lines, line => line.points).map(point => point.y).reduce((a, b) => Math.max(a, b), -Infinity);
    const minX = "minX" in option
      ? option.minX
      : "minX" in this
        ? this.minX
        : (this.minX = Math.min((dataMaxX + dataMinX) / 2 - (dataMaxY - dataMinY) * this.canvas.width / this.canvas.height / 2, dataMinX));
    const maxX = "maxX" in option
      ? option.maxX
      : "maxX" in this
        ? this.maxX
        : (this.maxX = Math.max((dataMaxX + dataMinX) / 2 + (dataMaxY - dataMinY) * this.canvas.width / this.canvas.height / 2, dataMaxX));
    const minY = "minY" in option
      ? option.minY
      : "minY" in this
        ? this.minY
        : (this.minY = Math.min((dataMaxY + dataMinY) / 2 - (dataMaxX - dataMinX) * this.canvas.height / this.canvas.width / 2, dataMinY));
    const maxY = "maxY" in option
      ? option.maxY
      : "maxY" in this
        ? this.maxY
        : (this.maxY = Math.max((dataMaxY + dataMinY) / 2 + (dataMaxX - dataMinX) * this.canvas.height / this.canvas.width / 2, dataMaxY));
    const transform = (x1, y1) => [
      (x1 - minX) * this.canvas.width / (maxX - minX),
      this.canvas.height - (y1 - minY) * this.canvas.height / (maxY - minY)
    ];
    this.context.lineWidth = 0.5;
    this.lines.forEach(line => {
      this.context.strokeStyle = line.color;
      this.context.beginPath();
      this.context.moveTo(...transform(line.points[0].x, line.points[0].y));
      line.points.slice(1).forEach(point => {
        this.context.lineTo(...transform(point.x, point.y));
      });
      this.context.lineTo(...transform(line.points[0].x, line.points[0].y));
      this.context.stroke();
    });
    this.lines.length = 0;
  }
}
