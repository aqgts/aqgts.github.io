import Vector2 from "./vector2";
import Vector3 from "./vector3";
import DirectedLineSegment2D from "./directed-line-segment-2d";
import Line3D from "./line-3d";
import Polygon from "./polygon";
import MyMath from "./my-math";
import PMX from "./pmx";

export default {
  createEmptyModel() {
    return PMX.read(new Uint8Array([
      0x50, 0x4D, 0x58, 0x20, 0x00, 0x00, 0x00, 0x40, 0x08, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0xBB, 0x30, 0xF3, 0x30, 0xBF, 0x30, 0xFC,
      0x30, 0x0C, 0x00, 0x00, 0x00, 0x63, 0x00, 0x65, 0x00, 0x6E, 0x00, 0x74, 0x00, 0x65, 0x00, 0x72,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00,
      0x00, 0x00, 0x1E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x52, 0x00, 0x6F, 0x00,
      0x6F, 0x00, 0x74, 0x00, 0x08, 0x00, 0x00, 0x00, 0x52, 0x00, 0x6F, 0x00, 0x6F, 0x00, 0x74, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x68, 0x88, 0xC5, 0x60, 0x06,
      0x00, 0x00, 0x00, 0x45, 0x00, 0x78, 0x00, 0x70, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]));
  },
  // Y=thresholdYをrotationA回転してdisplacementA移動した平面と、modelをrotationB回転してdisplacementB移動した多面体が作る断面
  crossSection(thresholdY, rotationA, displacementA, model, rotationB, displacementB) {
    const protoCurvePartMap = _.flatMap(model.faces, face => {
      const points = face.vertexIndices.map(
        i => rotationA.inverse().rotate(rotationB.rotate(model.vertices[i].position).add(displacementB).subtract(displacementA))
      );
      const overPoints = points.filter(point => point.y >= thresholdY);
      const underPoints = points.filter(point => point.y < thresholdY);
      if (overPoints.length === 3 || underPoints.length === 3) return [];
      const centerPoint = overPoints.length === 1 ? overPoints[0] : underPoints[0];
      while (points[0] !== centerPoint) {
        points.unshift(points.pop());
      }
      const newPoints = [points[1], points[2]].map(point => {
        const t = (thresholdY - centerPoint.y) / (point.y - centerPoint.y);
        return Vector3.lerp(centerPoint, point, t);
      });
      if (newPoints[0].equals(newPoints[1])) return [];
      return [overPoints.length === 1
        ? new DirectedLineSegment2D(new Vector2(newPoints[1].x, newPoints[1].z), new Vector2(newPoints[0].x, newPoints[0].z))
        : new DirectedLineSegment2D(new Vector2(newPoints[0].x, newPoints[0].z), new Vector2(newPoints[1].x, newPoints[1].z))];
    }).map(lineSegment => [Array.from(lineSegment.p1).map(v => Math.fround(v)).toString(), [lineSegment]]);
    const curvePartMap = new Map(protoCurvePartMap);
    if (curvePartMap.size < protoCurvePartMap.length) throw new Error("Duplicate vertices were found.");

    const polygons = [];
    const curves = [];
    Array.from(curvePartMap.keys()).forEach(startKey => {
      if (!curvePartMap.has(startKey)) return;
      let nextKey;
      while (curvePartMap.has(nextKey = Array.from(_(curvePartMap.get(startKey)).last().p2).map(v => Math.fround(v)).toString()) && nextKey !== startKey) {
        curvePartMap.set(startKey, curvePartMap.get(startKey).concat(curvePartMap.get(nextKey)));
        curvePartMap.delete(nextKey);
      }
      if (nextKey === startKey && curvePartMap.get(startKey).length >= 3) {
        polygons.push(new Polygon(curvePartMap.get(startKey).map(lineSegment => lineSegment.p1)));
      } else {
        curves.push(curvePartMap.get(startKey));
      }
      curvePartMap.delete(startKey);
    });

    return {polygons: polygons, curves: curves};
  },
  subtract(model, face, subtrahendPolygon) {
    function makeVertexObject(toStringArray, toVertexArray) {
      switch (toVertexArray.length) {
        case 1: {
          const [i] = toVertexArray;
          const vertex = model.vertices[i];
          return {
            vertexIndices: [i],
            toString() { return toStringArray.join(","); },
            toVertex() { return vertex; }
          };
        }
        case 3: {
          const [i1, i2, t] = toVertexArray;
          const vertices = [model.vertices[i1], model.vertices[i2]];
          return {
            vertexIndices: [i1, i2],
            t: t,
            toString() { return toStringArray.join(","); },
            toVertex() {
              if (vertices.some(vertex => vertex.weight instanceof PMX.Vertex.Weight.SDEF)) {
                throw new Error(`Combining vertices (${i1} and ${i2}) failed: SDEF not supported.`);
              }
              const vertexIndexSet = new Set(_(vertices).flatMap(vertex => vertex.weight.bones).value().map(bone => bone.index));
              if (!new Set([1, 2, 4]).has(vertexIndexSet.size)) {
                throw new Error(`Combining vertices (${i1} and ${i2}) failed: combining needs BDEF${vertexIndexSet.size}.`);
              }
              let weightMap = new Map(Array.from(vertexIndexSet).map(i => [i, 0]));
              weightMap = vertices[0].weight.bones.reduce(
                (map, bone) => map.set(bone.index, map.get(bone.index) + bone.weight * (1 - t)),
                weightMap
              );
              weightMap = vertices[1].weight.bones.reduce(
                (map, bone) => map.set(bone.index, map.get(bone.index) + bone.weight * t),
                weightMap
              );
              const weight = new PMX.Vertex.Weight[`BDEF${vertexIndexSet.size}`](
                Array.from(weightMap).map(([index, weight]) => ({index: index, weight: weight}))
              );
              return new PMX.Vertex(
                Vector3.lerp(vertices[0].position, vertices[1].position, t),
                Vector3.lerp(vertices[0].normal, vertices[1].normal, t).normalize(),
                Vector2.lerp(vertices[0].uv, vertices[1].uv, t),
                _.zip(vertices[0].extraUVs, vertices[1].extraUVs).map(([uv0, uv1]) => Vector2.lerp(uv0, uv1, t)),
                weight,
                MyMath.lerp(vertices[0].edgeSizeRate, vertices[1].edgeSizeRate, t)
              );
            }
          };
        }
        case 5: {
          const [i1, i2, i3, t1, t2] = toVertexArray;
          const vertices = [model.vertices[i1], model.vertices[i2], model.vertices[i3]];
          return {
            vertexIndices: [i1, i2, i3],
            t1: t1,
            t2: t2,
            toString() { return toStringArray.join(","); },
            toVertex() {
              if (vertices.some(vertex => vertex.weight instanceof PMX.Vertex.Weight.SDEF)) {
                throw new Error(`Combining vertices (${i1}, ${i2} and ${i3}) failed: SDEF not supported.`);
              }
              const vertexIndexSet = new Set(_(vertices).flatMap(vertex => vertex.weight.bones).value().map(bone => bone.index));
              if (!new Set([1, 2, 4]).has(vertexIndexSet.size)) {
                throw new Error(`Combining vertices (${i1}, ${i2} and ${i3}) failed: combining needs BDEF${vertexIndexSet.size}.`);
              }
              let weightMap = new Map(Array.from(vertexIndexSet).map(i => [i, 0]));
              weightMap = vertices[0].weight.bones.reduce(
                (map, bone) => map.set(bone.index, map.get(bone.index) + bone.weight * (1 - t1 - t2)),
                weightMap
              );
              weightMap = vertices[1].weight.bones.reduce(
                (map, bone) => map.set(bone.index, map.get(bone.index) + bone.weight * t1),
                weightMap
              );
              weightMap = vertices[2].weight.bones.reduce(
                (map, bone) => map.set(bone.index, map.get(bone.index) + bone.weight * t2),
                weightMap
              );
              const weight = new PMX.Vertex.Weight[`BDEF${vertexIndexSet.size}`](
                Array.from(weightMap).map(([index, weight]) => ({index: index, weight: weight}))
              );
              function slerp(s1, s2, s3, t1, t2) {
                return s1 + (s2 - s1) * t1 + (s3 - s1) * t2;
              }
              function vlerp(v1, v2, v3, t1, t2) {
                return v1.add(v2.subtract(v1).multiply(t1)).add(v3.subtract(v1).multiply(t2));
              }
              return new PMX.Vertex(
                vlerp(vertices[0].position, vertices[1].position, vertices[2].position, t1, t2),
                vlerp(vertices[0].normal, vertices[1].normal, vertices[2].normal, t1, t2).normalize(),
                vlerp(vertices[0].uv, vertices[1].uv, vertices[2].uv, t1, t2),
                _.zip(vertices[0].extraUVs, vertices[1].extraUVs, vertices[2].extraUVs).map(([uv0, uv1, uv2]) => vlerp(uv0, uv1, uv2, t1, t2)),
                weight,
                slerp(vertices[0].edgeSizeRate, vertices[1].edgeSizeRate, vertices[2].edgeSizeRate, t1, t2)
              );
            }
          };
        }
      }
    }
    function helper1(vertexIndices, points, p) {
      // vertexIndicesはソート済み、pointsもvertexIndicesでソート済み、pointsは3点全て異なる点
      const [t1, t2] = p.equals(points[0]) ? [0, 0]
        : p.equals(points[1]) ? [1, 0]
        : p.equals(points[2]) ? [0, 1]
        : [
          ((p.x - points[0].x) * (points[0].y - points[2].y) - (points[0].x - points[2].x) * (p.y - points[0].y)) /
            ((points[0].x - points[2].x) * (points[0].y - points[1].y) - (points[0].x - points[1].x) * (points[0].y - points[2].y)),
          (points[0].x * p.y - points[0].x * points[1].y - points[1].x * p.y - p.x * points[0].y + points[1].x * points[0].y + p.x * points[1].y) /
            (points[1].x * points[0].y - points[2].x * points[0].y - points[0].x * points[1].y + points[2].x * points[1].y + points[0].x * points[2].y - points[1].x * points[2].y)
        ];
      const [t1Float32, t2Float32] = [t1, t2].map(t => Math.fround(t));
      if (t1Float32 === 0 && t2Float32 === 0) {
        return makeVertexObject([vertexIndices[0]], [vertexIndices[0]]);
      }
      if (t1Float32 === 1 && t2Float32 === 0) {
        return makeVertexObject([vertexIndices[1]], [vertexIndices[1]]);
      }
      if (t1Float32 === 0 && t2Float32 === 1) {
        return makeVertexObject([vertexIndices[2]], [vertexIndices[2]]);
      }
      if (t2Float32 === 0) {
        return makeVertexObject([vertexIndices[0], vertexIndices[1], t1Float32], [vertexIndices[0], vertexIndices[1], t1]);
      }
      if (t1Float32 === 0) {
        return makeVertexObject([vertexIndices[0], vertexIndices[2], t2Float32], [vertexIndices[0], vertexIndices[2], t2]);
      }
      if (Math.fround(t1 + t2) === 1) {
        return makeVertexObject([vertexIndices[1], vertexIndices[2], t2Float32], [vertexIndices[1], vertexIndices[2], t2]);
      }
      return makeVertexObject(
        [vertexIndices[0], vertexIndices[1], vertexIndices[2], t1Float32, t2Float32],
        [vertexIndices[0], vertexIndices[1], vertexIndices[2], t1, t2]
      );
    }
    function helper2(vertexIndices, reverseOffset, d) {
      const dFloat32 = Math.fround(d);
      const rd = 1 - d;
      const rdFloat32 = Math.fround(1 - d);
      const i0 = vertexIndices[(0 + reverseOffset) % 3];
      const i1 = vertexIndices[(1 + reverseOffset) % 3];
      const i2 = vertexIndices[(2 + reverseOffset) % 3];
      if (dFloat32 === 0) {
        return [makeVertexObject([i0], [i0])];
      } else if (dFloat32 === 1) {
        return [makeVertexObject([i1], [i1]), makeVertexObject([i2], [i2])];
      } else {
        return [
          i0 < i1 ? makeVertexObject([i0, i1, dFloat32], [i0, i1, d]) : makeVertexObject([i1, i0, rdFloat32], [i1, i0, rd]),
          i0 < i2 ? makeVertexObject([i0, i2, dFloat32], [i0, i2, d]) : makeVertexObject([i2, i0, rdFloat32], [i2, i0, rd])
        ];
      }
    }
    function algorithm1(projectedPoints) {
      const sortedVertexIndices = Array.from(face.vertexIndices).sort((x, y) => x - y);
      const sortedPoints = sortedVertexIndices.map(i => new Vector2(model.vertices[i].position.x, model.vertices[i].position.z));
      const originalProjection = new Polygon(projectedPoints);
      const projection = originalProjection.isClockwise() ? originalProjection : originalProjection.reverse();
      const differenceTriangles = _(projection.subtract(subtrahendPolygon)).flatMap(
        differencePolygon => differencePolygon.triangulate()
      ).value().map(
        triangle => originalProjection.isClockwise() ? triangle : triangle.reverse()
      );
      return differenceTriangles.map(
        triangle => triangle.points.map(point => helper1(sortedVertexIndices, sortedPoints, point))
      );
    }
    function algorithm2(projectedPoints) {
      const sortedVertexIndices = Array.from(face.vertexIndices).sort((x, y) => x - y);
      const sortedPoints = _(face.vertexIndices)
        .zip([0, 1, 2])
        .sortBy(([vertexIndex, i]) => vertexIndex)
        .value()
        .map(([vertexIndex, i]) => [new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)][i]);
      return _(new DirectedLineSegment2D(
        ..._(projectedPoints).zip(projectedPoints.slice(1).concat([projectedPoints[0]])).maxBy(([p1, p2]) => p2.subtract(p1).squaredNorm())
      ).subtract(subtrahendPolygon)).flatMap(lineSegment => {
        const tuples = _([lineSegment.p1, lineSegment.p2]).flatMap((p, j) =>
          [0, 1, 2].filter(i => p.equals(projectedPoints[i]))
            .map(i => [[0, 0, 0, j], [1, 0, 1, j], [0, 1, 2, j]][i])
            .concat(
              _.zip([0, 1, 2], [1, 2, 0])
                .filter(([i1, i2]) => !p.equals(projectedPoints[i1]) && !p.equals(projectedPoints[i2]))
                .map(([i1, i2]) => [i1, i2, projectedPoints[i2].subtract(projectedPoints[i1])])
                .filter(([i1, i2, v]) => v.squaredNorm() > 0)
                .map(([i1, i2, v]) => [i1, i2, p.subtract(projectedPoints[i1]).innerProduct(v) / v.squaredNorm()])
                .filter(([i1, i2, t]) => 0 < t && t < 1)
                .map(([i1, i2, t]) => [[t, 0, t, j], [1 - t, t, 1 + t, j], [0, 1 - t, 2 + t, j]][i1])
            )
        ).sortBy(([,,s,]) => s).value();
        const tuplePair = _.zip(tuples, tuples.slice(1).concat([tuples[0]]))
          .filter(([[,,,j1], [,,,j2]]) => j1 !== j2)
          .find(([[,,s1,], [,,s2,]]) => ((Number.isInteger(s1) ? s1 + 1 : Math.ceil(s1)) - (Number.isInteger(s2) ? s2 - 1 : Math.floor(s2))) % 3 === 0);
        if (typeof(tuplePair) !== "undefined") {
          const [[,,s1,], [,,,]] = tuplePair;
          tuples.push([[0, 0, 0, null], [1, 0, 1, null], [0, 1, 2, null]][(Number.isInteger(s1) ? s1 + 1 : Math.ceil(s1)) % 3]);
          tuples.sort(([,,s1,], [,,s2,]) => s1 - s2);
        }
        return new Polygon(tuples.map(([t1, t2, s, j]) => new Vector2(t1, t2))).triangulate();
      }).value().map(triangle => triangle.points.map(point => helper1(sortedVertexIndices, sortedPoints, point)));
    }
    function algorithm3(projectedPoints, reverseOffset) {
      const projection = new DirectedLineSegment2D(projectedPoints[0], projectedPoints[1]);
      return _(projection.subtract(subtrahendPolygon)).flatMap(lineSegment => {
        const d1 = lineSegment.p1.subtract(projection.p1).innerProduct(projection.toVector()) / projection.toVector().squaredNorm();
        const d2 = lineSegment.p2.subtract(projection.p1).innerProduct(projection.toVector()) / projection.toVector().squaredNorm();
        const vertexObjects1 = helper2(face.vertexIndices, reverseOffset, d1);
        const vertexObjects2 = helper2(face.vertexIndices, reverseOffset, d2);
        if (vertexObjects1.length === 1) {
          return [[vertexObjects1[0], vertexObjects2[0], vertexObjects2[1]]];
        } else {
          return [
            [vertexObjects1[1], vertexObjects1[0], vertexObjects2[0]],
            [vertexObjects1[1], vertexObjects2[0], vertexObjects2[1]]
          ];
        }
      }).value();
    }
    function algorithm4(projectedPoint) {
      return subtrahendPolygon.contains(projectedPoint) ? [] : [face.vertexIndices.map(i => makeVertexObject([i], [i]))];
    }
    switch (new Set(face.vertexIndices.map(i => model.vertices[i].position.toString())).size) {
      case 3: {
        const projectedPoints = face.vertexIndices.map(i => new Vector2(model.vertices[i].position.x, model.vertices[i].position.z));
        if (!Line3D.through(
          model.vertices[face.vertexIndices[0]].position,
          model.vertices[face.vertexIndices[1]].position
        ).contains(
          model.vertices[face.vertexIndices[2]].position
        )) {
          if (model.vertices[face.vertexIndices[1]].position.subtract(model.vertices[face.vertexIndices[0]].position).crossProduct(
            model.vertices[face.vertexIndices[2]].position.subtract(model.vertices[face.vertexIndices[0]].position)
          ).y !== 0) {
            return algorithm1(projectedPoints);
          } else {
            return algorithm2(projectedPoints);
          }
        } else {
          if (new Set(projectedPoints.map(p => p.toString())).size > 1) {
            return algorithm2(projectedPoints);
          } else {
            return algorithm4(projectedPoints[0]);
          }
        }
      }
      case 2: {
        const points = face.vertexIndices.map(i => model.vertices[i].position);
        let reverseOffset = 3;
        while (!points[1].equals(points[2])) {
          points.push(points.shift());
          --reverseOffset;
        }
        const projectedPoints = points.slice(0, 2).map(p => new Vector2(p.x, p.z));
        if (!projectedPoints[0].equals(projectedPoints[1])) {
          return algorithm3(projectedPoints, reverseOffset);
        } else {
          return algorithm4(projectedPoints[0]);
        }
      }
      case 1: {
        const point = model.vertices[face.vertexIndices[0]].position;
        const projectedPoint = new Vector2(point.x, point.z);
        return algorithm4(projectedPoint);
      }
    }
  },
  calcMetaMaterials(model) {
    return model.materials.reduce((array, material, i) => {
      const firstFaceIndex = array.length === 0 ? 0 : _(_(array).last().faceIndices).last() + 1;
      const faceIndices = _.range(firstFaceIndex, firstFaceIndex + material.faceCount);
      array.push({
        material: material,
        materialIndex: i,
        faceIndices: faceIndices,
        faces: faceIndices.map(i => model.faces[i])
      });
      return array;
    }, []);
  },
  createCombinedVertex(model, metaVertexIndices) {
    const vertexIndices = metaVertexIndices.map(({vertexIndex}) => vertexIndex);
    const vertices = vertexIndices.map(i => model.vertices[i]);
    if (vertices.some(vertex => vertex.weight instanceof PMX.Vertex.Weight.SDEF)) {
      throw new Error(`Combining vertices (${vertexIndices.join(", ")}) failed: SDEF not supported.`);
    }
    const boneIndexSet = new Set(_(vertices).flatMap(vertex => vertex.weight.bones).value().filter(bone => bone.weight > 0).map(bone => bone.index));
    if (boneIndexSet.size > 4) {
      throw new Error(`Combining vertices (${vertexIndices.join(", ")}) failed: combining needs BDEF${boneIndexSet.size}.`);
    }
    let weightMap = new Map(Array.from(boneIndexSet).map(i => [i, 0]));
    for (const {vertexIndex, blendRate} of metaVertexIndices) {
      weightMap = model.vertices[vertexIndex].weight.bones.filter(bone => bone.weight > 0).reduce(
        (map, bone) => map.set(bone.index, map.get(bone.index) + bone.weight * blendRate),
        weightMap
      );
    }
    let weight;
    switch (boneIndexSet.size) {
    case 1:
    case 2:
    case 4:
      weight = new PMX.Vertex.Weight[`BDEF${boneIndexSet.size}`](
        Array.from(weightMap).map(([index, weight]) => ({index: index, weight: weight}))
      );
      break;
    case 3:
      let dummyBoneIndex;
      if (!boneIndexSet.has(0)) {
        dummyBoneIndex = 0;
      } else if (!boneIndexSet.has(1)) {
        dummyBoneIndex = 1;
      } else if (!boneIndexSet.has(2)) {
        dummyBoneIndex = 2;
      } else if (model.bones.length > 3) {
        dummyBoneIndex = 3;
      } else {
        throw new Error(`Combining vertices (${vertexIndices.join(", ")}) failed: could not determine dummy bone index.`);
      }
      weight = new PMX.Vertex.Weight.BDEF4(
        Array.from(weightMap).map(([index, weight]) => ({index: index, weight: weight})).concat([{index: dummyBoneIndex, weight: 0}])
      );
      break;
    }
    function slerp(scalars, blendRates) {
      return _.zip(scalars, blendRates).map(([scalar, blendRate]) => scalar * blendRate).reduce((sum, x) => sum + x);
    }
    function vlerp(vectors, blendRates) {
      return _.zip(vectors, blendRates).map(([vector, blendRate]) => vector.multiply(blendRate)).reduce((sum, v) => sum.add(v));
    }
    const blendRates = metaVertexIndices.map(({blendRate}) => blendRate);
    return new PMX.Vertex(
      vlerp(vertices.map(vertex => vertex.position), blendRates),
      vlerp(vertices.map(vertex => vertex.normal), blendRates).normalize(),
      vlerp(vertices.map(vertex => vertex.uv), blendRates),
      _.zip(...vertices.map(vertex => vertex.extraUVs)).map(uvs => vlerp(uvs.map(uv => new Vector2(uv.x % 1, uv.y % 1)), blendRates)),
      weight,
      slerp(vertices.map(vertex => vertex.edgeSizeRate), blendRates)
    );
  },
  combineVertices(model, metaBaseVertexIndex, metaVertexIndices) {
    metaBaseVertexIndex = Object.assign({}, metaBaseVertexIndex);
    metaVertexIndices = metaVertexIndices.map(metaVertexIndex => Object.assign({}, metaVertexIndex));

    model.vertices[metaBaseVertexIndex.vertexIndex] = this.createCombinedVertex(model, [metaBaseVertexIndex].concat(metaVertexIndices));

    const targetMorphTypes = new Set(["vertex", "uv", "extraUV1", "extraUV2", "extraUV3", "extraUV4"]);
    const vertexInFaceMap = new Map(new Array(model.vertices.length).fill().map((_, i) => [i, []]));
    for (const face of model.faces) {
      for (let i = 0; i < face.vertexIndices.length; i++) {
        vertexInFaceMap.get(face.vertexIndices[i]).push({face: face, order: i});
      }
    }
    const offsetMap = new Map(new Array(model.vertices.length).fill().map((_, i) => [i, []]));
    for (const morph of model.morphs.filter(morph => targetMorphTypes.has(morph.type))) {
      for (const offset of morph.offsets) {
        offsetMap.get(offset.vertexIndex).push(offset);
      }
    }
    function overwriteVertexIndex(from, to) {
      for (const {face, order} of vertexInFaceMap.get(from)) {
        face.vertexIndices[order] = to;
      }
      for (const offset of offsetMap.get(from)) {
        offset.vertexIndex = to;
      }
    }

    for (let i = 0; i < metaVertexIndices.length; i++) {
      overwriteVertexIndex(metaVertexIndices[i].vertexIndex, metaBaseVertexIndex.vertexIndex);
      for (let j = metaVertexIndices[i].vertexIndex; j < model.vertices.length - 1; j++) {
        overwriteVertexIndex(j + 1, j);
      }
      if (metaBaseVertexIndex.vertexIndex > metaVertexIndices[i].vertexIndex) {
        metaBaseVertexIndex.vertexIndex--;
      }
      for (let j = i + 1; j < metaVertexIndices.length; j++) {
        if (metaVertexIndices[j].vertexIndex > metaVertexIndices[i].vertexIndex) {
          metaVertexIndices[j].vertexIndex--;
        }
      }
      model.vertices.splice(metaVertexIndices[i].vertexIndex, 1);
    }
  }
};
