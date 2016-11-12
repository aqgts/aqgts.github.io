import "babel-polyfill";
import PMX from "./pmx";
import PMXUtils from "./pmx-utils";
import Quaternion from "./quaternion";
import DirectedLineSegment2D from "./directed-line-segment-2d";
import Vector2 from "./vector2";
import Vector3 from "./vector3";
import Polygon from "./polygon";
import TextAreaWrapper from "./text-area-wrapper";
import CanvasWrapper from "./canvas-wrapper";

function getBinary(inputFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      resolve(new Uint8Array(event.target.result))
    };
    reader.onerror = error => {
      reject(error);
    };
    reader.readAsArrayBuffer(inputFile);
  });
}

let cityFile = null;
let footprintFile = null;
let firstStepLog = null;
let secondStepLog = null;
let canvasWrapper = null;
new Vue({
  el: ".container",
  data: {
    cityX: "0",
    cityY: "0",
    cityZ: "0",
    cityRx: "0",
    cityRy: "0",
    cityRz: "0",
    footprintX: "0",
    footprintY: "0",
    footprintZ: "0",
    footprintRx: "0",
    footprintRy: "0",
    footprintRz: "0",
    thresholdY: "0",
    color: "",
    crossSectionJSON: "null",
    isLoaded: false,
    isProcessing: false,
    hasBeenCalculated: false
  },
  computed: {
    crossSection: {
      get() {
        if (this.crossSectionJSON === "null") {
          return null;
        } else {
          const {polygons, curves} = JSON.parse(this.crossSectionJSON);
          return {
            polygons: polygons.map(points => new Polygon(points.map(([x, y]) => new Vector2(x, y)))),
            curves: curves.map(lineSegments => lineSegments.map(
              ([[x1, y1], [x2, y2]]) => new DirectedLineSegment2D(new Vector2(x1, y1), new Vector2(x2, y2))
            ))
          };
        }
      },
      set(value) {
        if (value === null) {
          this.crossSectionJSON = "null";
        } else {
          const json = {
            polygons: value.polygons.map(polygon => polygon.points.map(({x, y}) => [x, y])),
            curves: value.curves.map(lineSegments => lineSegments.map(
              ({p1: {x: x1, y: y1}, p2: {x: x2, y: y2}}) => [[x1, y1], [x2, y2]]
            ))
          };
          this.crossSectionJSON = JSON.stringify(json);
        }
      }
    },
    polygonMap() {
      const polygonMap = new Map([[true, []], [false, []]]);
      if (this.crossSection !== null) {
        for (const polygon of this.crossSection.polygons) {
          polygonMap.get(polygon.isClockwise()).push(polygon);
        }
      }
      return polygonMap;
    },
    hasAcceptablePolygons() {
      return this.polygonMap.get(true).length === 1 || this.polygonMap.get(false).length === 1;
    }
  },
  methods: {
    updateCityFile(event) {
      cityFile = event.target.files.length > 0 ? event.target.files[0] : null;
    },
    updateFootprintFile(event) {
      footprintFile = event.target.files.length > 0 ? event.target.files[0] : null;
    },
    calcCrossSection: async function () {
      this.isProcessing = true;
      try {
        firstStepLog.clear();
        secondStepLog.clear();

        await firstStepLog.appendAsync("初期化中...");
        this.crossSection = null;

        await firstStepLog.appendAsync("入力値チェック中...");
        if (cityFile === null) throw new Error("街モデルのファイルが指定されていません。");
        const cityX = Number(this.cityX);
        if (!Number.isFinite(cityX)) throw new Error("街モデルのXの値が数ではありません。");
        const cityY = Number(this.cityY);
        if (!Number.isFinite(cityY)) throw new Error("街モデルのYの値が数ではありません。");
        const cityZ = Number(this.cityZ);
        if (!Number.isFinite(cityZ)) throw new Error("街モデルのZの値が数ではありません。");
        const cityRx = Number(this.cityRx);
        if (!Number.isFinite(cityRx)) throw new Error("街モデルのRxの値が数ではありません。");
        const cityRy = Number(this.cityRy);
        if (!Number.isFinite(cityRy)) throw new Error("街モデルのRyの値が数ではありません。");
        const cityRz = Number(this.cityRz);
        if (!Number.isFinite(cityRz)) throw new Error("街モデルのRzの値が数ではありません。");
        if (footprintFile === null) throw new Error("足跡モデルのファイルが指定されていません。");
        const footprintX = Number(this.footprintX);
        if (!Number.isFinite(footprintX)) throw new Error("足跡モデルのXの値が数ではありません。");
        const footprintY = Number(this.footprintY);
        if (!Number.isFinite(footprintY)) throw new Error("足跡モデルのYの値が数ではありません。");
        const footprintZ = Number(this.footprintZ);
        if (!Number.isFinite(footprintZ)) throw new Error("足跡モデルのZの値が数ではありません。");
        const footprintRx = Number(this.footprintRx);
        if (!Number.isFinite(footprintRx)) throw new Error("足跡モデルのRxの値が数ではありません。");
        const footprintRy = Number(this.footprintRy);
        if (!Number.isFinite(footprintRy)) throw new Error("足跡モデルのRyの値が数ではありません。");
        const footprintRz = Number(this.footprintRz);
        if (!Number.isFinite(footprintRz)) throw new Error("足跡モデルのRzの値が数ではありません。");
        const thresholdY = Number(this.thresholdY);
        if (!Number.isFinite(thresholdY)) throw new Error("断面の高さYの値が数ではありません。");

        const rotationA = Quaternion.yxzEuler(-cityRy * Math.PI / 180, cityRx * Math.PI / 180, cityRz * Math.PI / 180);
        const displacementA = new Vector3(cityX, cityY, cityZ);
        const rotationB = Quaternion.yxzEuler(-footprintRy * Math.PI / 180, footprintRx * Math.PI / 180, footprintRz * Math.PI / 180);
        const displacementB = new Vector3(footprintX, footprintY, footprintZ);

        await firstStepLog.appendAsync("足跡モデル読込中...");
        const footprintModel = PMX.read(await getBinary(footprintFile));

        await firstStepLog.appendAsync("消去領域算出中...");
        this.crossSection = PMXUtils.crossSection(thresholdY, rotationA, displacementA, footprintModel, rotationB, displacementB);

        this.hasBeenCalculated = true;
        await firstStepLog.appendAsync("エラーチェック中...");
        if (!this.hasAcceptablePolygons) {
          throw new Error(`現在、赤線で囲まれた領域は${this.polygonMap.get(true).length}個あり、青線で囲まれた領域は${this.polygonMap.get(false).length}個あります。少なくともどちらかが1個になるように断面の高さYを調整してください。`);
        }

        await firstStepLog.appendAsync("消去領域の算出に成功しました");
        await firstStepLog.appendAsync("次のステップに進んでください");

        if (this.polygonMap.get(true).length === 1 && this.polygonMap.get(false).length === 1) {
          await secondStepLog.appendAsync("赤線で囲まれた領域を消すか青線で囲まれた領域を消すか選択してから、指定領域の消去ボタンを押してください");
        } else if (this.polygonMap.get(true).length === 1 && this.polygonMap.get(false).length !== 1) {
          await secondStepLog.appendAsync("赤線で囲まれた領域を消すので良ければ、このまま指定領域の消去ボタンを押してください");
        } else  if (this.polygonMap.get(true).length !== 1 && this.polygonMap.get(false).length === 1){
          await secondStepLog.appendAsync("青線で囲まれた領域を消すので良ければ、このまま指定領域の消去ボタンを押してください");
        }
      } catch (error) {
        await firstStepLog.appendAsync(`[Error]${error}`);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
    eraseCrossSection: async function () {
      this.isProcessing = true;
      try {
        secondStepLog.clear();

        await secondStepLog.appendAsync("入力値チェック中...");
        if (this.crossSection === null) throw new Error("先に消去領域の算出を行ってください。");
        if (!this.hasAcceptablePolygons) throw new Error("消せる領域がありません。");
        if (cityFile === null) throw new Error("街モデルのファイルが指定されていません。");
        if (this.color === "") throw new Error("赤線で囲まれた領域を消すか青線で囲まれた領域を消すか選択してください。");
        const subtrahendPolygon = this.color === "red" ? this.polygonMap.get(true)[0] : this.polygonMap.get(false)[0].reverse();

        await secondStepLog.appendAsync("街モデル読込中...");
        const cityModel = PMX.read(await getBinary(cityFile));

        await secondStepLog.appendAsync("頂点情報算出中... (0%)");
        const materialObjects = cityModel.materials.reduce((array, material) => {
          const last = array.length == 0 ? 0 : _(_(array).last().indexRange).last() + 1;
          array.push({
            material: material,
            indexRange: _.range(last, last + material.faceCount)
          });
          return array;
        }, []).map(materialObject => ({
          material: materialObject.material,
          startIndex: materialObject.indexRange[0],
          faces: materialObject.indexRange.map(i => cityModel.faces[i]),
          newTriangles: []
        }));
        for (const materialObject of materialObjects) {
          for (const [face, rate] of materialObject.faces.map((face, i) => [face, (materialObject.startIndex + i + 1) / cityModel.faces.length])) {
            materialObject.newTriangles.push(...PMXUtils.subtract(cityModel, face, subtrahendPolygon));
            await secondStepLog.updateAsync(`頂点情報算出中... (${Math.floor(rate * 1000) / 10}%)`);
          }
        }

        await secondStepLog.appendAsync("頂点マッピング算出中...");
        const uniqueVertexObjects = _(materialObjects)
          .flatMap(materialObject => materialObject.newTriangles)
          .flatten()
          .uniqBy(vertexObject => vertexObject.toString())
          .value();
        const vertexIndexMap = new Map(
          uniqueVertexObjects
          .filter(vertexObject => vertexObject.vertexIndices.length === 1)
          .map(vertexObject => vertexObject.vertexIndices[0])
          .sort((x, y) => x - y)
          .map((oldI, newI) => [oldI, newI])
        );
        const vertexObjectMap = new Map(
          uniqueVertexObjects
          .filter(vertexObject => vertexObject.vertexIndices.length === 1)
          .sort((x, y) => x.vertexIndices[0] - y.vertexIndices[0])
          .map((vertexObject, newI) => [vertexObject.toString(), newI])
        );
        for (const vertexObject of uniqueVertexObjects.filter(vertexObject => vertexObject.vertexIndices.length > 1)) {
          vertexObjectMap.set(vertexObject.toString(), vertexObjectMap.size);
        }
        uniqueVertexObjects.sort((x, y) => vertexObjectMap.get(x.toString()) - vertexObjectMap.get(y.toString()));

        await secondStepLog.appendAsync("モデル作成中...");
        cityModel.vertices = uniqueVertexObjects.map(vertexObject => vertexObject.toVertex());
        cityModel.faces = _(materialObjects)
          .flatMap(materialObject => materialObject.newTriangles)
          .value()
          .map(triangle => new PMX.Face(triangle.map(vertexObject => vertexObjectMap.get(vertexObject.toString()))));
        for (const materialObject of materialObjects) {
          materialObject.material.faceCount = materialObject.newTriangles.length;
        }
        for (const morph of cityModel.morphs.filter(morph => new Set("vertex", "uv", "extraUV1", "extraUV2", "extraUV3", "extraUV4").has(morph.type))) {
          const originalOffsetMap = new Map(morph.offsets.map(offset => [offset.vertexIndex, offset.displacement]));
          const offsetClass = morph.type === "vertex" ? PMX.Morph.Offset.Vertex : PMX.Morph.Offset.UV;
          const zeroVector = morph.type === "vertex" ? new Vector3(0, 0, 0) : new Vector4(0, 0, 0, 0);
          morph.offsets = Array.from(originalOffsetMap)
            .filter(([oldI, displacement]) => vertexIndexMap.has(oldI))
            .map(([oldI, displacement]) => new offsetClass(vertexIndexMap.get(oldI), displacement));
          for (const vertexObject of uniqueVertexObjects
            .filter(vertexObject => vertexObject.vertexIndices.length === 2)
            .filter(vertexObject => vertexObject.vertexIndices.some(oldI => originalOffsetMap.has(oldI)))
          ) {
            const v1 = originalOffsetMap.has(vertexObject.vertexIndices[0]) ? originalOffsetMap.get(vertexObject.vertexIndices[0]) : zeroVector;
            const v2 = originalOffsetMap.has(vertexObject.vertexIndices[1]) ? originalOffsetMap.get(vertexObject.vertexIndices[1]) : zeroVector;
            morph.offsets.push(new offsetClass(
              vertexObjectMap.get(vertexObject),
              v1.add(v2.subtract(v1).multiply(vertexObject.t))
            ));
          }
          for (const vertexObject of uniqueVertexObjects
            .filter(vertexObject => vertexObject.vertexIndices.length === 3)
            .filter(vertexObject => vertexObject.vertexIndices.some(oldI => originalOffsetMap.has(oldI)))
          ) {
            const v1 = originalOffsetMap.has(vertexObject.vertexIndices[0]) ? originalOffsetMap.get(vertexObject.vertexIndices[0]) : zeroVector;
            const v2 = originalOffsetMap.has(vertexObject.vertexIndices[1]) ? originalOffsetMap.get(vertexObject.vertexIndices[1]) : zeroVector;
            const v3 = originalOffsetMap.has(vertexObject.vertexIndices[2]) ? originalOffsetMap.get(vertexObject.vertexIndices[2]) : zeroVector;
            morph.offsets.push(new offsetClass(
              vertexObjectMap.get(vertexObject),
              v1.add(v2.subtract(v1).multiply(vertexObject.t1)).add(v3.subtract(v1).multiply(vertexObject.t2))
            ));
          }
        }

        await secondStepLog.appendAsync("モデル書き出し中...");
        const blob = new Blob([cityModel.write()], {type: "application/octet-stream"});

        await secondStepLog.appendAsync("指定領域の消去に成功しました");

        const outputFileName = cityFile.name.replace(/\.pmx$/, "_out.pmx");
        if (navigator.msSaveBlob) {
          navigator.msSaveBlob(blob, outputFileName);
        } else {
          const a = document.createElement("a");
          document.body.appendChild(a);
          a.setAttribute("href", URL.createObjectURL(blob));
          a.setAttribute("download", outputFileName);
          a.click();
          document.body.removeChild(a);
        }
      } catch (error) {
        await secondStepLog.appendAsync(`[Error]${error}`);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    }
  },
  watch: {
    crossSection(newValue, oldValue) {
      canvasWrapper.clear();
      if (newValue !== null) {
        for (const polygon of newValue.polygons) {
          canvasWrapper.savePolygon(polygon, polygon.isClockwise() ? "#ff0000" : "#0000ff");
        }
        for (const lineSegments of newValue.curves) {
          for (const lineSegment of lineSegments) {
            canvasWrapper.saveLineSegment(lineSegment, "#000000");
          }
        }
        canvasWrapper.draw();
      }
    },
    polygonMap(newValue, oldValue) {
      if (newValue.get(true).length === 1 && newValue.get(false).length !== 1) {
        this.color = "red";
      } else if (newValue.get(true).length !== 1 && newValue.get(false).length === 1) {
        this.color = "blue";
      } else {
        this.color = "";
      }
    }
  },
  mounted() {
    firstStepLog = new TextAreaWrapper(document.getElementById("firstStepLog"));
    secondStepLog = new TextAreaWrapper(document.getElementById("secondStepLog"));
    canvasWrapper = new CanvasWrapper(document.getElementById("preview"));
    canvasWrapper.clear();
    this.isLoaded = true;
  }
});
