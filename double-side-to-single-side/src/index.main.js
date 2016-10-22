import "babel-polyfill";
import PMX from "./pmx";

function log(message) {
  return new Promise((resolve, reject) => {
    $("#log").val($("#log").val() + message + "\n");
    setTimeout(resolve, 0);
  });
}

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

const main = async function (inputFile) {
  await log("モデル読み込み中...");
  const binary = await getBinary(inputFile);
  await log("モデル解析中...");
  const model = PMX.read(binary);

  await log("モデル変換中...");

  const faceObjs = model.materials.reduce((array, material) => {
    const last = array.length == 0 ? 0 : _(_(array).last().indexRange).last() + 1;
    array.push({
      material: material,
      indexRange: _.range(last, last + material.faceCount)
    });
    return array;
  }, []).map(faceObj => ({
    material: faceObj.material,
    faces: faceObj.indexRange.map(i => model.faces[i])
  }));

  const vertexIndices = _(faceObjs).filter(faceObj => faceObj.material.isDoubleSided).flatMap(faceObj =>
    _(faceObj.faces).flatMap(face => face.vertexIndices).value()
  ).uniq().value();
  vertexIndices.forEach(vertexIndex => {
    const vertex = model.vertices[vertexIndex];
    model.vertices.push(new PMX.Vertex(
      vertex.position,
      vertex.normal.neg(),
      vertex.uv,
      vertex.extraUVs,
      vertex.weight,
      vertex.edgeSizeRate
    ));
  });
  const vertexIndexMap = new Map(vertexIndices.map((vertexIndex, i) => [vertexIndex, model.vertices.length - vertexIndices.length + i]));

  faceObjs.forEach(faceObj => {
    if (faceObj.material.isDoubleSided) {
      faceObj.material.faceCount *= 2;
      faceObj.material.isDoubleSided = false;
      Array.from(faceObj.faces).forEach(face => {
        faceObj.faces.push(new PMX.Face([
          vertexIndexMap.get(face.vertexIndices[0]),
          vertexIndexMap.get(face.vertexIndices[2]),
          vertexIndexMap.get(face.vertexIndices[1])
        ]));
      });
    }
  });
  model.faces = _.flatMap(faceObjs, faceObj => faceObj.faces);

  model.morphs.forEach(morph => {
    switch (morph.type) {
    case "vertex":
      morph.offsets.filter(offset => vertexIndexMap.has(offset.vertexIndex)).forEach(offset => {
        morph.offsets.push(new PMX.Morph.Offset.Vertex(
          vertexIndexMap.get(offset.vertexIndex),
          offset.displacement
        ));
      });
      break;
    case "uv":
    case "extraUV1":
    case "extraUV2":
    case "extraUV3":
    case "extraUV4":
      morph.offsets.filter(offset => vertexIndexMap.has(offset.vertexIndex)).forEach(offset => {
        morph.offsets.push(new PMX.Morph.Offset.UV(
          vertexIndexMap.get(offset.vertexIndex),
          offset.displacement
        ));
      });
      break;
    }
  });

  await log("モデル書き出し中...");
  return new Blob([model.write()], {type: "application/octet-stream"});
}

$("#run").click(async () => {
  try {
    $("#log").val("");
    const inputFile = $("#inputFile").get(0).files[0];
    const blob = await main(inputFile);
    await log("モデルの変換に成功しました");

    const outputFileName = inputFile.name.replace(/\.pmx$/, "_out.pmx");
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
    await log(`[Error]${error}`)
  }
});

$(() => {
  $("#run").prop("disabled", false);
});
