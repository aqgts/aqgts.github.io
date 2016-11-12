import "./register-global-variables";
import Polygon from "./polygon";
import Vector2 from "./vector2";

describe("Polygon", () => {
  it("subtract", () => {
    const polygon1 = new Polygon([
      new Vector2(0, 1),
      new Vector2(3, 4),
      new Vector2(4, 4),
      new Vector2(4, 3),
      new Vector2(1, 0),
      new Vector2(0, 0)
    ]);
    const polygon2 = new Polygon([
      new Vector2(0, 2),
      new Vector2(3, 3),
      new Vector2(4, 2),
      new Vector2(2, 2),
      new Vector2(2, 0)
    ]);
    const expectedDifferences = [
      new Polygon([
        new Vector2(2, 1),
        new Vector2(2, 2),
        new Vector2(3, 2)
      ]),
      new Polygon([
        new Vector2(0, 1),
        new Vector2(0.5, 1.5),
        new Vector2(1.5, 0.5),
        new Vector2(1, 0),
        new Vector2(0, 0)
      ]),
      new Polygon([
        new Vector2(3, 4),
        new Vector2(4, 4),
        new Vector2(4, 3),
        new Vector2(3.5, 2.5),
        new Vector2(3, 3),
        new Vector2(1.5, 2.5)
      ])
    ];
    const actualDifferences = polygon1.subtract(polygon2).sort((x, y) => x.points.length - y.points.length);
    expect(actualDifferences.length).toBe(expectedDifferences.length);
    expect(_.zip(actualDifferences, expectedDifferences).every(([actual, expected]) => actual.equals(expected))).toBe(true);
  });
});
