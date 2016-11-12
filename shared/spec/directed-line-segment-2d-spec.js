import "./register-global-variables";
import DirectedLineSegment2D from "./directed-line-segment-2d";
import Vector2 from "./vector2";
import Polygon from "./polygon";

describe("DirectedLineSegment2D", () => {
  it("subtract(Polygon)", () => {
    const lineSegment = new DirectedLineSegment2D(new Vector2(0, 1), new Vector2(3, 1));
    const polygon = new Polygon([
      new Vector2(1, 2),
      new Vector2(2, 2),
      new Vector2(2, 0),
      new Vector2(1, 0)
    ]);
    const expectedDifferences = [
      new DirectedLineSegment2D(new Vector2(0, 1), new Vector2(1, 1)),
      new DirectedLineSegment2D(new Vector2(2, 1), new Vector2(3, 1))
    ];
    const actualDifferences = lineSegment.subtract(polygon);
    expect(actualDifferences.length).toBe(expectedDifferences.length);
    expect(_.zip(actualDifferences, expectedDifferences).every(([actual, expected]) => actual.equals(expected))).toBe(true);
  });
});
