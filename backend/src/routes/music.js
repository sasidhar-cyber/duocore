const express = require('express');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const LOCAL_BIN_DIR = path.join(__dirname, '../../bin');
const LOCAL_YTDLP = path.join(LOCAL_BIN_DIR, 'yt-dlp');

// JioSaavn API headers
const JIOSAAVN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Stream URL cache (5 minutes TTL)
const streamUrlCache = new Map();

// Decrypt JioSaavn encrypted media URLs
function decryptSaavnMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const rawUrl = decrypted.toString(CryptoJS.enc.Utf8);
    if (!rawUrl || !rawUrl.startsWith('http')) return null;
    // Upgrade to 320kbps quality
    return rawUrl.replace(/_96\.(mp4|m4a)/, '_320.mp4').replace(/_160\.(mp4|m4a)/, '_320.mp4');
  } catch (e) {
    console.error('[JioSaavn] Decryption error:', e.message);
    return null;
  }
}

// Clean and upscale image URLs
function cleanImage(img) {
  if (!img || typeof img !== 'string') return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
  if (img.includes('default-music') || img.includes('default-film') || img.includes('default_artist') || img.includes('artist-default')) {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
  }
  return img.replace(/50x50|150x150/, '500x500').replace(/^http:\/\//i, 'https://');
}

// Format duration from seconds to MM:SS
function formatDuration(sec) {
  if (!sec) return '3:30';
  const s = parseInt(sec, 10);
  if (isNaN(s)) return '3:30';
  const mins = Math.floor(s / 60);
  const remSec = s % 60;
  return `${mins}:${remSec < 10 ? '0' : ''}${remSec}`;
}

// HTML entity decode
function htmlDecode(str) {
  if (!str) return '';
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Normalize JioSaavn song item to unified format
function normalizeSong(item) {
  const moreInfo = item.more_info || {};
  const streamUrl = decryptSaavnMediaUrl(item.encrypted_media_url || moreInfo.encrypted_media_url);

  return {
    id: item.id || item.song_id || item.perma_url,
    title: htmlDecode(item.song || item.title || 'Unknown Title'),
    artist: htmlDecode(item.singers || item.primary_artists || moreInfo.singers || moreInfo.primary_artists || 'Unknown Artist'),
    album: htmlDecode(item.album || moreInfo.album || 'Single'),
    albumId: item.albumid || moreInfo.album_id,
    duration: formatDuration(item.duration || moreInfo.duration),
    seconds: parseInt(item.duration || moreInfo.duration || 210, 10),
    thumbnail: cleanImage(item.image),
    audioUrl: streamUrl,
    encryptedUrl: item.encrypted_media_url || moreInfo.encrypted_media_url,
    year: item.year || moreInfo.year || new Date().getFullYear().toString(),
    language: item.language || moreInfo.language || 'Unknown',
    playCount: item.play_count || moreInfo.play_count,
    explicit: item.explicit_content === 1 || item.explicit_content === '1',
    hasLyrics: item.has_lyrics === 'true' || item.has_lyrics === true,
    permaUrl: item.perma_url || item.url
  };
}

// Normalize album item
function normalizeAlbum(item) {
  const moreInfo = item.more_info || {};

  return {
    id: item.id || item.albumid,
    title: htmlDecode(item.title || item.name || 'Unknown Album'),
    artist: typeof item.artist === 'string' ? htmlDecode(item.artist) : (item.music || item.description || 'Various Artists'),
    year: item.year || moreInfo.year || new Date().getFullYear().toString(),
    cover: cleanImage(item.image),
    tracksCount: moreInfo.song_pids ? moreInfo.song_pids.split(',').length : (item.songCount || item.song_count || 6),
    badge: 'ALBUM 💿',
    language: item.language || moreInfo.language || 'Unknown',
    type: item.type || 'album',
    permaUrl: item.perma_url || item.url
  };
}

// Normalize artist item
function normalizeArtist(item) {
  return {
    id: item.artistid || item.id,
    name: htmlDecode(item.name || item.title || 'Unknown Artist'),
    role: item.description || item.extra || item.subtitle || 'Artist',
    image: cleanImage(item.image),
    cover: cleanImage(item.image),
    listeners: item.follower_count || item.fan_count || '1M+',
    isVerified: item.isVerified || false,
    type: item.type || 'artist',
    permaUrl: item.perma_url || item.url
  };
}

// ===========================
// 1. SEARCH - Main Search API
// ===========================
router.get('/search', async (req, res) => {
  const query = String(req.query.q || req.query.query || '').trim();

  if (!query) {
    return res.json({
      topResult: null,
      songs: [],
      albums: [],
      artists: [],
      playlists: [],
      total: 0
    });
  }

  try {
    // Parallel fetch: songs, autocomplete (for top result + structured data), albums, artists
    const [songsRes, autoRes, albumsRes, artistsRes] = await Promise.allSettled([
      axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&p=1&n=20`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 8000
      }),
      axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 8000
      }),
      axios.get(`https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&p=1&n=8`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 8000
      }),
      axios.get(`https://www.jiosaavn.com/api.php?__call=search.getArtistResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&p=1&n=8`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 8000
      })
    ]);

    const rawSongs = songsRes.status === 'fulfilled' ? (songsRes.value.data?.results || []) : [];
    const autoData = autoRes.status === 'fulfilled' ? (autoRes.value.data || {}) : {};
    const rawAlbums = albumsRes.status === 'fulfilled' ? (albumsRes.value.data?.results || []) : [];
    const rawArtists = artistsRes.status === 'fulfilled' ? (artistsRes.value.data?.results || []) : [];

    // Process songs
    const songs = rawSongs.map(normalizeSong).slice(0, 20);

    // Process albums (prefer direct search, fallback to autocomplete)
    const albums = (rawAlbums.length > 0 ? rawAlbums : (autoData.albums?.data || [])).map(normalizeAlbum).slice(0, 8);

    // Process artists (prefer direct search, fallback to autocomplete)
    const artists = (rawArtists.length > 0 ? rawArtists : (autoData.artists?.data || [])).map(normalizeArtist).slice(0, 8);

    // Process playlists from autocomplete
    const playlists = (autoData.playlists?.data || []).map(pl => ({
      id: pl.id || pl.listid,
      title: htmlDecode(pl.title || pl.listname),
      subtitle: pl.description || pl.extra || 'Playlist',
      image: cleanImage(pl.image),
      type: pl.type || 'playlist',
      permaUrl: pl.perma_url || pl.url
    })).slice(0, 6);

    // Determine TOP RESULT from autocomplete's topquery
    let topResult = null;
    if (autoData.topquery?.data?.[0]) {
      const t = autoData.topquery.data[0];
      topResult = {
        type: t.type, // 'artist', 'song', 'album', 'playlist'
        id: t.id,
        title: htmlDecode(t.title),
        subtitle: t.description || t.extra || t.type,
        image: cleanImage(t.image),
        url: t.url
      };
    } else if (songs.length > 0) {
      // Fallback: first song as top result
      topResult = {
        type: 'song',
        id: songs[0].id,
        title: songs[0].title,
        subtitle: songs[0].artist,
        image: songs[0].thumbnail,
        track: songs[0]
      };
    }

    res.json({
      query,
      topResult,
      songs,
      albums,
      artists,
      playlists,
      total: songs.length + albums.length + artists.length + playlists.length
    });
  } catch (err) {
    console.error('[JioSaavn Search Error]:', err.message);
    res.status(500).json({
      error: 'Search failed',
      topResult: null,
      songs: [],
      albums: [],
      artists: [],
      playlists: [],
      total: 0
    });
  }
});

// ===========================
// 2. SEARCH SUGGESTIONS
// ===========================
router.get('/suggestions', async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    const [ytRes, saavnRes] = await Promise.allSettled([
      axios.get(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`, {
        timeout: 3000
      }),
      axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 3000
      })
    ]);

    const ytSuggestions = ytRes.status === 'fulfilled' ? (ytRes.value.data?.[1] || []) : [];
    const autoData = saavnRes.status === 'fulfilled' ? (saavnRes.value.data || {}) : {};

    const saavnSuggestions = [
      ...(autoData.topquery?.data || []).map(x => x.title),
      ...(autoData.artists?.data || []).map(x => x.title),
      ...(autoData.songs?.data || []).map(x => x.title),
      ...(autoData.albums?.data || []).map(x => x.title)
    ];

    const suggestions = [...saavnSuggestions, ...ytSuggestions]
      .map(s => htmlDecode(String(s || '')).replace(/(lyrics|full song|official audio|video|hd)/gi, '').trim())
      .filter((v, i, a) => v && v.length > 1 && a.indexOf(v) === i)
      .slice(0, 10);

    res.json({ suggestions });
  } catch (err) {
    console.error('[Suggestions Error]:', err.message);
    res.json({ suggestions: [] });
  }
});

// ===========================
// 3. TRENDING / HOME PAGE
// ===========================
router.get('/trending', async (req, res) => {
  try {
    const chartsRes = await axios.get('https://www.jiosaavn.com/api.php?__call=content.getCharts&_format=json&_marker=0&cc=in', {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const charts = chartsRes.data || [];

    if (charts.length > 0 && (charts[0].id || charts[0].listid)) {
      const listId = charts[0].id || charts[0].listid;
      const playlistRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&_marker=0&cc=in&listid=${listId}`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 8000
      });

      const rawTracks = playlistRes.data?.songs || playlistRes.data?.list || [];
      const songs = rawTracks.map(normalizeSong).slice(0, 25);

      return res.json(songs);
    }

    // Fallback: search for trending hits
    const fallbackRes = await axios.get('https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=Trending+2025+Hits&p=1&n=25', {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const songs = (fallbackRes.data?.results || []).map(normalizeSong);
    res.json(songs);
  } catch (err) {
    console.error('[Trending Error]:', err.message);
    res.status(500).json([]);
  }
});

// ===========================
// 4. ALBUMS LIST
// ===========================
router.get('/albums', async (req, res) => {
  const query = String(req.query.q || req.query.query || 'Trending Albums 2025').trim();
  try {
    const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&p=1&n=24`, {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const albums = (response.data?.results || []).map(normalizeAlbum);
    res.json({ albums });
  } catch (err) {
    console.error('[Albums Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch albums', albums: [] });
  }
});

// ===========================
// 5. ALBUM DETAILS (Supports /album/:id and /albums/:id)
// ===========================
const handleAlbumDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&_format=json&_marker=0&cc=in&albumid=${encodeURIComponent(id)}`, {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const data = response.data || {};
    const rawSongs = data.songs || data.list || [];
    const songs = rawSongs.map(normalizeSong);

    const album = {
      id: data.albumid || data.id || id,
      title: htmlDecode(data.title || data.name || 'Official Album'),
      artist: htmlDecode(data.primary_artists || data.music || data.artist || 'Various Artists'),
      year: data.year || new Date().getFullYear().toString(),
      cover: cleanImage(data.image),
      language: data.language || 'Unknown',
      tracks: songs,
      tracksCount: songs.length,
      releaseDate: data.release_date,
      label: data.label,
      copyrightText: data.copyright_text
    };

    res.json({ album });
  } catch (err) {
    console.error('[Album Details Error]:', err.message);
    res.status(404).json({ error: 'Album not found' });
  }
};

router.get('/album/:id', handleAlbumDetails);
router.get('/albums/:id', handleAlbumDetails);

// ===========================
// 6. ARTISTS LIST
// ===========================
router.get('/artists', async (req, res) => {
  const query = String(req.query.q || req.query.query || '').trim();

  try {
    if (query) {
      const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getArtistResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&p=1&n=20`, {
        headers: JIOSAAVN_HEADERS,
        timeout: 8000
      });
      const artists = (response.data?.results || []).map(normalizeArtist);
      return res.json({ artists });
    }

    // Default: Top Curated Popular Artists from live search
    const popularNames = [
      'Arijit Singh', 'Anirudh Ravichander', 'Sid Sriram', 'Shreya Ghoshal',
      'A.R. Rahman', 'Diljit Dosanjh', 'Taylor Swift', 'Ed Sheeran',
      'Devi Sri Prasad', 'Pritam', 'Armaan Malik', 'Badshah',
      'The Weeknd', 'Atif Aslam', 'Neha Kakkar', 'Justin Bieber'
    ];

    const results = await Promise.allSettled(
      popularNames.map(name =>
        axios.get(`https://www.jiosaavn.com/api.php?__call=search.getArtistResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(name)}&p=1&n=1`, {
          headers: JIOSAAVN_HEADERS,
          timeout: 4000
        })
      )
    );

    const artists = results
      .filter(r => r.status === 'fulfilled' && r.value.data?.results?.[0])
      .map(r => normalizeArtist(r.value.data.results[0]));

    res.json({ artists });
  } catch (err) {
    console.error('[Artists Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch artists', artists: [] });
  }
});

// ===========================
// 7. ARTIST DETAILS (Supports /artist/:id and /artists/:id)
// ===========================
const handleArtistDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=artist.getArtistPageDetails&_format=json&_marker=0&cc=in&artistId=${encodeURIComponent(id)}&p=1&n_song=30&n_album=20`, {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const data = response.data || {};

    const artist = {
      id: data.artistId || id,
      name: htmlDecode(data.name || 'Artist'),
      subtitle: data.subtitle || data.role || 'Artist',
      image: cleanImage(data.image),
      followerCount: data.follower_count || data.fan_count || '2.5M',
      isVerified: true,
      bio: data.bio,
      topSongs: (data.topSongs?.songs || []).map(normalizeSong).slice(0, 30),
      topAlbums: (data.topAlbums?.albums || []).map(normalizeAlbum).slice(0, 20),
      similarArtists: (data.similarArtists || []).map(normalizeArtist).slice(0, 10)
    };

    res.json({ artist });
  } catch (err) {
    console.error('[Artist Details Error]:', err.message);
    res.status(404).json({ error: 'Artist not found' });
  }
};

router.get('/artist/:id', handleArtistDetails);
router.get('/artists/:id', handleArtistDetails);

// ===========================
// 8. CHARTS
// ===========================
router.get('/charts', async (req, res) => {
  try {
    const response = await axios.get('https://www.jiosaavn.com/api.php?__call=content.getCharts&_format=json&_marker=0&cc=in', {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const rawCharts = response.data || [];

    // Fetch top tracks for first 4 charts
    const chartsWithTracks = await Promise.all(
      rawCharts.slice(0, 4).map(async (chart) => {
        try {
          const plRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&_marker=0&cc=in&listid=${chart.id || chart.listid}`, {
            headers: JIOSAAVN_HEADERS,
            timeout: 5000
          });

          const tracks = (plRes.data?.songs || plRes.data?.list || []).map(normalizeSong).slice(0, 20);

          return {
            id: chart.id || chart.listid,
            title: htmlDecode(chart.title || chart.listname),
            subtitle: chart.subtitle || 'Top Hits',
            image: cleanImage(chart.image),
            gradient: 'from-rose-600 to-pink-600',
            tracks
          };
        } catch {
          return null;
        }
      })
    );

    const charts = chartsWithTracks.filter(Boolean);

    res.json({ charts });
  } catch (err) {
    console.error('[Charts Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch charts', charts: [] });
  }
});

// ===========================
// 9. RADIO / SIMILAR TRACKS
// ===========================
router.get('/radio', async (req, res) => {
  const trackId = String(req.query.trackId || '').trim();
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();

  if (!trackId && !title) {
    return res.status(400).json({ error: 'trackId or title required' });
  }

  try {
    // Search for similar songs based on title/artist
    const searchQuery = title ? `${title} ${artist}` : trackId;
    const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(searchQuery)}&p=1&n=20`, {
      headers: JIOSAAVN_HEADERS,
      timeout: 8000
    });

    const tracks = (response.data?.results || []).map(normalizeSong);

    res.json({
      title: `${title || artist || 'SoundWave'} Radio`,
      seedTrack: tracks[0] || null,
      tracks
    });
  } catch (err) {
    console.error('[Radio Error]:', err.message);
    res.status(500).json({ error: 'Failed to generate radio', tracks: [] });
  }
});

// ===========================
// 10. RECOMMENDATIONS / HOME SECTIONS
// ===========================
router.get('/recommendations', async (req, res) => {
  try {
    // Fetch multiple trending/popular queries in parallel
    const [teluguRes, hindiRes, romanticRes] = await Promise.allSettled([
      axios.get('https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=Trending+Telugu+Hits&p=1&n=10', {
        headers: JIOSAAVN_HEADERS,
        timeout: 5000
      }),
      axios.get('https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=Trending+Hindi+Songs&p=1&n=10', {
        headers: JIOSAAVN_HEADERS,
        timeout: 5000
      }),
      axios.get('https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=Romantic+Love+Songs&p=1&n=10', {
        headers: JIOSAAVN_HEADERS,
        timeout: 5000
      })
    ]);

    const sections = {
      continueListening: [],
      madeForYou: teluguRes.status === 'fulfilled' ? (teluguRes.value.data?.results || []).map(normalizeSong).slice(0, 10) : [],
      romantic: romanticRes.status === 'fulfilled' ? (romanticRes.value.data?.results || []).map(normalizeSong).slice(0, 10) : [],
      chill: hindiRes.status === 'fulfilled' ? (hindiRes.value.data?.results || []).map(normalizeSong).slice(0, 10) : []
    };

    res.json({ sections });
  } catch (err) {
    console.error('[Recommendations Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch recommendations', sections: {} });
  }
});

// ===========================
// 11. MOODS
// ===========================
router.get('/moods', async (req, res) => {
  try {
    const moodQueries = [
      { id: 'romantic', title: 'Romantic', description: 'Love & heartfelt melodies', query: 'Romantic Songs', color: 'from-rose-500 to-pink-600' },
      { id: 'party', title: 'Party', description: 'High-energy dance tracks', query: 'Party Dance Songs', color: 'from-orange-500 to-red-600' },
      { id: 'chill', title: 'Chill', description: 'Relaxing lo-fi vibes', query: 'Chill Relaxing Songs', color: 'from-indigo-500 to-purple-600' },
      { id: 'workout', title: 'Workout', description: 'Energetic gym beats', query: 'Workout Motivation Songs', color: 'from-green-500 to-teal-600' },
      { id: 'focus', title: 'Focus', description: 'Concentration music', query: 'Study Focus Music', color: 'from-blue-500 to-cyan-600' },
      { id: 'devotional', title: 'Devotional', description: 'Spiritual bhajans', query: 'Devotional Songs', color: 'from-amber-500 to-yellow-600' }
    ];

    const moods = await Promise.all(
      moodQueries.map(async (mood) => {
        try {
          const res = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(mood.query)}&p=1&n=10`, {
            headers: JIOSAAVN_HEADERS,
            timeout: 5000
          });

          const tracks = (res.data?.results || []).map(normalizeSong).slice(0, 10);

          return {
            id: mood.id,
            title: mood.title,
            description: mood.description,
            color: mood.color,
            tracks
          };
        } catch {
          return null;
        }
      })
    );

    res.json({ moods: moods.filter(Boolean) });
  } catch (err) {
    console.error('[Moods Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch moods', moods: [] });
  }
});

// ===========================
// 12. GENRES
// ===========================
router.get('/genres', async (req, res) => {
  const genres = [
    { id: 'pop', name: 'Pop', query: 'Pop Songs', count: '1000+ songs', color: 'from-purple-500 to-pink-500' },
    { id: 'rock', name: 'Rock', query: 'Rock Songs', count: '800+ songs', color: 'from-red-600 to-orange-600' },
    { id: 'classical', name: 'Classical', query: 'Classical Music', count: '500+ songs', color: 'from-indigo-600 to-blue-600' },
    { id: 'edm', name: 'EDM', query: 'EDM Dance', count: '600+ songs', color: 'from-cyan-500 to-teal-500' },
    { id: 'indie', name: 'Indie', query: 'Indie Music', count: '400+ songs', color: 'from-green-500 to-emerald-500' },
    { id: 'jazz', name: 'Jazz', query: 'Jazz Music', count: '300+ songs', color: 'from-amber-500 to-yellow-500' }
  ];

  res.json({ genres });
});

// ===========================
// 13. TELUGU HUB
// ===========================
router.get('/telugu', async (req, res) => {
  try {
    const [albumsRes, hitsRes] = await Promise.allSettled([
      axios.get('https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=Latest+Telugu+Albums&p=1&n=8', {
        headers: JIOSAAVN_HEADERS,
        timeout: 5000
      }),
      axios.get('https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=Trending+Telugu+Hits&p=1&n=12', {
        headers: JIOSAAVN_HEADERS,
        timeout: 5000
      })
    ]);

    const albums = albumsRes.status === 'fulfilled' ? (albumsRes.value.data?.results || []).map(normalizeAlbum) : [];
    const hits = hitsRes.status === 'fulfilled' ? (hitsRes.value.data?.results || []).map(normalizeSong) : [];

    res.json({ albums, hits });
  } catch (err) {
    console.error('[Telugu Hub Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch Telugu music', albums: [], hits: [] });
  }
});

// ===========================
// 14. AUDIO STREAM RESOLUTION & REDIRECT
// ===========================
const resolveStream = async (videoId) => {
  if (!videoId) return null;

  const cached = streamUrlCache.get(videoId);
  if (cached && cached.expireAt > Date.now()) {
    return cached.url;
  }

  try {
    // Lookup directly by song pid / ID
    const detailsRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&_marker=0&cc=in&pids=${encodeURIComponent(videoId)}`, {
      headers: JIOSAAVN_HEADERS,
      timeout: 5000
    });

    const songData = detailsRes.data?.[videoId] || Object.values(detailsRes.data || {})[0];
    if (songData) {
      const encrypted = songData.encrypted_media_url || songData.more_info?.encrypted_media_url;
      const streamUrl = decryptSaavnMediaUrl(encrypted);
      if (streamUrl) {
        streamUrlCache.set(videoId, {
          url: streamUrl,
          expireAt: Date.now() + (15 * 60 * 1000)
        });
        return streamUrl;
      }
    }
  } catch (e) {
    console.warn('[Stream Direct ID Error]:', e.message);
  }

  // Fallback: search for track by title / query
  try {
    const searchRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(videoId)}&p=1&n=1`, {
      headers: JIOSAAVN_HEADERS,
      timeout: 5000
    });

    const track = searchRes.data?.results?.[0];
    if (track) {
      const streamUrl = decryptSaavnMediaUrl(track.encrypted_media_url || track.more_info?.encrypted_media_url);
      if (streamUrl) {
        streamUrlCache.set(videoId, {
          url: streamUrl,
          expireAt: Date.now() + (15 * 60 * 1000)
        });
        return streamUrl;
      }
    }
  } catch (e) {
    console.warn('[Stream Search Fallback Error]:', e.message);
  }

  return null;
};

// Stream JSON endpoint (Used by frontend api.getMusicStream)
router.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const streamUrl = await resolveStream(videoId);
    if (!streamUrl) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    res.json({ streamUrl });
  } catch (err) {
    console.error('[Stream Error]:', err.message);
    res.status(500).json({ error: 'Failed to resolve stream URL' });
  }
});

// Direct audio redirect endpoint
router.get('/audio-stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const streamUrl = await resolveStream(videoId);
    if (!streamUrl) {
      return res.status(404).send('Track stream not found');
    }
    res.redirect(302, streamUrl);
  } catch (err) {
    console.error('[Audio Stream Error]:', err.message);
    res.status(500).send('Streaming error: ' + err.message);
  }
});

// ===========================
// 15. LYRICS (LRCLIB API with JioSaavn fallback)
// ===========================
router.get('/lyrics', async (req, res) => {
  const track = String(req.query.track || req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();

  if (!track) {
    return res.json({ lyrics: null, synced: false, syncedLyrics: null, plainLyrics: null });
  }

  // Clean title for better matching (remove "From XYZ", "(feat. ...)", etc.)
  const cleanTrack = track.replace(/\(From\s+[^)]+\)/gi, '').replace(/\(feat\.[^)]+\)/gi, '').replace(/\[[^\]]+\]/g, '').trim();
  const cleanArtist = artist.split(/,|&|feat/i)[0].trim();

  try {
    // 1. Direct get lookup first
    try {
      const directRes = await axios.get('https://lrclib.net/api/get', {
        params: { track_name: cleanTrack, artist_name: cleanArtist },
        headers: { 'User-Agent': 'SoundWave-MusicApp/1.0' },
        timeout: 4000
      });
      if (directRes.data && (directRes.data.syncedLyrics || directRes.data.plainLyrics)) {
        return res.json({
          lyrics: directRes.data.syncedLyrics || directRes.data.plainLyrics,
          synced: !!directRes.data.syncedLyrics,
          syncedLyrics: directRes.data.syncedLyrics || null,
          plainLyrics: directRes.data.plainLyrics || null,
          duration: directRes.data.duration
        });
      }
    } catch {}

    // 2. Search by track & artist
    const response = await axios.get(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`, {
      headers: { 'User-Agent': 'SoundWave-MusicApp/1.0' },
      timeout: 5000
    });

    const results = response.data;
    if (Array.isArray(results) && results.length > 0) {
      const match = results[0];
      return res.json({
        lyrics: match.syncedLyrics || match.plainLyrics || null,
        synced: !!match.syncedLyrics,
        syncedLyrics: match.syncedLyrics || null,
        plainLyrics: match.plainLyrics || null,
        duration: match.duration
      });
    }

    // 3. Fallback: search by track name only
    const fallbackRes = await axios.get(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}`, {
      headers: { 'User-Agent': 'SoundWave-MusicApp/1.0' },
      timeout: 5000
    });

    const fallbackResults = fallbackRes.data;
    if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
      const match = fallbackResults[0];
      return res.json({
        lyrics: match.syncedLyrics || match.plainLyrics || null,
        synced: !!match.syncedLyrics,
        syncedLyrics: match.syncedLyrics || null,
        plainLyrics: match.plainLyrics || null,
        duration: match.duration
      });
    }

    res.json({ lyrics: null, synced: false, syncedLyrics: null, plainLyrics: null });
  } catch (err) {
    console.error('[Lyrics Error]:', err.message);
    res.json({ lyrics: null, synced: false, syncedLyrics: null, plainLyrics: null });
  }
});

// ===========================
// 16. FAVORITES
// ===========================
router.get('/favorites', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ favorites: [] });
  }

  try {
    const rows = db.prepare(`
      SELECT track_id as id, title, artist, thumbnail, duration, album, created_at
      FROM favorites
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ favorites: rows });
  } catch (err) {
    console.error('[Favorites Get Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch favorites', favorites: [] });
  }
});

router.post('/favorites', requireAuth, (req, res) => {
  const { trackId, title, artist, thumbnail, duration, album } = req.body;
  if (!trackId || !title) {
    return res.status(400).json({ error: 'trackId and title are required' });
  }

  try {
    const id = 'fav-' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO favorites (id, user_id, track_id, title, artist, thumbnail, duration, album, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, String(trackId), String(title), String(artist || 'Unknown Artist'), String(thumbnail || ''), String(duration || '3:30'), String(album || 'Single'), now);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'favorites').catch(() => {});

    res.json({ success: true, message: 'Track added to favorites' });
  } catch (err) {
    console.error('[Favorites Add Error]:', err.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/favorites/:trackId', requireAuth, (req, res) => {
  const { trackId } = req.params;

  try {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND track_id = ?').run(req.user.id, trackId);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'favorites').catch(() => {});

    res.json({ success: true, message: 'Track removed from favorites' });
  } catch (err) {
    console.error('[Favorites Delete Error]:', err.message);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// ===========================
// 17. PLAYLISTS
// ===========================
router.get('/playlists', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ playlists: [] });
  }

  try {
    const playlists = db.prepare(`
      SELECT p.*, COUNT(ps.id) as song_count
      FROM playlists p
      LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all(req.user.id);

    res.json({ playlists });
  } catch (err) {
    console.error('[Playlists Get Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlists', playlists: [] });
  }
});

router.post('/playlists', requireAuth, (req, res) => {
  const { name, description = '', cover_url = '' } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    const id = 'pl-' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO playlists (id, user_id, name, description, cover_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name.trim(), description, cover_url, now, now);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'playlists').catch(() => {});

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    res.json({ success: true, playlist });
  } catch (err) {
    console.error('[Playlists Create Error]:', err.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

router.get('/playlists/:id', optionalAuth, (req, res) => {
  const { id } = req.params;

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const songs = db.prepare(`
      SELECT track_id as id, title, artist, thumbnail, duration, album, position, added_at
      FROM playlist_songs
      WHERE playlist_id = ?
      ORDER BY position ASC, added_at ASC
    `).all(id);

    res.json({ playlist: { ...playlist, songs } });
  } catch (err) {
    console.error('[Playlist Detail Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

router.put('/playlists/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, cover_url } = req.body;

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or permission denied' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE playlists
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          cover_url = COALESCE(?, cover_url),
          updated_at = ?
      WHERE id = ?
    `).run(name ? name.trim() : null, description !== undefined ? description : null, cover_url !== undefined ? cover_url : null, now, id);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'playlists').catch(() => {});

    const updated = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    res.json({ success: true, playlist: updated });
  } catch (err) {
    console.error('[Playlist Update Error]:', err.message);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

router.delete('/playlists/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or permission denied' });
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(id);
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'playlists').catch(() => {});
    syncTableToCloud(db, 'playlist_songs').catch(() => {});

    res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) {
    console.error('[Playlist Delete Error]:', err.message);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

router.post('/playlists/:playlistId/songs', requireAuth, (req, res) => {
  const { playlistId } = req.params;
  const { trackId, title, artist, thumbnail, duration, album } = req.body;

  if (!trackId || !title) {
    return res.status(400).json({ error: 'trackId and title are required' });
  }

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(playlistId, req.user.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or permission denied' });
    }

    const id = 'pls-' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();
    const count = db.prepare('SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?').get(playlistId).count || 0;

    db.prepare(`
      INSERT OR REPLACE INTO playlist_songs (id, playlist_id, track_id, title, artist, thumbnail, duration, album, position, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, playlistId, String(trackId), String(title), String(artist || 'Unknown Artist'), String(thumbnail || ''), String(duration || '3:30'), String(album || 'Single'), count, now);

    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now, playlistId);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'playlist_songs').catch(() => {});
    syncTableToCloud(db, 'playlists').catch(() => {});

    res.json({ success: true, message: 'Song added to playlist' });
  } catch (err) {
    console.error('[Playlist Song Add Error]:', err.message);
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

router.delete('/playlists/:playlistId/songs/:trackId', requireAuth, (req, res) => {
  const { playlistId, trackId } = req.params;

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(playlistId, req.user.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or permission denied' });
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND track_id = ?').run(playlistId, trackId);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'playlist_songs').catch(() => {});

    res.json({ success: true, message: 'Song removed from playlist' });
  } catch (err) {
    console.error('[Playlist Song Delete Error]:', err.message);
    res.status(500).json({ error: 'Failed to remove song from playlist' });
  }
});

// ===========================
// 18. LISTENING HISTORY & STATS
// ===========================
router.post('/history', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ success: true, recorded: false });
  }

  const { trackId, title, artist, thumbnail, duration, album, playDurationSeconds = 0 } = req.body;
  if (!trackId || !title) {
    return res.status(400).json({ error: 'trackId and title are required' });
  }

  try {
    const id = 'hist-' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO listening_history (id, user_id, track_id, title, artist, thumbnail, duration, album, played_at, play_duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, String(trackId), String(title), String(artist || 'Unknown Artist'), String(thumbnail || ''), String(duration || '3:30'), String(album || 'Single'), now, parseInt(playDurationSeconds, 10) || 0);

    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'listening_history').catch(() => {});

    res.json({ success: true, recorded: true });
  } catch (err) {
    console.error('[History Add Error]:', err.message);
    res.status(500).json({ error: 'Failed to record history' });
  }
});

router.get('/history', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ history: [] });
  }

  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

  try {
    const history = db.prepare(`
      SELECT id as historyId, track_id as id, title, artist, thumbnail, duration, album, played_at, play_duration_seconds
      FROM listening_history
      WHERE user_id = ?
      ORDER BY played_at DESC
      LIMIT ?
    `).all(req.user.id, limit);

    res.json({ history });
  } catch (err) {
    console.error('[History Get Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch history', history: [] });
  }
});

router.delete('/history/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM listening_history WHERE id = ? AND user_id = ?').run(id, req.user.id);
    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'listening_history').catch(() => {});
    res.json({ success: true, message: 'History item removed' });
  } catch (err) {
    console.error('[History Delete Error]:', err.message);
    res.status(500).json({ error: 'Failed to remove history item' });
  }
});

router.delete('/history', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM listening_history WHERE user_id = ?').run(req.user.id);
    const { syncTableToCloud } = require('../db/cloudSync');
    syncTableToCloud(db, 'listening_history').catch(() => {});
    res.json({ success: true, message: 'All listening history cleared' });
  } catch (err) {
    console.error('[History Clear Error]:', err.message);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

router.get('/stats', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({
      totalPlays: 0,
      totalMinutes: 0,
      topArtists: [],
      topTracks: []
    });
  }

  try {
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM listening_history WHERE user_id = ?').get(req.user.id).count || 0;
    const totalSeconds = db.prepare('SELECT SUM(play_duration_seconds) as total FROM listening_history WHERE user_id = ?').get(req.user.id).total || 0;

    const topArtists = db.prepare(`
      SELECT artist, COUNT(*) as plays
      FROM listening_history
      WHERE user_id = ?
      GROUP BY artist
      ORDER BY plays DESC
      LIMIT 5
    `).all(req.user.id);

    const topTracks = db.prepare(`
      SELECT track_id as id, title, artist, thumbnail, COUNT(*) as plays
      FROM listening_history
      WHERE user_id = ?
      GROUP BY track_id
      ORDER BY plays DESC
      LIMIT 5
    `).all(req.user.id);

    res.json({
      totalPlays: totalCount,
      totalMinutes: Math.round(totalSeconds / 60) || Math.round(totalCount * 3.5),
      topArtists,
      topTracks
    });
  } catch (err) {
    console.error('[Stats Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ===========================
// 19. DOWNLOAD AUDIO STREAM
// ===========================
router.get('/download/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const title = String(req.query.title || 'song').replace(/[^a-zA-Z0-9_\-\. ]/g, '_').trim();

  try {
    const streamUrl = await resolveStream(videoId);
    if (!streamUrl) {
      return res.status(404).send('Audio stream not available for download.');
    }

    const audioRes = await axios({
      method: 'GET',
      url: streamUrl,
      responseType: 'stream',
      timeout: 15000,
      headers: {
        'User-Agent': JIOSAAVN_HEADERS['User-Agent']
      }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.setHeader('Content-Type', audioRes.headers['content-type'] || 'audio/mp4');
    if (audioRes.headers['content-length']) {
      res.setHeader('Content-Length', audioRes.headers['content-length']);
    }

    audioRes.data.pipe(res);
  } catch (err) {
    console.error('[Download Error]:', err.message);
    res.status(500).send('Error downloading audio file: ' + err.message);
  }
});

module.exports = router;
