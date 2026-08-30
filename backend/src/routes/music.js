const express = require('express');
const yts = require('yt-search');
const axios = require('axios');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// In-memory cache for extracted audio stream URLs (videoId -> { url, expireAt })
const streamUrlCache = new Map();

// Blacklist filter to block YouTube Shorts, Reels, TikToks, WhatsApp Status, and Gameplay memes
const REEL_SHORTS_REGEX = /(#shorts|\bshorts\b|\breel\b|\breels\b|\btiktok\b|\bwhatsapp status\b|\bstatus video\b|\b30 sec\b|\b30sec\b|\bstatus\b|\bmeme\b|\bfreefire\b|\bpubg\b|\bgameplay\b|\bvlog\b|\bteaser\b|\btrailer\b|\bgta\b)/i;

// Curated Top Albums & Playlists (Spotify & JioSaavn Style)
const CURATED_ALBUMS = [
  {
    id: 'album-telugu-blockbusters',
    title: 'Spotify Top 50 Telugu',
    artist: 'Pushpa 2, Devara, Guntur Kaaram, Kalki 2898 AD',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
    tracksCount: 20,
    badge: 'Trending #1'
  },
  {
    id: 'album-jiosaavn-hits',
    title: 'JioSaavn Weekly Chartbusters',
    artist: 'Sid Sriram, Anirudh, Arijit Singh, Thaman S',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60',
    tracksCount: 18,
    badge: 'Popular'
  },
  {
    id: 'album-bollywood-love',
    title: 'Bollywood Romantic Melodies',
    artist: 'Arijit Singh, Pritam, Atif Aslam, Shreya Ghoshal',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60',
    tracksCount: 15,
    badge: 'Top Romance'
  },
  {
    id: 'album-global-top50',
    title: 'Spotify Global Top 50',
    artist: 'The Weeknd, Sabrina Carpenter, Billie Eilish, Bruno Mars',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=60',
    tracksCount: 25,
    badge: 'Global Viral'
  }
];

// Top Curated Spotify & JioSaavn Chartbusters with Verified Video IDs & High-Res Artwork
const SPOTIFY_JIOSAAVN_TOP_SONGS = [
  // Telugu Top Hits
  { id: 'EdvydlHCViY', title: 'Pushpa Pushpa', artist: 'Devi Sri Prasad, Mika Singh - Pushpa 2', duration: '4:20', seconds: 260, thumbnail: 'https://i.ytimg.com/vi/EdvydlHCViY/hq720.jpg', category: 'Telugu Hits', album: 'Pushpa 2: The Rule', language: 'Telugu', year: '2024' },
  { id: 'qxbHtcfHq2s', title: 'Sooseki (The Couple Song)', artist: 'Shreya Ghoshal, DSP - Pushpa 2', duration: '4:25', seconds: 265, thumbnail: 'https://i.ytimg.com/vi/qxbHtcfHq2s/hq720.jpg', category: 'Telugu Hits', album: 'Pushpa 2: The Rule', language: 'Telugu', year: '2024' },
  { id: 'u_wB6byrl5k', title: 'Oo Antava Mawa', artist: 'Indravathi Chauhan, DSP - Pushpa', duration: '3:49', seconds: 229, thumbnail: 'https://i.ytimg.com/vi/u_wB6byrl5k/hq720.jpg', category: 'Telugu Hits', album: 'Pushpa: The Rise', language: 'Telugu', year: '2021' },
  { id: 'txHO7PLGE3o', title: 'Srivalli', artist: 'Sid Sriram, DSP - Pushpa', duration: '5:51', seconds: 351, thumbnail: 'https://i.ytimg.com/vi/txHO7PLGE3o/hq720.jpg', category: 'Telugu Hits', album: 'Pushpa: The Rise', language: 'Telugu', year: '2021' },
  { id: 'GWNrPJyRTcA', title: 'Chuttamalle', artist: 'Shilpa Rao, Anirudh - Devara', duration: '3:37', seconds: 217, thumbnail: 'https://i.ytimg.com/vi/GWNrPJyRTcA/hq720.jpg', category: 'Telugu Hits', album: 'Devara: Part 1', language: 'Telugu', year: '2024' },
  { id: 'CKpbdCciELk', title: 'Fear Song', artist: 'Anirudh Ravichander - Devara', duration: '3:17', seconds: 197, thumbnail: 'https://i.ytimg.com/vi/CKpbdCciELk/hq720.jpg', category: 'Telugu Hits', album: 'Devara: Part 1', language: 'Telugu', year: '2024' },
  { id: 'gh3FyLT7WVg', title: 'Kurchi Madathapetti', artist: 'Thaman S, Sri Krishna - Guntur Kaaram', duration: '4:43', seconds: 283, thumbnail: 'https://i.ytimg.com/vi/gh3FyLT7WVg/hq720.jpg', category: 'Telugu Hits', album: 'Guntur Kaaram', language: 'Telugu', year: '2024' },
  { id: '9w20rGRhek0', title: 'Dum Masala', artist: 'Sanjith Hegde, Thaman S - Guntur Kaaram', duration: '3:59', seconds: 239, thumbnail: 'https://i.ytimg.com/vi/9w20rGRhek0/hq720.jpg', category: 'Telugu Hits', album: 'Guntur Kaaram', language: 'Telugu', year: '2024' },
  { id: 'gtw2T55VXQQ', title: 'Ta Takkara', artist: 'Sanjith Hegde, Santhosh Narayanan - Kalki 2898 AD', duration: '4:44', seconds: 284, thumbnail: 'https://i.ytimg.com/vi/gtw2T55VXQQ/hq720.jpg', category: 'Telugu Hits', album: 'Kalki 2898 AD', language: 'Telugu', year: '2024' },
  { id: 'Zz1M1iVEkwM', title: 'Samayama', artist: 'Anurag Kulkarni, Hesham Abdul Wahab - Hi Nanna', duration: '3:21', seconds: 201, thumbnail: 'https://i.ytimg.com/vi/Zz1M1iVEkwM/hq720.jpg', category: 'Telugu Hits', album: 'Hi Nanna', language: 'Telugu', year: '2023' },
  { id: 'dOKQeqGNJwY', title: 'Inthandham', artist: 'Sid Sriram, Vishal Chandrashekhar - Sita Ramam', duration: '4:02', seconds: 242, thumbnail: 'https://i.ytimg.com/vi/dOKQeqGNJwY/hq720.jpg', category: 'Telugu Hits', album: 'Sita Ramam', language: 'Telugu', year: '2022' },
  { id: 'lcfcTbEppQM', title: 'Kalaavathi', artist: 'Sid Sriram, Thaman S - Sarkaru Vaari Paata', duration: '5:07', seconds: 307, thumbnail: 'https://i.ytimg.com/vi/lcfcTbEppQM/hq720.jpg', category: 'Telugu Hits', album: 'Sarkaru Vaari Paata', language: 'Telugu', year: '2022' },
  { id: 'OCg6BWlAXSw', title: 'Samajavaragamana', artist: 'Sid Sriram, Thaman S - Ala Vaikunthapurramuloo', duration: '3:49', seconds: 229, thumbnail: 'https://i.ytimg.com/vi/OCg6BWlAXSw/hq720.jpg', category: 'Telugu Hits', album: 'Ala Vaikunthapurramuloo', language: 'Telugu', year: '2020' },
  { id: '4_eEgJhsBMo', title: 'Naatu Naatu', artist: 'Rahul Sipligunj, Kaala Bhairava - RRR', duration: '4:35', seconds: 275, thumbnail: 'https://i.ytimg.com/vi/4_eEgJhsBMo/hq720.jpg', category: 'Telugu Hits', album: 'RRR', language: 'Telugu', year: '2022' },

  // Bollywood Top Hits
  { id: 'eJ3Ww7c4P98', title: 'Tauba Tauba', artist: 'Karan Aujla - Bad Newz', duration: '3:30', seconds: 210, thumbnail: 'https://i.ytimg.com/vi/eJ3Ww7c4P98/hqdefault.jpg', category: 'Bollywood Hits', album: 'Bad Newz', language: 'Hindi', year: '2024' },
  { id: '8gL46h8yP8Y', title: 'O Maahi', artist: 'Arijit Singh, Pritam - Dunki', duration: '3:53', seconds: 233, thumbnail: 'https://i.ytimg.com/vi/8gL46h8yP8Y/hqdefault.jpg', category: 'Bollywood Hits', album: 'Dunki', language: 'Hindi', year: '2023' },
  { id: 'xL78gq9vY9s', title: 'Satranga', artist: 'Arijit Singh, Shreyas Puranik - Animal', duration: '4:31', seconds: 271, thumbnail: 'https://i.ytimg.com/vi/xL78gq9vY9s/hqdefault.jpg', category: 'Bollywood Hits', album: 'Animal', language: 'Hindi', year: '2023' },
  { id: 'VAdGW7QDJUI', title: 'Chaleya', artist: 'Arijit Singh, Shilpa Rao, Anirudh - Jawan', duration: '3:20', seconds: 200, thumbnail: 'https://i.ytimg.com/vi/VAdGW7QDJUI/hqdefault.jpg', category: 'Bollywood Hits', album: 'Jawan', language: 'Hindi', year: '2023' },
  { id: 'BddP6PYo2gs', title: 'Kesariya', artist: 'Arijit Singh, Pritam - Brahmastra', duration: '4:28', seconds: 268, thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg', category: 'Bollywood Hits', album: 'Brahmastra', language: 'Hindi', year: '2022' },

  // Global Spotify Top Chartbusters
  { id: 'kPa7bsKwL-c', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', duration: '4:11', seconds: 251, thumbnail: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg', category: 'Global Pop', album: 'Die With A Smile', language: 'English', year: '2024' },
  { id: 'eVli-tstM5E', title: 'Espresso', artist: 'Sabrina Carpenter', duration: '2:55', seconds: 175, thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg', category: 'Global Pop', album: 'Short n Sweet', language: 'English', year: '2024' },
  { id: 'V9PVRfjEBTI', title: 'Birds of a Feather', artist: 'Billie Eilish', duration: '3:30', seconds: 210, thumbnail: 'https://i.ytimg.com/vi/V9PVRfjEBTI/hqdefault.jpg', category: 'Global Pop', album: 'HIT ME HARD AND SOFT', language: 'English', year: '2024' },
  { id: '34Na4j8AVgA', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', duration: '3:50', seconds: 230, thumbnail: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg', category: 'Global Pop', album: 'Starboy', language: 'English', year: '2016' },
  { id: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', seconds: 200, thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', category: 'Global Pop', album: 'After Hours', language: 'English', year: '2020' },
  { id: '60ItHLz5WEA', title: 'Faded', artist: 'Alan Walker', duration: '3:32', seconds: 212, thumbnail: 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg', category: 'Global Pop', album: 'Different World', language: 'English', year: '2015' }
];

// Helper to resolve videoId or search query to a live audio stream URL
function resolveAudioStreamUrl(idOrQuery) {
  return new Promise(async (resolve, reject) => {
    const cached = streamUrlCache.get(idOrQuery);
    if (cached && cached.expireAt > Date.now()) {
      return resolve(cached.url);
    }

    let target = idOrQuery;
    if (idOrQuery.startsWith('query:')) {
      const q = idOrQuery.replace('query:', '');
      target = `ytsearch1:${q}`;
    } else if (!idOrQuery.startsWith('http')) {
      target = `https://www.youtube.com/watch?v=${idOrQuery}`;
    }

    exec(`python3 -m yt_dlp --js-runtimes node -g -f "ba/b" "${target}"`, { timeout: 18000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Music Stream] yt-dlp resolution error:', err.message);
        if (!idOrQuery.startsWith('query:')) {
          return resolveAudioStreamUrl(`query:${idOrQuery} song audio`).then(resolve).catch(reject);
        }
        return reject(new Error('Failed to resolve audio stream'));
      }

      const streamUrl = stdout.trim().split('\n')[0];
      if (!streamUrl || !streamUrl.startsWith('http')) {
        return reject(new Error('Invalid stream URL extracted'));
      }

      streamUrlCache.set(idOrQuery, {
        url: streamUrl,
        expireAt: Date.now() + 2 * 60 * 60 * 1000
      });

      resolve(streamUrl);
    });
  });
}

// 1. Advanced Search with Filters & Categories
router.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const language = String(req.query.language || '').trim();
  const year = String(req.query.year || '').trim();
  const category = String(req.query.category || '').trim();

  if (!query && !language && !year && !category) {
    return res.json({ results: SPOTIFY_JIOSAAVN_TOP_SONGS, albums: CURATED_ALBUMS });
  }

  try {
    let searchTerms = [query];
    if (language) searchTerms.push(language);
    if (year) searchTerms.push(year);
    if (category && category !== 'All') searchTerms.push(category);

    const fullQuery = searchTerms.filter(Boolean).join(' ');
    const enhancedQuery = fullQuery.toLowerCase().includes('song') || fullQuery.toLowerCase().includes('audio')
      ? fullQuery
      : `${fullQuery} song`;

    const searchRes = await yts(enhancedQuery);
    const rawVideos = searchRes.videos || [];

    const musicTracks = rawVideos
      .filter((v) => {
        const isDurationValid = v.seconds >= 70 && v.seconds <= 720;
        const isNotReel = !REEL_SHORTS_REGEX.test(v.title) && !REEL_SHORTS_REGEX.test(v.description || '');
        return isDurationValid && isNotReel;
      })
      .slice(0, 30)
      .map((v) => ({
        id: v.videoId,
        title: v.title.replace(/(\[.*?\]|\(.*?\))/g, '').replace(/(official video|lyrics|audio|video|remix|hd|4k|full song)/gi, '').trim(),
        fullTitle: v.title,
        artist: v.author?.name?.replace(/ - Topic|VEVO/gi, '').trim() || 'Official Artist',
        duration: v.timestamp || `${Math.floor(v.seconds / 60)}:${(v.seconds % 60).toString().padStart(2, '0')}`,
        seconds: v.seconds,
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        views: v.views,
        ago: v.ago
      }));

    res.json({ results: musicTracks, albums: CURATED_ALBUMS });
  } catch (err) {
    console.error('[Music Search] Error:', err);
    res.status(500).json({ error: 'Search failed', results: [] });
  }
});

// 2. Search Suggestions (Auto-complete)
router.get('/suggestions', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ suggestions: ['Pushpa 2', 'Devara', 'Guntur Kaaram', 'Arijit Singh', 'Sid Sriram', 'Anirudh', 'Taylor Swift', 'The Weeknd'] });
  }

  try {
    const searchRes = await yts(query);
    const top = (searchRes.videos || [])
      .slice(0, 6)
      .map(v => v.title.replace(/(\[.*?\]|\(.*?\))/g, '').trim())
      .filter(Boolean);
    res.json({ suggestions: Array.from(new Set(top)) });
  } catch {
    res.json({ suggestions: [] });
  }
});

// 3. Get Trending Songs & Curated Albums
router.get('/trending', (req, res) => {
  res.json({ trending: SPOTIFY_JIOSAAVN_TOP_SONGS, albums: CURATED_ALBUMS });
});

// 4. Audio Streaming Proxy with HTTP Range Support
router.get('/audio-stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).send('Video ID required');

  try {
    const streamUrl = await resolveAudioStreamUrl(videoId);

    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await axios({
      method: 'GET',
      url: streamUrl,
      responseType: 'stream',
      headers,
      timeout: 15000
    });

    res.status(response.status);
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');

    response.data.pipe(res);
  } catch (err) {
    console.error('[Audio Stream Proxy] Error:', err.message);
    res.status(500).send('Streaming error: ' + err.message);
  }
});

// 5. Get Stream URL endpoint
router.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });
  const proxyStreamUrl = `/api/music/audio-stream/${encodeURIComponent(videoId)}`;
  res.json({ streamUrl: proxyStreamUrl, videoId });
});

// 6. Download Song as MP3
router.get('/download/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const title = (req.query.title || 'song').replace(/[^a-zA-Z0-9 _-]/g, '');

  if (!videoId) return res.status(400).send('Video ID required');

  try {
    const streamUrl = await resolveAudioStreamUrl(videoId);

    const response = await axios({
      method: 'GET',
      url: streamUrl,
      responseType: 'stream'
    });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  } catch (err) {
    console.error('[Download] Error:', err.message);
    res.status(500).send('Download failed: ' + err.message);
  }
});

// 7. Synchronized & Plain Lyrics (LRCLIB Integration)
router.get('/lyrics', async (req, res) => {
  const track = String(req.query.track || '').trim();
  const artist = String(req.query.artist || '').trim();

  if (!track) {
    return res.json({ lyrics: null, syncedLyrics: null });
  }

  const cleanTrack = track
    .replace(/(\[.*?\]|\(.*?\))/g, '')
    .replace(/(official video|lyrics|audio|video|remix|hd|full song)/gi, '')
    .trim();

  try {
    const response = await axios.get('https://lrclib.net/api/get', {
      params: {
        track_name: cleanTrack,
        artist_name: artist || undefined
      },
      timeout: 5000
    });

    if (response.data) {
      return res.json({
        plainLyrics: response.data.plainLyrics,
        syncedLyrics: response.data.syncedLyrics,
        trackName: response.data.trackName,
        artistName: response.data.artistName
      });
    }
  } catch (err) {
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: { q: cleanTrack },
        timeout: 5000
      });
      if (searchRes.data && searchRes.data.length > 0) {
        const best = searchRes.data[0];
        return res.json({
          plainLyrics: best.plainLyrics,
          syncedLyrics: best.syncedLyrics,
          trackName: best.trackName,
          artistName: best.artistName
        });
      }
    } catch (searchErr) {}
  }

  res.json({
    plainLyrics: `🎵 ${track}\n\nEnjoy high fidelity audio on SoundWave!`,
    syncedLyrics: null
  });
});

/* ========================================================================= */
/* FAVORITES DATABASE CRUD                                                   */
/* ========================================================================= */

// Get User Favorites
router.get('/favorites', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const rows = db.prepare('SELECT track_id as id, title, artist, thumbnail, duration, album, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json({ favorites: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorites', favorites: [] });
  }
});

// Add Favorite
router.post('/favorites', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { trackId, title, artist, thumbnail, duration, album } = req.body;
  if (!trackId || !title) return res.status(400).json({ error: 'Track details required' });

  const id = 'fav-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO favorites (id, user_id, track_id, title, artist, thumbnail, duration, album, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, trackId, title, artist || '', thumbnail || '', duration || '', album || '', now);

    res.json({ success: true, message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove Favorite
router.delete('/favorites/:trackId', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { trackId } = req.params;

  try {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND track_id = ?').run(userId, trackId);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

/* ========================================================================= */
/* PLAYLISTS DATABASE CRUD                                                   */
/* ========================================================================= */

// Get all playlists
router.get('/playlists', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const playlists = db.prepare(`
      SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) as track_count
      FROM playlists p
      WHERE p.user_id = ?
      ORDER BY p.updated_at DESC
    `).all(userId);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlists', playlists: [] });
  }
});

// Create Playlist
router.post('/playlists', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name is required' });

  const id = 'pl-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO playlists (id, user_id, name, description, cover_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, '', ?, ?)
    `).run(id, userId, name.trim(), description || '', now, now);

    const created = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    res.status(201).json({ playlist: created, message: 'Playlist created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Get Single Playlist with Tracks
router.get('/playlists/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(id, userId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const tracks = db.prepare(`
      SELECT track_id as id, title, artist, thumbnail, duration, album, position, added_at
      FROM playlist_songs
      WHERE playlist_id = ?
      ORDER BY position ASC, added_at ASC
    `).all(id);

    res.json({ playlist, tracks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlist details' });
  }
});

// Update / Rename Playlist
router.put('/playlists/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name required' });

  const now = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE playlists SET name = ?, description = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(name.trim(), description || '', now, id, userId);

    res.json({ success: true, message: 'Playlist updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete Playlist
router.delete('/playlists/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add Song to Playlist
router.post('/playlists/:id/songs', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { id: playlistId } = req.params;
  const { trackId, title, artist, thumbnail, duration, album } = req.body;
  if (!trackId || !title) return res.status(400).json({ error: 'Track details required' });

  const playlist = db.prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?').get(playlistId, userId);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const songId = 'pls-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    const maxPos = db.prepare('SELECT MAX(position) as max_pos FROM playlist_songs WHERE playlist_id = ?').get(playlistId);
    const nextPos = (maxPos?.max_pos ?? -1) + 1;

    db.prepare(`
      INSERT OR REPLACE INTO playlist_songs (id, playlist_id, track_id, title, artist, thumbnail, duration, album, position, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(songId, playlistId, trackId, title, artist || '', thumbnail || '', duration || '', album || '', nextPos, now);

    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now, playlistId);

    res.json({ success: true, message: 'Track added to playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
});

// Remove Song from Playlist
router.delete('/playlists/:id/songs/:trackId', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { id: playlistId, trackId } = req.params;

  const playlist = db.prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?').get(playlistId, userId);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  try {
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND track_id = ?').run(playlistId, trackId);
    res.json({ success: true, message: 'Track removed from playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
});

/* ========================================================================= */
/* LISTENING HISTORY & STATS                                                 */
/* ========================================================================= */

// Record Track Played
router.post('/history', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { trackId, title, artist, thumbnail, duration, album, playDurationSeconds } = req.body;
  if (!trackId || !title) return res.status(400).json({ error: 'Track details required' });

  const id = 'lh-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO listening_history (id, user_id, track_id, title, artist, thumbnail, duration, album, played_at, play_duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, trackId, title, artist || '', thumbnail || '', duration || '', album || '', now, Number(playDurationSeconds || 0));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record history' });
  }
});

// Get Listening History
router.get('/history', requireAuth, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.query.limit || 50), 100);

  try {
    const history = db.prepare(`
      SELECT id, track_id as trackId, title, artist, thumbnail, duration, album, played_at, play_duration_seconds
      FROM listening_history
      WHERE user_id = ?
      ORDER BY played_at DESC
      LIMIT ?
    `).all(userId, limit);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', history: [] });
  }
});

// Clear Listening History
router.delete('/history', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    db.prepare('DELETE FROM listening_history WHERE user_id = ?').run(userId);
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Delete Single History Item
router.delete('/history/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM listening_history WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true, message: 'Item removed from history' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove history item' });
  }
});

// Get Listening Statistics Dashboard
router.get('/stats', requireAuth, (req, res) => {
  const userId = req.user.id;

  try {
    const totalPlays = db.prepare('SELECT COUNT(*) as count FROM listening_history WHERE user_id = ?').get(userId).count;
    const totalSeconds = db.prepare('SELECT COALESCE(SUM(play_duration_seconds), 0) as total FROM listening_history WHERE user_id = ?').get(userId).total;

    const topTracks = db.prepare(`
      SELECT track_id, title, artist, thumbnail, COUNT(*) as play_count
      FROM listening_history
      WHERE user_id = ?
      GROUP BY track_id
      ORDER BY play_count DESC
      LIMIT 5
    `).all(userId);

    const topArtists = db.prepare(`
      SELECT artist, COUNT(*) as play_count
      FROM listening_history
      WHERE user_id = ? AND artist != ''
      GROUP BY artist
      ORDER BY play_count DESC
      LIMIT 5
    `).all(userId);

    res.json({
      totalPlays,
      totalMinutes: Math.round(totalSeconds / 60),
      topTracks,
      topArtists
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Rule-Based Smart Recommendations Engine
router.get('/recommendations', optionalAuth, async (req, res) => {
  const userId = req.user?.id;

  let topArtists = [];
  if (userId) {
    try {
      topArtists = db.prepare(`
        SELECT artist FROM listening_history
        WHERE user_id = ? AND artist != ''
        GROUP BY artist
        ORDER BY COUNT(*) DESC
        LIMIT 3
      `).all(userId).map(r => r.artist);
    } catch {}
  }

  // Combine top preset chartbusters and artist-based recommendations
  let recs = [...SPOTIFY_JIOSAAVN_TOP_SONGS];
  if (topArtists.length > 0) {
    recs = recs.sort((a, b) => {
      const matchA = topArtists.some(art => a.artist.toLowerCase().includes(art.toLowerCase()));
      const matchB = topArtists.some(art => b.artist.toLowerCase().includes(art.toLowerCase()));
      return matchB - matchA;
    });
  }

  res.json({
    recommendedForYou: recs.slice(0, 10),
    becauseYouListenedTo: topArtists.length > 0 ? { artist: topArtists[0], tracks: recs.filter(t => t.artist.toLowerCase().includes(topArtists[0].toLowerCase())).slice(0, 6) } : null,
    albums: CURATED_ALBUMS
  });
});

module.exports = router;
