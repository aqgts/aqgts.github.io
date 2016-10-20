import "./register-global-variables";
import fs from "fs";
import PMX from "./pmx";

describe("PMX", () => {
  it("読み込んだ内容をそのまま書き出すことができる", () => {
    const inputBuffer = fs.readFileSync("spec/Yo_Miku_Ver1.2.1/Yo_Miku_Ver1.2.1_Normal.pmx");
    const inputArrayBuffer = new ArrayBuffer(inputBuffer.length);
    const inputUint8Array = new Uint8Array(inputArrayBuffer);
    for (let i = 0; i < inputBuffer.length; ++i) {
      inputUint8Array[i] = inputBuffer[i];
    }
    const model = PMX.read(inputUint8Array);
    const outputUint8Array = model.write();
    expect(outputUint8Array).toEqual(inputUint8Array);
  });
});
