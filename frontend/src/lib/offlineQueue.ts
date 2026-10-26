import type { HistoryRecord } from '@signbridge/shared';

const OFFLINE_QUEUE_KEY = 'signbridge_offline_history_queue';

export function getOfflineQueue(): Array<Omit<HistoryRecord, 'id' | 'createdAt'>> {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineRecord(record: Omit<HistoryRecord, 'id' | 'createdAt'>): void {
  try {
    const queue = getOfflineQueue();
    queue.push(record);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] Failed to queue record:', e);
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {}
}
