import "babel-polyfill";
import PMX from "./pmx";
import VMD from "./vmd";
import PMXUtils from "./pmx-utils";
import BinaryUtils from "./binary-utils";
import Vector2 from "./vector2";
import Vector3 from "./vector3";
import Plane from "./plane";
import BezierCurve from "./bezier-curve";
import Quaternion from "./quaternion";
import MyMath from "./my-math";
import TextAreaWrapper from "./text-area-wrapper";

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

{
  let log = null;
  new Vue({
    el: "#panorama360_motion",
    data: {
      x: "0",
      y: "0",
      z: "0",
      unitDegree: "30",
      isLoading: true,
      isProcessing: false
    },
    computed: {
    },
    methods: {
      createMotion: async function () {
        this.isProcessing = true;
        try {
          log.clear();
  
          const unitDegree = Number(this.unitDegree);
          const unitRadian = unitDegree * Math.PI / 180;
          const yawCount = 360 / unitDegree;
          const pitchCount = 180 / unitDegree;
          const angleOfView = (function bisection(min, max) {
            const x = (min + max) / 2;
            if (x === min || x === max) return x;
            const value = Math.sin(x - unitRadian) * Math.cos(x / 2) - 0.3 * Math.cos(x / 2 - unitRadian) * Math.sin(x);
            if (value < 0) return bisection(x, max);
            if (value > 0) return bisection(min, x);
            if (value === 0) return x;
          })(0, Math.PI);
          const linearBezier = new BezierCurve(
            new Vector2(0, 0),
            new Vector2(20 / 127, 20 / 127),
            new Vector2(107 / 127, 107 / 127),
            new Vector2(1, 1)
          );

          const motion = new VMD(VMD.CAMERA_MODEL_NAME, {
            bone: [],
            morph: [],
            camera: new Array(yawCount * pitchCount).fill().map((_, frameNumber) => {
              const yaw = frameNumber % yawCount * unitRadian;
              const pitch = Math.floor(frameNumber / yawCount) * unitRadian - (Math.PI / 2 - unitRadian / 2);
              return new VMD.CameraKeyFrame(
                frameNumber,
                0,
                new Vector3(Number(this.x), Number(this.y), Number(this.z)),
                Quaternion.yxzEuler(yaw, pitch, 0),
                {
                  x: linearBezier,
                  y: linearBezier,
                  z: linearBezier,
                  rotation: linearBezier,
                  distance: linearBezier,
                  angleOfView: linearBezier
                },
                angleOfView,
                true
              );
            }),
            light: [],
            selfShadow: [],
            showIK: []
          });
  
          BinaryUtils.saveBinaryAsFile(motion.write(), "camera.vmd");

          await log.appendAsync("モーションの作成に成功しました");
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
      log = new TextAreaWrapper(document.getElementById("panorama360_motion_log"));
      this.isLoading = false;
    }
  });
}
{
  let log = null;
  let modelFile = null;
  new Vue({
    el: "#fix_daz3d_model_1",
    data: {
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

          const model = PMX.read(await getBinary(modelFile));
          for (const bone of model.bones) {
            bone.position = Quaternion.fromToRotation(new Vector3(0, 0, 1), new Vector3(0, 1, 0)).rotate(bone.position).divide(100);
          }

          const nameMap = new Map([
            ["Genesis3Female", "全ての親"],
            ["abdomenUpper", "上半身"],
            ["neckLower", "首"],
            ["head", "頭"],
            ["lEye", "左目"],
            ["rEye", "右目"],
            ["lShldrBend", "左腕"],
            ["lShldrTwist", "左腕捩"],
            ["lForearmBend", "左ひじ"],
            ["lForearmTwist", "左手捩"],
            ["lHand", "左手首"],
            ["rShldrBend", "右腕"],
            ["rShldrTwist", "右腕捩"],
            ["rForearmBend", "右ひじ"],
            ["rForearmTwist", "右手捩"],
            ["rHand", "右手首"],
            ["lThumb1", "左親指０"],
            ["lThumb2", "左親指１"],
            ["lThumb3", "左親指２"],
            ["lIndex1", "左人指１"],
            ["lIndex2", "左人指２"],
            ["lIndex3", "左人指３"],
            ["lMid1", "左中指１"],
            ["lMid2", "左中指２"],
            ["lMid3", "左中指３"],
            ["lRing1", "左薬指１"],
            ["lRing2", "左薬指２"],
            ["lRing3", "左薬指３"],
            ["lPinky1", "左小指１"],
            ["lPinky2", "左小指２"],
            ["lPinky3", "左小指３"],
            ["rThumb1", "右親指０"],
            ["rThumb2", "右親指１"],
            ["rThumb3", "右親指２"],
            ["rIndex1", "右人指１"],
            ["rIndex2", "右人指２"],
            ["rIndex3", "右人指３"],
            ["rMid1", "右中指１"],
            ["rMid2", "右中指２"],
            ["rMid3", "右中指３"],
            ["rRing1", "右薬指１"],
            ["rRing2", "右薬指２"],
            ["rRing3", "右薬指３"],
            ["rPinky1", "右小指１"],
            ["rPinky2", "右小指２"],
            ["rPinky3", "右小指３"],
            ["pelvis", "下半身"],
            ["lThighBend", "左足"],
            ["lShin", "左ひざ"],
            ["lFoot", "左足首"],
            ["rThighBend", "右足"],
            ["rShin", "右ひざ"],
            ["rFoot", "右足首"],
          ]);
          const boneIndexMap = new Map(model.bones.map((bone, i) => [bone.japaneseName, i]));
          for (const bone of model.bones) {
            if (nameMap.has(bone.japaneseName)) {
              bone.englishName = bone.japaneseName;
              bone.japaneseName = nameMap.get(bone.japaneseName);
            }
          }
          model.displayElementGroups.push(
            new PMX.DisplayElementGroup("Root", "Root", true, [
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("Genesis3Female")),
            ]),
            new PMX.DisplayElementGroup("表情", "Exp", true, []),
            new PMX.DisplayElementGroup("体（上）", "Body[u]", false, [
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("abdomenUpper")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("neckLower")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("head")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lEye")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rEye")),
            ]),
            new PMX.DisplayElementGroup("腕", "Arms", false, [
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lShldrBend")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lShldrTwist")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lForearmBend")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lForearmTwist")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lHand")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rShldrBend")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rShldrTwist")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rForearmBend")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rForearmTwist")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rHand")),
            ]),
            new PMX.DisplayElementGroup("指", "Fingers", false, [
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lThumb1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lThumb2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lThumb3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lIndex1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lIndex2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lIndex3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lMid1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lMid2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lMid3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lRing1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lRing2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lRing3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lPinky1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lPinky2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lPinky3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rThumb1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rThumb2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rThumb3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rIndex1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rIndex2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rIndex3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rMid1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rMid2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rMid3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rRing1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rRing2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rRing3")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rPinky1")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rPinky2")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rPinky3")),
            ]),
            new PMX.DisplayElementGroup("体（下）", "Body[l]", false, [
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("pelvis")),
            ]),
            new PMX.DisplayElementGroup("足", "Legs", false, [
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lThighBend")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lShin")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("lFoot")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rThighBend")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rShin")),
              new PMX.DisplayElementGroup.DisplayElement("bone", boneIndexMap.get("rFoot")),
            ]),
            new PMX.DisplayElementGroup("その他", "Others", false, Array.from(boneIndexMap).filter(([boneName, i]) => !nameMap.has(boneName)).map(([boneName, i]) =>
              new PMX.DisplayElementGroup.DisplayElement("bone", i)
            ))
          );
          BinaryUtils.saveBinaryAsFile(model.write(), modelFile.name.replace(/\.pmx$/, "_out.pmx"));

          await log.appendAsync("モデルの作成に成功しました");
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
      log = new TextAreaWrapper(document.getElementById("fix_daz3d_model_1_log"));
      this.isLoading = false;
    }
  });
}
{
  let log = null;
  let modelFile = null;
  new Vue({
    el: "#fix_daz3d_model_2",
    data: {
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

          const model = PMX.read(await getBinary(modelFile));
          const torsos = PMXUtils.calcMetaMaterials(model).filter(({material}) => material.japaneseName.match(/^Torso/));
          const baseTorso = torsos[0];

          await log.appendAsync("UV座標正規化中...");
          for (const vertex of _(torsos).flatMap(torso => torso.faces).flatMap(face => face.vertexIndices).uniq().map(i => model.vertices[i]).value()) {
            vertex.uv = new Vector2(vertex.uv.x % 1, vertex.uv.y % 1);
          }

          for (const torso of torsos.slice(1)) {
            await log.appendAsync("近接頂点検索中...");
            const baseTorsoVertexIndices = _(baseTorso.faces).flatMap(face => face.vertexIndices).uniq().value();
            const torsoVertexIndices = _(torso.faces).flatMap(face => face.vertexIndices).uniq().value();
            const vertexIndexPairs = _(baseTorsoVertexIndices).flatMap(
              baseTorsoVertexIndex => torsoVertexIndices.map(
                torsoVertexIndex => [baseTorsoVertexIndex, torsoVertexIndex]
              )
            ).filter(
              ([baseTorsoVertexIndex, torsoVertexIndex]) => {
                const baseTorsoVertex = model.vertices[baseTorsoVertexIndex];
                const torsoVertex = model.vertices[torsoVertexIndex];
                return baseTorsoVertex.position.subtract(torsoVertex.position).squaredNorm() <= Math.pow(0.001, 2) &&
                  baseTorsoVertex.uv.subtract(torsoVertex.uv).squaredNorm() <= Math.pow(0.001, 2);
              }
            ).value();

            await log.appendAsync("近接頂点結合中... (0%)");
            for (let i = 0; i < vertexIndexPairs.length; i++) {
              PMXUtils.combineVertices(model, {vertexIndex: vertexIndexPairs[i][0], blendRate: 0.5}, [{vertexIndex: vertexIndexPairs[i][1], blendRate: 0.5}]);
              for (let j = i + 1; j < vertexIndexPairs.length; j++) {
                if (vertexIndexPairs[j][0] > vertexIndexPairs[i][1]) vertexIndexPairs[j][0]--;
                if (vertexIndexPairs[j][1] > vertexIndexPairs[i][1]) vertexIndexPairs[j][1]--;
              }
              await log.updateAsync(`近接頂点結合中... (${Math.floor((i + 1) / vertexIndexPairs.length * 1000) / 10}%)`);
            }
          }

          baseTorso.material.faceCount = torsos.reduce((sum, torso) => sum + torso.material.faceCount, 0);
          for (const torso of torsos.slice(1)) {
            torso.material.faceCount = 0;
          }

          BinaryUtils.saveBinaryAsFile(model.write(), modelFile.name.replace(/\.pmx$/, "_out.pmx"));

          await log.appendAsync("モデルの作成に成功しました");
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
      log = new TextAreaWrapper(document.getElementById("fix_daz3d_model_2_log"));
      this.isLoading = false;
    }
  });
}
