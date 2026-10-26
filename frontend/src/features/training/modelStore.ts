import * as tf from '@tensorflow/tfjs';
import type { TrainedModelMeta } from '@signbridge/shared';

const ACTIVE_MODEL_STORAGE_KEY = 'signbridge_active_model_id';

export async function saveModelToIndexedDb(
  modelId: string,
  model: tf.LayersModel,
  meta: TrainedModelMeta
): Promise<void> {
  const path = `indexeddb://signbridge_model_${modelId}`;
  await model.save(path);
  localStorage.setItem(`signbridge_meta_${modelId}`, JSON.stringify(meta));
  localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, modelId);
}

export async function loadModelFromIndexedDb(
  modelId: string
): Promise<{ model: tf.LayersModel; meta: TrainedModelMeta | null } | null> {
  const path = `indexeddb://signbridge_model_${modelId}`;
  try {
    const model = await tf.loadLayersModel(path);
    const rawMeta = localStorage.getItem(`signbridge_meta_${modelId}`);
    const meta = rawMeta ? JSON.parse(rawMeta) : null;
    return { model, meta };
  } catch (err) {
    console.warn(`[ModelStore] Model ${modelId} not found in IndexedDB:`, err);
    return null;
  }
}

export function getActiveModelId(): string | null {
  return localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
}

export function setActiveModelId(modelId: string): void {
  localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, modelId);
}

export async function deleteModelFromIndexedDb(modelId: string): Promise<void> {
  const path = `indexeddb://signbridge_model_${modelId}`;
  try {
    await tf.io.removeModel(path);
  } catch {}
  localStorage.removeItem(`signbridge_meta_${modelId}`);
  if (getActiveModelId() === modelId) {
    localStorage.removeItem(ACTIVE_MODEL_STORAGE_KEY);
  }
}
