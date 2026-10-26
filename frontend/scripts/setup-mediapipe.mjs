import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const publicModelsDir = path.join(frontendDir, 'public', 'models');
const publicWasmDir = path.join(frontendDir, 'public', 'wasm');
const gestureModelPath = path.join(publicModelsDir, 'gesture_recognizer.task');
const faceModelPath = path.join(publicModelsDir, 'face_landmarker.task');

const GESTURE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000000) {
      console.log(`[setup-mediapipe] Model already exists at: ${dest} (${(fs.statSync(dest).size / (1024 * 1024)).toFixed(2)} MB)`);
      return resolve();
    }
    console.log(`[setup-mediapipe] Downloading model from:\n  ${url}\n  to ${dest}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download model: HTTP status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`[setup-mediapipe] Downloaded successfully (${(fs.statSync(dest).size / (1024 * 1024)).toFixed(2)} MB).`);
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function copyWasmFiles() {
  const candidatePaths = [
    path.join(frontendDir, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
    path.join(frontendDir, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
  ];

  let foundPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath) {
    console.warn('[setup-mediapipe] Note: @mediapipe/tasks-vision/wasm not yet found.');
    return;
  }

  ensureDir(publicWasmDir);
  const files = fs.readdirSync(foundPath);
  console.log(`[setup-mediapipe] Copying ${files.length} WASM assets from ${foundPath} to ${publicWasmDir}...`);
  for (const file of files) {
    fs.copyFileSync(path.join(foundPath, file), path.join(publicWasmDir, file));
  }
  console.log('[setup-mediapipe] WASM files copied successfully.');
}

async function run() {
  try {
    ensureDir(publicModelsDir);
    ensureDir(publicWasmDir);
    await downloadFile(GESTURE_MODEL_URL, gestureModelPath);
    try {
      await downloadFile(FACE_MODEL_URL, faceModelPath);
    } catch (faceErr) {
      console.warn('[setup-mediapipe] Face model download skipped or failed (optional feature):', faceErr.message);
    }
    copyWasmFiles();
    console.log('[setup-mediapipe] MediaPipe setup complete.');
  } catch (error) {
    console.error('[setup-mediapipe] Error during setup:', error);
    process.exit(1);
  }
}

run();
