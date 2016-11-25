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

{
  let log = null;
  new Vue({
    el: "#panorama360_motion",
    data: {
      x: "0",
      y: "0",
      z: "0",
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
  
          const linearBezier = new BezierCurve(
            new Vector2(0, 0),
            new Vector2(20 / 127, 20 / 127),
            new Vector2(107 / 127, 107 / 127),
            new Vector2(1, 1)
          );

          const motion = new VMD(VMD.CAMERA_MODEL_NAME, {
            bone: [],
            morph: [],
            camera: new Array(6 * 12).fill().map((_, frameNumber) => {
              const yaw = frameNumber % 12 * 30 * Math.PI / 180;
              const pitch = (Math.floor(frameNumber / 12) * 30 - 75) * Math.PI / 180;
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
                60 * Math.PI / 180,
                true
              );
            }),
            light: [],
            selfShadow: [],
            showIK: []
          });
  
          BinaryUtils.saveBinaryAsFile(motion.write(), "camera.vmd");

          log.appendAsync("モーションの作成に成功しました");
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
