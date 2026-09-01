/**
 * DuoCore Download Manager & Offline Library Storage
 * Handles authorized audio downloads, file streams, duplicate prevention, and persistent offline track storage.
 */
import api from '../services/api';

const STORAGE_KEY = 'duocore_offline_downloads';
const downloadingIds = new Set();
const listeners = new Set();

export function subscribeDownloads(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  const list = getDownloadedTracks();
  listeners.forEach(cb => {
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
  return tracks.some(t => t.id === trackId);
}

export function isTrackDownloading(trackId) {
  return downloadingIds.has(trackId);
}

export async function downloadTrack(track, onProgress) {
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
    const filtered = existing.filter(t => t.id !== track.id);
    const updated = [
      {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        thumbnail: track.thumbnail || '',
        duration: track.duration || '3:45',
        downloadedAt: new Date().toISOString(),
        fileSize: blob.size
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

export function removeDownloadedTrack(trackId) {
  try {
    const existing = getDownloadedTracks();
    const updated = existing.filter(t => t.id !== trackId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
  } catch (e) {}
}

export function clearDownloadedTracks() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  } catch (e) {}
}
