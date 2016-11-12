export default class TextAreaWrapper {
  constructor(textArea) {
    this.textArea = textArea;
  }
  clear() {
    this.textArea.value = "";
  }
  clearAsync() {
    return new Promise((resolve, reject) => {
      this.clear();
      setImmediate(resolve);
    });
  }
  append(message) {
    this.textArea.value += message + "\n";
  }
  appendAsync(message) {
    return new Promise((resolve, reject) => {
      this.append(message);
      setImmediate(resolve);
    });
  }
  update(message) {
    const lines = this.textArea.value.split(/\n/).slice(0, -1);
    if (lines[lines.length - 1] === message) return false;
    this.textArea.value = lines.slice(0, -1).map(line => line + "\n").join("") + message + "\n";
    return true;
  }
  updateAsync(message) {
    return new Promise((resolve, reject) => {
      if (this.update(message)) setImmediate(resolve);
      else resolve();
    });
  }
}
