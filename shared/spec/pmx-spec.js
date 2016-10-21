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
    expect(inputUint8Array.length).toBe(1262210);
    expect(outputUint8Array.length).toBe(1262210);
    expect(() => {
      for (let i = 0; i < 1262210; i++) {
        if (outputUint8Array[i] != inputUint8Array[i]) {
          throw new Error(`${i + 1}バイト目: Expected ${outputUint8Array[i]} to be ${inputUint8Array[i]}`);
        }
      }
    }).not.toThrow();
  });
});
