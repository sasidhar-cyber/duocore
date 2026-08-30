const express = require('express');
const yts = require('yt-search');
const axios = require('axios');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const LOCAL_BIN_DIR = path.join(__dirname, '../../bin');
const LOCAL_YTDLP = path.join(LOCAL_BIN_DIR, 'yt-dlp');

// Ensure standalone yt-dlp binary is available
function ensureYtDlp() {
  if (!fs.existsSync(LOCAL_YTDLP)) {
    try {
      if (!fs.existsSync(LOCAL_BIN_DIR)) fs.mkdirSync(LOCAL_BIN_DIR, { recursive: true });
      console.log('[Music Engine] Downloading standalone yt-dlp binary for cloud environment...');
      exec(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${LOCAL_YTDLP}" && chmod +x "${LOCAL_YTDLP}"`, (err) => {
        if (!err) console.log('[Music Engine] yt-dlp binary ready.');
      });
    } catch (e) {
      console.warn('[Music Engine] Auto-download yt-dlp failed:', e);
    }
  }
}
ensureYtDlp();

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
async function resolveAudioStreamUrl(idOrQuery) {
  const cached = streamUrlCache.get(idOrQuery);
  if (cached && cached.expireAt > Date.now()) {
    return cached.url;
  }

  let videoId = idOrQuery;
  if (videoId.includes('watch?v=')) {
    videoId = videoId.split('watch?v=')[1].split('&')[0];
  } else if (videoId.includes('youtu.be/')) {
    videoId = videoId.split('youtu.be/')[1].split('?')[0];
  }

  // Strategy 1: JioSaavn Direct High-Speed CDN Stream (Zero Bot Detection, Instant Playback)
  try {
    const songMeta = SPOTIFY_JIOSAAVN_TOP_SONGS.find((s) => s.id === videoId);
    const searchQuery = songMeta ? `${songMeta.title} ${songMeta.artist}` : idOrQuery.replace('query:', '');
    const searchRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_marker=0&query=${encodeURIComponent(searchQuery)}&ctx=web6dot0&_format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 4000
    });
    const song = searchRes.data?.songs?.data?.[0];
    if (song && song.more_info?.vlink) {
      const streamUrl = song.more_info.vlink;
      streamUrlCache.set(idOrQuery, {
        url: streamUrl,
        expireAt: Date.now() + 6 * 60 * 60 * 1000
      });
      return streamUrl;
    }
  } catch (e) {
    console.warn('[Music Stream] Strategy 1 (JioSaavn) fallback:', e.message);
  }

  // Strategy 2: yt-dlp with tvhtml5 and android_creator clients
  try {
    const ytdlpCommand = fs.existsSync('/usr/local/bin/yt-dlp')
      ? '/usr/local/bin/yt-dlp'
      : (fs.existsSync(LOCAL_YTDLP) ? `"${LOCAL_YTDLP}"` : 'yt-dlp');
    let target = idOrQuery;
    if (idOrQuery.startsWith('query:')) {
      const q = idOrQuery.replace('query:', '');
      target = `ytsearch1:${q}`;
    } else if (!idOrQuery.startsWith('http')) {
      target = `https://www.youtube.com/watch?v=${idOrQuery}`;
    }

    const cmd = `${ytdlpCommand} -g -f "ba/b" --extractor-args "youtube:player_client=tvhtml5,android_creator" --geo-bypass --no-warnings "${target}"`;

    const stdout = await new Promise((resolve, reject) => {
      exec(cmd, { timeout: 15000 }, (err, out) => {
        if (err) return reject(err);
        resolve(out);
      });
    });

    const streamUrl = stdout.trim().split('\n')[0];
    if (streamUrl && streamUrl.startsWith('http')) {
      streamUrlCache.set(idOrQuery, {
        url: streamUrl,
        expireAt: Date.now() + 2 * 60 * 60 * 1000
      });
      return streamUrl;
    }
  } catch (err) {
    console.warn('[Music Stream] Strategy 2 (yt-dlp) failed:', err.message);
  }

  // Strategy 3: Invidious Instances Audio Stream
  const invidiousInstances = [
    'https://invidious.nerdvpn.de',
    'https://yt.drgnz.club',
    'https://inv.tux.pizza',
    'https://invidious.jing.rocks'
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await axios.get(`${instance}/api/v1/videos/${videoId}`, { timeout: 4000 });
      const audioFormats = (res.data?.adaptiveFormats || []).filter((f) => f.type && f.type.includes('audio'));
      if (audioFormats.length > 0 && audioFormats[0].url) {
        const streamUrl = audioFormats[0].url;
        streamUrlCache.set(idOrQuery, {
          url: streamUrl,
          expireAt: Date.now() + 2 * 60 * 60 * 1000
        });
        return streamUrl;
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error('Failed to resolve audio stream URL');
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
  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    const resGoogle = await axios.get(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query + ' song')}`, {
      timeout: 3000
    });
    const suggestions = (resGoogle.data?.[1] || [])
      .map((s) => s.replace(/(lyrics|video|full song|audio|hd)/gi, '').trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8);

    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
});

// 3. Trending Music
router.get('/trending', (req, res) => {
  res.json({
    trending: SPOTIFY_JIOSAAVN_TOP_SONGS,
    albums: CURATED_ALBUMS
  });
});

// 4. Audio Streaming Direct CDN Redirect
router.get('/audio-stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).send('Video ID required');

  try {
    const streamUrl = await resolveAudioStreamUrl(videoId);
    return res.redirect(302, streamUrl);
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

    res.json({ message: 'Added to favorites', id, trackId });
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
    res.json({ message: 'Removed from favorites', trackId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

/* ========================================================================= */
/* PLAYLISTS DATABASE CRUD                                                   */
/* ========================================================================= */

// Get User Playlists
router.get('/playlists', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const playlists = db.prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    const enriched = playlists.map((pl) => {
      const songs = db.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY position ASC').all(pl.id);
      return { ...pl, songs, songCount: songs.length };
    });
    res.json({ playlists: enriched });
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
      INSERT INTO playlists (id, user_id, name, description, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, userId, name.trim(), description || '', now, now);

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    res.status(201).json({ message: 'Playlist created', playlist: { ...playlist, songs: [], songCount: 0 } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Add Song to Playlist
router.post('/playlists/:id/songs', requireAuth, (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;
  const { trackId, title, artist, thumbnail, duration, album } = req.body;

  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(playlistId, userId);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const id = 'ps-' + uuidv4().slice(0, 8);
  const countRow = db.prepare('SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?').get(playlistId);
  const position = countRow ? countRow.count : 0;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO playlist_songs (id, playlist_id, track_id, title, artist, thumbnail, duration, album, position, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, playlistId, trackId, title, artist || '', thumbnail || '', duration || '', album || '', position, now);

    res.json({ message: 'Song added to playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

// Delete Playlist
router.delete('/playlists/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;

  try {
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(playlistId);
    db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(playlistId, userId);
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

/* ========================================================================= */
/* LISTENING HISTORY & RECOMMENDATIONS                                       */
/* ========================================================================= */

// Record Listening History
router.post('/history', optionalAuth, (req, res) => {
  const userId = req.user?.id || 'guest';
  const { trackId, title, artist, thumbnail, duration, album, playDurationSeconds = 0 } = req.body;
  if (!trackId || !title) return res.status(400).json({ error: 'Track details required' });

  const id = 'hist-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO listening_history (id, user_id, track_id, title, artist, thumbnail, duration, album, played_at, play_duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, trackId, title, artist || '', thumbnail || '', duration || '', album || '', now, playDurationSeconds);

    res.json({ message: 'History recorded', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record history' });
  }
});

// Get Listening History
router.get('/history', optionalAuth, (req, res) => {
  const userId = req.user?.id || 'guest';
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    const history = db.prepare(`
      SELECT id, track_id as id, title, artist, thumbnail, duration, album, played_at, play_duration_seconds
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

// Get User Music Statistics & Personalized Recommendations
router.get('/stats', optionalAuth, (req, res) => {
  const userId = req.user?.id || 'guest';

  try {
    const totalTracks = db.prepare('SELECT COUNT(*) as count FROM listening_history WHERE user_id = ?').get(userId)?.count || 0;
    const topArtists = db.prepare(`
      SELECT artist, COUNT(*) as count
      FROM listening_history
      WHERE user_id = ? AND artist != ''
      GROUP BY artist
      ORDER BY count DESC
      LIMIT 5
    `).all(userId);

    const totalSeconds = db.prepare('SELECT SUM(play_duration_seconds) as total FROM listening_history WHERE user_id = ?').get(userId)?.total || 0;

    res.json({
      stats: {
        totalSongsPlayed: totalTracks,
        totalListeningMinutes: Math.round(totalSeconds / 60),
        topArtists
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get Dynamic Recommendations
router.get('/recommendations', optionalAuth, async (req, res) => {
  const userId = req.user?.id || 'guest';

  try {
    const topArtistRow = db.prepare(`
      SELECT artist
      FROM listening_history
      WHERE user_id = ? AND artist != ''
      GROUP BY artist
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `).get(userId);

    if (topArtistRow && topArtistRow.artist) {
      const searchRes = await yts(`${topArtistRow.artist} songs`);
      const tracks = (searchRes.videos || []).slice(0, 15).map((v) => ({
        id: v.videoId,
        title: v.title.replace(/(\[.*?\]|\(.*?\))/g, '').trim(),
        artist: v.author?.name || topArtistRow.artist,
        duration: v.timestamp,
        thumbnail: v.thumbnail
      }));
      return res.json({ recommendations: tracks, basedOn: topArtistRow.artist });
    }

    res.json({ recommendations: SPOTIFY_JIOSAAVN_TOP_SONGS.slice(0, 15), basedOn: 'Trending Charts' });
  } catch {
    res.json({ recommendations: SPOTIFY_JIOSAAVN_TOP_SONGS.slice(0, 15), basedOn: 'Trending Charts' });
  }
});

module.exports = router;
