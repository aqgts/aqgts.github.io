import "babel-polyfill";
import toBuffer from "typedarray-to-buffer";
import mime from "mime";

let camera;
let scene;
let renderer;
let count = 0;
let cubeCamera1;
let cubeCamera2;
let fov = 45;
let isUserInteracting = false;
let onPointerDownPointerX = 0;
let onPointerDownPointerY = 0;
let lon = 0;
let onPointerDownLon = 0;
let lat = 0;
let onPointerDownLat = 0;
let phi = 0;
let theta = 0;

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

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.addEventListener("dragover", event => {
    event.preventDefault();
  }, false);
  document.documentElement.addEventListener("drop", function eventListener(event) {
    event.preventDefault();
    document.body.removeEventListener("drop", eventListener);

    const inputFile = event.dataTransfer.files[0];
    getBinary(inputFile).then(uint8Array => {
      const buffer = toBuffer(uint8Array);
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(`data:${mime.lookup(inputFile.name)};base64,${buffer.toString("base64")}`, texture => {
        texture.mapping = THREE.UVMapping;
        init(texture);
        animate();
      });
    });
  }, false);
});

function init(texture) {
  camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 1000);
  scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.MeshBasicMaterial({map: texture}));
  mesh.scale.x = -1;
  scene.add(mesh);
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  cubeCamera1 = new THREE.CubeCamera(1, 1000, 256);
  cubeCamera1.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
  scene.add(cubeCamera1);
  cubeCamera2 = new THREE.CubeCamera(1, 1000, 256);
  cubeCamera2.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
  scene.add(cubeCamera2);
  document.body.appendChild(renderer.domElement);

  document.addEventListener("mousedown", onDocumentMouseDown, false);
  document.addEventListener("wheel", onDocumentMouseWheel, false);
  window.addEventListener("resize", onWindowResized, false);
  onWindowResized(null);
}
function onWindowResized(event) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.projectionMatrix.makePerspective(fov, window.innerWidth / window.innerHeight, 1, 1100);
}
function onDocumentMouseDown(event) {
  event.preventDefault();
  onPointerDownPointerX = event.clientX;
  onPointerDownPointerY = event.clientY;
  onPointerDownLon = lon;
  onPointerDownLat = lat;
  document.addEventListener("mousemove", onDocumentMouseMove, false);
  document.addEventListener("mouseup", onDocumentMouseUp, false);
}
function onDocumentMouseMove(event) {
  lon = (event.clientX - onPointerDownPointerX) * 0.1 + onPointerDownLon;
  lat = (event.clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
}
function onDocumentMouseUp(event) {
  document.removeEventListener("mousemove", onDocumentMouseMove, false);
  document.removeEventListener("mouseup", onDocumentMouseUp, false);
}
function onDocumentMouseWheel(event) {
  fov += event.deltaY * 0.05;
  camera.projectionMatrix.makePerspective(fov, window.innerWidth / window.innerHeight, 1, 1100);
}
function animate() {
  requestAnimationFrame(animate);
  render();
}
function render() {
  lat = Math.max(-85, Math.min(85, lat));
  phi = THREE.Math.degToRad(90 - lat);
  theta = THREE.Math.degToRad(lon);
  camera.position.x = 100 * Math.sin(phi) * Math.cos(theta);
  camera.position.y = 100 * Math.cos(phi);
  camera.position.z = 100 * Math.sin(phi) * Math.sin(theta);
  camera.lookAt(scene.position);
  count++;
  renderer.render(scene, camera);
}
