export default {
  readBinaryFromFileAsync(inputFile) {
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
  },
  saveBinaryAsFile(binary, fileName, mime = "application/octet-stream") {
    const blob = new Blob([binary], {type: mime});
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
    } else {
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.setAttribute("href", URL.createObjectURL(blob));
      a.setAttribute("download", fileName);
      a.click();
      document.body.removeChild(a);
    }
  }
};
