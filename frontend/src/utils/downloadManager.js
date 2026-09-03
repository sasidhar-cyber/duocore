/**
 * DuoCore Download Manager & Offline CacheStorage Library
 * Handles authorized audio downloads, file streams, CacheStorage audio caching,
 * duplicate prevention, and persistent offline track playback.
 */
import api from '../services/api';

const STORAGE_KEY = 'duocore_offline_downloads';
const CACHE_NAME = 'soundwave-offline-audio-v1';
const downloadingIds = new Set();
const listeners = new Set();
const blobUrlCache = new Map();

export function subscribeDownloads(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  const list = getDownloadedTracks();
  listeners.forEach((cb) => {
    try {
      cb(list);
    } catch (e) {}
  });
}

export function getDownloadedTracks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function isTrackDownloaded(trackId) {
  if (!trackId) return false;
  const tracks = getDownloadedTracks();
  return tracks.some((t) => t.id === trackId);
}

export function isTrackDownloading(trackId) {
  return downloadingIds.has(trackId);
}

/**
 * Retrieve an offline blob URL for a cached track if available in CacheStorage
 */
export async function getOfflineAudioUrl(trackId) {
  if (!trackId) return null;
  if (blobUrlCache.has(trackId)) {
    return blobUrlCache.get(trackId);
  }

  if (typeof caches === 'undefined') return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(`/offline-audio/${trackId}`);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(trackId, blobUrl);
      return blobUrl;
    }
  } catch (e) {
    console.warn('[CacheStorage] Read error:', e);
  }

  return null;
}

/**
 * Download track to disk and persist binary into CacheStorage for offline playback
 */
export async function downloadTrack(track, onProgress, quality = '320') {
  if (!track || !track.id) {
    throw new Error('Invalid track data');
  }

  if (downloadingIds.has(track.id)) {
    return { status: 'already_downloading' };
  }

  downloadingIds.add(track.id);
  if (onProgress) onProgress({ status: 'starting', trackId: track.id });

  try {
    const rawName = (track.artist ? `${track.artist} - ` : '') + (track.title || 'Track');
    const filename = rawName.replace(/[/\\?%*:|"<>]/g, '').trim();
    const downloadUrl = api.getMusicDownloadUrl(track.id, filename);

    if (onProgress) onProgress({ status: 'downloading', trackId: track.id });

    // Fetch the audio file stream via direct API
    const response = await fetch(downloadUrl, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Received empty audio file');
    }

    // Cache the response into CacheStorage for true offline playback
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cacheResponse = new Response(blob.slice(0), {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(blob.size),
            'X-Track-Id': track.id,
            'X-Track-Title': encodeURIComponent(track.title || '')
          }
        });
        await cache.put(`/offline-audio/${track.id}`, cacheResponse);
      } catch (cacheErr) {
        console.warn('[CacheStorage] Put error:', cacheErr);
      }
    }

    // Create object URL and trigger browser download save
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${filename}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save track metadata to downloaded offline list
    const existing = getDownloadedTracks();
    const filtered = existing.filter((t) => t.id !== track.id);
    const updated = [
      {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        thumbnail: track.thumbnail || '',
        duration: track.duration || '3:45',
        downloadedAt: new Date().toISOString(),
        fileSize: blob.size,
        quality: quality || '320'
      },
      ...filtered
    ];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    notifyListeners();

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);

    if (onProgress) onProgress({ status: 'completed', trackId: track.id });
    return { success: true, filename: `${filename}.mp3` };
  } catch (err) {
    console.error('[DownloadManager] Error:', err);
    if (onProgress) onProgress({ status: 'error', trackId: track.id, error: err.message });
    throw err;
  } finally {
    downloadingIds.delete(track.id);
  }
}

export async function removeDownloadedTrack(trackId) {
  try {
    const existing = getDownloadedTracks();
    const updated = existing.filter((t) => t.id !== trackId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(`/offline-audio/${trackId}`);
      } catch (e) {}
    }

    if (blobUrlCache.has(trackId)) {
      URL.revokeObjectURL(blobUrlCache.get(trackId));
      blobUrlCache.delete(trackId);
    }

    notifyListeners();
  } catch (e) {}
}

export async function clearDownloadedTracks() {
  try {
    localStorage.removeItem(STORAGE_KEY);

    if (typeof caches !== 'undefined') {
      try {
        await caches.delete(CACHE_NAME);
      } catch (e) {}
    }

    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();

    notifyListeners();
  } catch (e) {}
}
