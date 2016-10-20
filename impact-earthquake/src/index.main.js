import "babel-polyfill";
import VMD from "./vmd";
import Vector2 from "./vector2";
import Vector3 from "./vector3";
import Quaternion from "./quaternion";
import BezierCurve from "./bezier-curve";
import EarthquakeBuilder from "./earthquake-builder";

function log(message) {
  return new Promise((resolve, reject) => {
    $("#log").val($("#log").val() + message + "\n");
    setTimeout(resolve, 0);
  });
}

const getMotion = async function (fps, time, modelName, boneName, infoPieces, period, halfLife) {
  const earthquake = EarthquakeBuilder.create(infoPieces, period, halfLife);
  const linearBezier = new BezierCurve(new Vector2(0, 0), new Vector2(20 / 127, 20 / 127), new Vector2(107 / 127, 107 / 127), new Vector2(1, 1));

  await log("モーション生成中...");
  return new VMD(modelName, {
    bone: new Map([[boneName, _.range(0, Math.ceil(fps * time)).map(i => new VMD.BoneKeyFrame(
      boneName,
      i,
      new Vector3(
        earthquake.x.displacement(i / fps) / 0.08,
        earthquake.y.displacement(i / fps) / 0.08,
        earthquake.z.displacement(i / fps) / 0.08
      ),
      Quaternion.identity,
      {
        x: linearBezier,
        y: linearBezier,
        z: linearBezier,
        rotation: linearBezier
      }
    ))]]),
    morph: [],
    camera: [],
    light: [],
    selfShadow: [],
    showIK: []
  });
};

$("#run").click(async () => {
  try {
    $("#log").val("");
    const context = $("#view").get(0).getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, $("#view").width(), $("#view").height());

    const fps = Number($("#fps").val());
    if (isNaN(fps)) throw new Error("FPSの値が数字ではありません");
    const time = Number($("#time").val());
    if (isNaN(time)) throw new Error("モーション生成秒数の値が数字ではありません");
    const modelName = $("#modelName").val();
    const boneName = $("#boneName").val();
    const offsets = $("#offsets").val().split(/, */).map(v => Number(v));
    if (offsets.some(v => isNaN(v))) throw new Error("地震の発生開始時刻の値に数字でないものが含まれています");
    const amplitudes = $("#amplitudes").val().split(/, */).map(v => Number(v));
    if (amplitudes.some(v => isNaN(v))) throw new Error("振幅パラメータの値に数字でないものが含まれています");
    if (offsets.length != amplitudes.length) throw new Error("地震の発生開始時刻と振幅パラメータのカンマの数は一致させてください");
    const infoPieces = _.range(offsets.length).map(i => ({
      offset: offsets[i],
      amplitude: amplitudes[i]
    }));
    const period = Number($("#period").val());
    if (isNaN(period)) throw new Error("揺れの周期の値が数字ではありません");
    const halfLife = Number($("#halfLife").val());
    if (isNaN(halfLife)) throw new Error("揺れの半減期の値が数字ではありません");

    const motion = await getMotion(fps, time, modelName, boneName, infoPieces, period, halfLife);

    await log("モーション書き出し中...");
    const blob = new Blob([motion.write()], {type: "application/octet-stream"});

    await log("モーションデータの生成に成功しました");

    context.strokeStyle = "#ff0000";
    context.lineWidth = 0.5;
    const displacements = motion.keyFrames.bone.get(boneName).map(keyFrame => keyFrame.position.y);
    function transform(i, displacement) {
      const x = (i / fps) * ($("#view").width() / 10);
      const y = -(displacement * 0.08) * (($("#view").height() / 2) / 0.2) + $("#view").height() / 2;
      return [x, y];
    }
    if (displacements.length > 0) {
      context.beginPath();
      context.moveTo(...transform(0, displacements[0]));
      displacements.slice(1).forEach((displacement, i) => {
        context.lineTo(...transform(i, displacement));
      });
      context.stroke();
    }

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, "earthquake.vmd");
    } else {
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.setAttribute("href", URL.createObjectURL(blob));
      a.setAttribute("download", "earthquake.vmd");
      a.click();
      document.body.removeChild(a);
    }
  } catch (error) {
    await log(`[Error]${error}`)
  }
});

$(() => {
  $("#run").prop("disabled", false);
  const context = $("#view").get(0).getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, $("#view").width(), $("#view").height());
});
