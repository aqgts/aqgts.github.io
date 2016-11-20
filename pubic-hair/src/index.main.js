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

let log = null;
new Vue({
  el: ".container",
  data: {
    n: 5,
    m: 20,
    maxDeg: 45,
    width: 7,
    height: 31,
    red: 0,
    blue: 0,
    green: 0,
    isLoaded: false,
    isProcessing: false
  },
  computed: {
  },
  methods: {
    createModel: async function () {
      this.isProcessing = true;
      try {
        log.clear();

        const n = Number(this.n);
        const m = Number(this.m);
        const maxDeg = Number(this.maxDeg);
        const r0 = 0.00004;
        const l = 0.04;
        const model = PMXUtils.createEmptyModel();
        model.model.japaneseName = "陰毛";
        model.model.englishName = "pubic hair";
        model.model.japaneseComment = "ライセンス: CC0";
        model.model.englishComment = "License: CC0";
        function addHair(positionOrigin) {
          const quaternions = new Array(m).fill().map(() => {
            const theta = Math.random() * Math.PI * 2;
            return Quaternion.angleAxis(Math.random() * maxDeg * Math.PI / 180, new Vector3(Math.cos(theta), 0, Math.sin(theta)));
          }).reduce((arr, q) => {
            arr.push(arr[arr.length - 1].multiply(q));
            return arr;
          }, [Quaternion.identity]);
          const centers = new Array(m).fill().reduce((arr, v, i) => {
            arr.push(arr[arr.length - 1].add(quaternions[i + 1].rotate(new Vector3(0, l / m, 0))));
            return arr;
          }, [positionOrigin]);
          const positions = new Array(n * (m + 1)).fill().map((_, i) => {
            const i1 = Math.floor(i / n);
            const i2 = i % n;
            const y = i1 * (l / m);
            const r = y <= l * 2 / 3 ? r0 : MyMath.lerp(r0, 0, (y / l - 2 / 3) * 3);
            const theta = 2 * Math.PI / n * (i2 + 0.5 * (i1 % 2));
            return centers[i1].add(quaternions[i1].rotate(new Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r))).divide(0.08);
          });
          const normals = new Array(n * (m + 1)).fill().map((_, i) => {
            const i1 = Math.floor(i / n);
            const i2 = i % n;
            const iA = (i1 - 1) * n + [(i2 + n - 1) % n, i2][i1 % 2];
            const iB = (i1 - 1) * n + [i2, (i2 + 1) % n][i1 % 2];
            const iC = i1 * n + (i2 + n - 1) % n;
            const iD = i1 * n + (i2 + 1) % n;
            const iE = (i1 + 1) * n + [(i2 + n - 1) % n, i2][i1 % 2];
            const iF = (i1 + 1) * n + [i2, (i2 + 1) % n][i1 % 2];
            if (i1 === 0) {
              return Plane.through(positions[i], positions[iC], positions[iE]).normal()
                .add(Plane.through(positions[i], positions[iE], positions[iF]).normal())
                .add(Plane.through(positions[iD], positions[i], positions[iF]).normal())
                .normalize();
            } else if (i1 === m - 1) {
              return Plane.through(positions[iA], positions[iC], positions[i]).normal()
                .add(Plane.through(positions[iB], positions[iA], positions[i]).normal())
                .add(Plane.through(positions[iB], positions[i], positions[iD]).normal())
                .add(Plane.through(positions[i], positions[iC], positions[iE]).normal())
                .add(Plane.through(positions[iD], positions[i], positions[iF]).normal())
                .normalize();
            } else if (i1 === m) {
              return Plane.through(positions[iB], positions[iA], positions[i]).normal();
            } else {
              return Plane.through(positions[iA], positions[iC], positions[i]).normal()
                .add(Plane.through(positions[iB], positions[iA], positions[i]).normal())
                .add(Plane.through(positions[iB], positions[i], positions[iD]).normal())
                .add(Plane.through(positions[i], positions[iC], positions[iE]).normal())
                .add(Plane.through(positions[i], positions[iE], positions[iF]).normal())
                .add(Plane.through(positions[iD], positions[i], positions[iF]).normal())
                .normalize();
            }
          });
          const vertexIndexOrigin = model.vertices.length;
          model.vertices.push(...new Array(n * (m + 1)).fill().map((_, i) => {
            return new PMX.Vertex(
              positions[i],
              normals[i],
              new Vector2(0, 0),
              [],
              new PMX.Vertex.Weight.BDEF1([{index: 0, weight: 1}]),
              0
            );
          }));
          model.faces.push(...new Array(2 * n * (m - 1) + n).fill().map((_, i) => {
            const i1 = Math.floor(i / (2 * n));
            const i2 = Math.floor(i % (2 * n) / n);
            const i3 = i % n;
            if ((i1 < m && i2 === 0) || i1 === m) {
              return new PMX.Face([
                i1 * n + (i3 + 1) % n,
                i1 * n + i3,
                (i1 + 1) * n + [i3, (i3 + 1) % n][i1 % 2]
              ].map(j => vertexIndexOrigin + j));
            } else {
              return new PMX.Face([
                i1 * n + i3,
                (i1 + 1) * n + [(i3 + n - 1) % n, i3][i1 % 2],
                (i1 + 1) * n + [i3, (i3 + 1) % n][i1 % 2]
              ].map(j => vertexIndexOrigin + j));
            }
          }));
        }

        await log.appendAsync(`陰毛モデル作成中... (0%)`);
        const width = Number(this.width);
        const height = Number(this.height);
        for (let x = 0; x < width; ++x) {
          for (let z = 0; z < height; ++z) {
            addHair(new Vector3(
              (-10 * (width - 1) / 2 + 10 * x) * 0.08 / 1000,
              0,
              (-10 * (height - 1) / 2 + 10 * z) * 0.08 / 1000
            ));
            const rate = (x * height + z + 1) / (width * height);
            await log.updateAsync(`陰毛モデル作成中... (${Math.floor(rate * 1000) / 10}%)`);
          }
        }
        const red = Number(this.red);
        const blue = Number(this.blue);
        const green = Number(this.green);
        model.materials = [new PMX.Material("材質1", "",
          {red: red * 0.6, green: green * 0.6, blue: blue * 0.6, alpha: 1},
          {red: 1, green: 1, blue: 1, coefficient: 5},
          {red: red * 0.4, green: green * 0.4, blue: blue * 0.4},
          false, true, true, true, false,
          {red: 0, green: 0, blue: 0, alpha: 1, size: 0},
          -1, {index: -1, mode: "disabled"}, {isShared: false, index: -1},
          "", model.faces.length
        )];

        await log.appendAsync("モデルの作成に成功しました");
        BinaryUtils.saveBinaryAsFile(model.write(), "pubic_hair.pmx");
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
    this.isLoaded = true;
  }
});
