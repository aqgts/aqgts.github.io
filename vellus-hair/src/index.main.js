import "babel-polyfill";
import PMX from "./pmx";
import PMXUtils from "./pmx-utils";
import BinaryUtils from "./binary-utils";
import Vector2 from "./vector2";
import Vector3 from "./vector3";
import Plane from "./plane";
import Quaternion from "./quaternion";
import MyMath from "./my-math";
import TextAreaWrapper from "./text-area-wrapper";

let modelFile = null;
let log = null;
new Vue({
  el: ".container",
  data: {
    materialsText: "",
    isLoading: true,
    isProcessing: false
  },
  computed: {
  },
  methods: {
    updateModelFile(event) {
      modelFile = event.target.files.length > 0 ? event.target.files[0] : null;
    },
    createModel: async function () {
      this.isProcessing = true;
      try {
        log.clear();

        await log.appendAsync("入力値チェック中...");
        if (modelFile === null) throw new Error("モデルが指定されていません");
        const targetMaterialIndices = this.materialsText.split(/, */).map(v => Number(v));
        if (targetMaterialIndices.some(v => Number.isNaN(v))) throw new Error("産毛を生やす材質に数字でないものが含まれています");

        await log.appendAsync("モデル読み込み中...");
        const model = PMX.read(await BinaryUtils.readBinaryFromFileAsync(modelFile));

        await log.appendAsync("産毛追加中... (0%)");

        const r = 0.000025;
        const l = 0.001;
        const rho = 400000;
        const n = 4;

        const metaMaterials = model.materials.reduce((array, material) => {
          const last = array.length == 0 ? 0 : _(_(array).last().indexRange).last() + 1;
          array.push({
            material: material,
            indexRange: _.range(last, last + material.faceCount)
          });
          return array;
        }, []).map(({material, indexRange}) => ({
          material: material,
          faces: indexRange.map(i => model.faces[i])
        }));
        const originalFaceCount = model.faces.length;
        const targetFaces = _(targetMaterialIndices.map(i => metaMaterials[i])).flatMap(metaMaterial => metaMaterial.faces).value();

        let carryOver = 0;
        for (const [face, rate] of targetFaces.map((face, i) => [face, (i + 1) / targetFaces.length])) {
          const verticePositions = face.vertexIndices.map(i => model.vertices[i].position.multiply(0.08));
          const verticeNormals = face.vertexIndices.map(i => model.vertices[i].normal)
          const S = (() => {
            const a = verticePositions[0].subtract(verticePositions[1]).norm();
            const b = verticePositions[1].subtract(verticePositions[2]).norm();
            const c = verticePositions[2].subtract(verticePositions[0]).norm();
            const s = (a + b + c) / 2;
            return Math.sqrt(s * (s - a) * (s - b) * (s - c));
          })();
          const hairCount = Math.floor(rho * S + carryOver);
          carryOver = rho * S + carryOver - hairCount;
          for (let h = 0; h < hairCount; ++h) {
            let t1 = Math.random();
            let t2 = Math.random();
            if (t1 + t2 > 1) {
              t1 = 1 - t1;
              t2 = 1 - t2;
            }
            const lowerCenter = verticePositions[0]
              .add(verticePositions[1].subtract(verticePositions[0]).multiply(t1))
              .add(verticePositions[2].subtract(verticePositions[0]).multiply(t2));
            const lowerQuaternion = Quaternion.fromToRotation(
              new Vector3(0, 1, 0),
              Plane.through(verticePositions[0], verticePositions[1], verticePositions[2]).normal()
            );
            const upperQuaternion = Quaternion.fromToRotation(
              new Vector3(0, 1, 0),
              verticeNormals[0]
                .add(verticeNormals[1].subtract(verticeNormals[0]).multiply(t1))
                .add(verticeNormals[2].subtract(verticeNormals[0]).multiply(t2))
            );
            const upperCenter = lowerCenter.add(upperQuaternion.rotate(new Vector3(0, l, 0)));
            const vertexIndexOrigin = model.vertices.length;
            for (const [center, quaternion] of [[lowerCenter, lowerQuaternion], [upperCenter, upperQuaternion]]) {
              for (let i = 0; i < n ; ++i) {
                const theta = 2 * Math.PI * i / n;
                const position = center.add(quaternion.rotate(new Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r)));
                model.vertices.push(new PMX.Vertex(
                  position.divide(0.08),
                  position.subtract(center).normalize(),
                  new Vector2(0, 0),
                  [],
                  new PMX.Vertex.Weight.BDEF1([{index: 0, weight: 1}]),
                  0
                ));
              }
            }
            for (let i = 0; i < n; ++i) {
              model.faces.push(
                new PMX.Face([(i + 1) % n, i, n + i].map(j => vertexIndexOrigin + j)),
                new PMX.Face([n + i, n + (i + 1) % n, (i + 1) % n].map(j => vertexIndexOrigin + j))
              );
            }
          }
          await log.updateAsync(`産毛追加中... (${Math.floor(rate * 1000) / 10}%)`);
        }
        model.materials.push(new PMX.Material("産毛", "vellus hair",
          {red: 0.1, green: 0.1, blue: 0.1, alpha: 0.5},
          {red: 1, green: 1, blue: 1, coefficient: 3},
          {red: 0.9, green: 0.9, blue: 0.9},
          false, false, false, false, false,
          {red: 0, green: 0, blue: 0, alpha: 1, size: 0},
          -1, {index: -1, mode: "disabled"}, {isShared: false, index: -1},
          "", model.faces.length - originalFaceCount
        ));

        await log.appendAsync("モデル作成中...");
        const binary = model.write();

        await log.appendAsync("モデルの作成に成功しました");
        BinaryUtils.saveBinaryAsFile(binary, modelFile.name.replace(/\.pmx$/, "_out.pmx"));
      } catch (error) {
        await log.appendAsync(`[Error]${error}`);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    }
  },
  watch: {
  },
  mounted() {
    log = new TextAreaWrapper(document.getElementById("log"));
    this.isLoading = false;
  }
});
