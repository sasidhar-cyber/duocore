const express = require('express');
const yts = require('yt-search');
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
    return rawUrl.replace(/_96\.(mp4|m4a)/, '_320.mp4').replace(/_160\.(mp4|m4a)/, '_320.mp4');
  } catch (e) {
    return null;
  }
}

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

// Curated Top Albums & Soundtracks
const FEATURED_ALBUMS = [
  {
    id: 'album-animal-telugu',
    title: 'Animal (Telugu & Hindi Blockbuster)',
    artist: 'Sonu Nigam, Vishal Mishra, Arijit Singh, Harshavardhan',
    year: '2023',
    cover: 'https://c.saavncdn.com/466/Nanna-Nuv-Naa-Pranam-From-ANIMAL-TELUGU-Telugu-2023-20231114011010-500x500.jpg',
    tracksCount: 7,
    badge: 'Mega Blockbuster 🎬',
    language: 'Telugu / Hindi',
    description: 'Blockbuster soundtrack featuring chartbusting melodies by Sonu Nigam, Vishal Mishra, and Arijit Singh.'
  },
  {
    id: 'album-devara-part-1',
    title: 'Devara: Part 1',
    artist: 'Anirudh Ravichander, Shilpa Rao',
    year: '2024',
    cover: 'https://c.saavncdn.com/313/Devara-Part-1-Telugu-Telugu-2024-20240926171010-500x500.jpg',
    tracksCount: 5,
    badge: 'Trending #1 ⚡',
    language: 'Telugu',
    description: 'High-octane mass & melody album composed by Rockstar Anirudh Ravichander.'
  },
  {
    id: 'album-guntur-kaaram',
    title: 'Guntur Kaaram',
    artist: 'Thaman S, Mahesh Babu, Sri Krishna',
    year: '2024',
    cover: 'https://c.saavncdn.com/000/Guntur-Kaaram-Telugu-2023-20240126145901-500x500.jpg',
    tracksCount: 5,
    badge: 'Mass Hits 🔥',
    language: 'Telugu',
    description: 'Superstar Mahesh Babu & Thaman S high voltage mass celebration soundtrack.'
  },
  {
    id: 'album-kalki-2898-ad',
    title: 'Kalki 2898 AD',
    artist: 'Santhosh Narayanan, Kala Bhairava',
    year: '2024',
    cover: 'https://c.saavncdn.com/888/Kalki-2898-Ad-Telugu-Telugu-2024-20240712063717-500x500.jpg',
    tracksCount: 6,
    badge: 'Sci-Fi Epic 🚀',
    language: 'Telugu',
    description: 'Mythological sci-fi masterpiece soundtrack composed by Santhosh Narayanan.'
  },
  {
    id: 'album-hi-nanna',
    title: 'Hi Nanna',
    artist: 'Hesham Abdul Wahab, Anurag Kulkarni',
    year: '2023',
    cover: 'https://c.saavncdn.com/307/Samayama-From-Hi-Nanna-Telugu-2023-20230918164922-500x500.jpg',
    tracksCount: 6,
    badge: 'Pure Soul ❤️',
    language: 'Telugu',
    description: 'Heartwarming romantic family drama melodies by Hesham Abdul Wahab.'
  },
  {
    id: 'album-sita-ramam',
    title: 'Sita Ramam',
    artist: 'Vishal Chandrashekhar, S.P. Charan, Sid Sriram',
    year: '2022',
    cover: 'https://c.saavncdn.com/041/Sita-Ramam-Telugu-Original-Motion-Picture-Soundtrack-Telugu-2022-20220802140738-500x500.jpg',
    tracksCount: 8,
    badge: 'Timeless Classic 💌',
    language: 'Telugu',
    description: 'Vintage timeless romance music composed by Vishal Chandrashekhar.'
  },
  {
    id: 'album-ala-vaikunthapurramuloo',
    title: 'Ala Vaikunthapurramuloo',
    artist: 'Thaman S, Sid Sriram, Armaan Malik',
    year: '2020',
    cover: 'https://c.saavncdn.com/517/Ala-Vaikunthapurramuloo-Telugu-2019-20200116144338-500x500.jpg',
    tracksCount: 6,
    badge: 'All-Time Record 🏆',
    language: 'Telugu',
    description: 'Record-shattering musical sensation with Samajavaragamana and Butta Bomma.'
  },
  {
    id: 'album-rrr-telugu',
    title: 'RRR (Telugu)',
    artist: 'M. M. Keeravani, Rahul Sipligunj, Kaala Bhairava',
    year: '2022',
    cover: 'https://c.saavncdn.com/683/RRR-Telugu-Telugu-2022-20250828171313-500x500.jpg',
    tracksCount: 7,
    badge: 'Oscar Winner 🏆',
    language: 'Telugu',
    description: 'Academy Award winning historic soundtrack by legendary maestro M. M. Keeravani.'
  }
];

// Featured Top Artists
const FEATURED_ARTISTS = [
  {
    id: 'artist-anirudh',
    name: 'Anirudh Ravichander',
    image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg',
    role: 'Music Director & Singer',
    monthlyListeners: '28.4M',
    badge: 'Rockstar ⚡',
    language: 'Telugu / Tamil',
    bio: 'Renowned Indian composer and music producer dominating South Indian and Pan-Indian cinema with high-energy chartbusters.'
  },
  {
    id: 'artist-sid-sriram',
    name: 'Sid Sriram',
    image: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20240618063004_500x500.jpg',
    role: 'Playback Singer & Carnatic Musician',
    monthlyListeners: '21.7M',
    badge: 'Melody King 👑',
    language: 'Telugu / Tamil',
    bio: 'Indian-American playback singer known for his expressive soulful vocals in Telugu, Tamil, and Malayalam cinema.'
  },
  {
    id: 'artist-arijit-singh',
    name: 'Arijit Singh',
    image: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg',
    role: 'Playback Singer & Producer',
    monthlyListeners: '42.1M',
    badge: 'Soul Maestro 🌟',
    language: 'Hindi / Telugu',
    bio: 'The undisputed voice of Bollywood and Indian music, celebrated for iconic romantic ballads and soul-stirring hits.'
  },
  {
    id: 'artist-thaman-s',
    name: 'Thaman S',
    image: 'https://c.saavncdn.com/artists/Thaman_S_003_20240319071010_500x500.jpg',
    role: 'Music Composer & Drummer',
    monthlyListeners: '16.9M',
    badge: 'Beast of Beats 🥁',
    language: 'Telugu',
    bio: 'Prolific Telugu composer famous for energetic dance tracks and emotional chart-topping melodies.'
  },
  {
    id: 'artist-dsp',
    name: 'Devi Sri Prasad (DSP)',
    image: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_002_20240319071010_500x500.jpg',
    role: 'Composer & Singer',
    monthlyListeners: '14.5M',
    badge: 'Rockstar of Tollywood 🎸',
    language: 'Telugu',
    bio: 'National Award-winning composer known for Pushpa, Rangasthalam, and high-octane theatrical hits.'
  },
  {
    id: 'artist-shreya-ghoshal',
    name: 'Shreya Ghoshal',
    image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20240618063004_500x500.jpg',
    role: 'Playback Singer',
    monthlyListeners: '31.2M',
    badge: 'Melody Queen 🕊️',
    language: 'Telugu / Hindi',
    bio: 'One of the most celebrated and decorated playback singers in Indian history with multiple National Awards.'
  },
  {
    id: 'artist-sonu-nigam',
    name: 'Sonu Nigam',
    image: 'https://c.saavncdn.com/artists/Sonu_Nigam_003_20240319071010_500x500.jpg',
    role: 'Legendary Playback Singer',
    monthlyListeners: '18.9M',
    badge: 'Living Legend 🏆',
    language: 'Telugu / Hindi',
    bio: 'Legendary Indian singer who delivered the timeless blockbuster Nanna Nuv Naa Pranam in Animal Telugu.'
  },
  {
    id: 'artist-vishal-mishra',
    name: 'Vishal Mishra',
    image: 'https://c.saavncdn.com/artists/Vishal_Mishra_003_20231011081003_500x500.jpg',
    role: 'Composer & Singer',
    monthlyListeners: '23.6M',
    badge: 'Heartfelt Voice 💖',
    language: 'Telugu / Hindi',
    bio: 'Sensational singer-composer acclaimed for Evarevaro in Animal and Pehle Bhi Main.'
  }
];

const CURATED_ALBUMS = FEATURED_ALBUMS;

// Top Curated Spotify & JioSaavn Chartbusters with Exact Direct Song IDs & High-Res Artwork
const SPOTIFY_JIOSAAVN_TOP_SONGS = [
  // 🦁 ANIMAL Blockbusters (Telugu & Hindi)
  { id: 'K4Nkmr0K', title: 'Nanna Nuv Naa Pranam', artist: 'Sonu Nigam, Harshavardhan Rameshwar', duration: '3:45', seconds: 225, thumbnail: 'https://c.saavncdn.com/466/Nanna-Nuv-Naa-Pranam-From-ANIMAL-TELUGU-Telugu-2023-20231114011010-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal (Telugu)', language: 'Telugu', year: '2023' },
  { id: 'yXAasilI', title: 'Evarevaro (Soul Version)', artist: 'Vishal Mishra, Anantha Sriram', duration: '3:45', seconds: 225, thumbnail: 'https://c.saavncdn.com/420/Evarevaro-Soul-Version-From-ANIMAL-Telugu-2023-20231223151007-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal (Telugu)', language: 'Telugu', year: '2023' },
  { id: 'N7A4fhZ7', title: 'Yaalo Yaalaa', artist: 'Jaani, Anurag Kulkarni', duration: '3:45', seconds: 225, thumbnail: 'https://c.saavncdn.com/369/Yaalo-Yaalaa-Extended-Film-Version-From-ANIMAL-Telugu-2023-20231223011008-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal (Telugu)', language: 'Telugu', year: '2023' },
  { id: 'DyHGTRu9', title: 'Ney Veyrey', artist: 'Karthik, Shreyas Puranik', duration: '3:45', seconds: 225, thumbnail: 'https://c.saavncdn.com/440/Needhe-Katha-Women-s-Day-Tollywood-Musical-Melody-Telugu-2026-20260307191012-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal (Telugu)', language: 'Telugu', year: '2023' },
  { id: '4mHUvJ4u', title: 'Satranga', artist: 'Arijit Singh, Shreyas Puranik', duration: '4:31', seconds: 271, thumbnail: 'https://c.saavncdn.com/092/ANIMAL-Hindi-2023-20260724191152-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal', language: 'Hindi', year: '2023' },
  { id: '1e0En7YX', title: 'Pehle Bhi Main', artist: 'Vishal Mishra, Raj Shekhar', duration: '4:10', seconds: 250, thumbnail: 'https://c.saavncdn.com/092/ANIMAL-Hindi-2023-20260724191152-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal', language: 'Hindi', year: '2023' },
  { id: 'pn0aq27z', title: 'Arjan Vailly', artist: 'Bhupinder Babbal, Manan Bhardwaj', duration: '3:02', seconds: 182, thumbnail: 'https://c.saavncdn.com/092/ANIMAL-Hindi-2023-20260724191152-500x500.jpg', category: 'Animal Blockbuster', album: 'Animal', language: 'Hindi', year: '2023' },

  // ⚡ Top Telugu Chartbusters
  { id: 'O94kBTtw', title: 'Chuttamalle', artist: 'Shilpa Rao, Anirudh Ravichander', duration: '3:37', seconds: 217, thumbnail: 'https://c.saavncdn.com/313/Devara-Part-1-Telugu-Telugu-2024-20240926171010-500x500.jpg', category: 'Telugu Hits', album: 'Devara: Part 1', language: 'Telugu', year: '2024' },
  { id: 'm0Yt29rq', title: 'Fear Song', artist: 'Anirudh Ravichander', duration: '3:17', seconds: 197, thumbnail: 'https://c.saavncdn.com/313/Devara-Part-1-Telugu-Telugu-2024-20240926171010-500x500.jpg', category: 'Telugu Hits', album: 'Devara: Part 1', language: 'Telugu', year: '2024' },
  { id: 'ARuXdxyk', title: 'Kurchi Madathapetti', artist: 'Mahesh Babu, Thaman S, Sri Krishna', duration: '4:43', seconds: 283, thumbnail: 'https://c.saavncdn.com/000/Guntur-Kaaram-Telugu-2023-20240126145901-500x500.jpg', category: 'Telugu Hits', album: 'Guntur Kaaram', language: 'Telugu', year: '2024' },
  { id: 'yU_Zx3mf', title: 'Dum Masala', artist: 'Thaman S, Sanjith Hegde', duration: '3:59', seconds: 239, thumbnail: 'https://c.saavncdn.com/000/Guntur-Kaaram-Telugu-2023-20240126145901-500x500.jpg', category: 'Telugu Hits', album: 'Guntur Kaaram', language: 'Telugu', year: '2024' },
  { id: 'HfNOoigd', title: 'Ta Takkara', artist: 'Sanjith Hegde, Dhee, Santhosh Narayanan', duration: '4:44', seconds: 284, thumbnail: 'https://c.saavncdn.com/888/Kalki-2898-Ad-Telugu-Telugu-2024-20240712063717-500x500.jpg', category: 'Telugu Hits', album: 'Kalki 2898 AD', language: 'Telugu', year: '2024' },
  { id: 'luHVr_tA', title: 'Theme Of Kalki', artist: 'Kala Bhairava, Gowtham Bharadwaj', duration: '3:15', seconds: 195, thumbnail: 'https://c.saavncdn.com/888/Kalki-2898-Ad-Telugu-Telugu-2024-20240712063717-500x500.jpg', category: 'Telugu Hits', album: 'Kalki 2898 AD', language: 'Telugu', year: '2024' },
  { id: 'Vv39UvCz', title: 'Samayama', artist: 'Hesham Abdul Wahab, Anurag Kulkarni', duration: '3:21', seconds: 201, thumbnail: 'https://c.saavncdn.com/307/Samayama-From-Hi-Nanna-Telugu-2023-20230918164922-500x500.jpg', category: 'Telugu Hits', album: 'Hi Nanna', language: 'Telugu', year: '2023' },
  { id: 'X0EnH2OU', title: 'Ammaadi', artist: 'Shakthisree Gopalan, Kaala Bhairava', duration: '3:45', seconds: 225, thumbnail: 'https://c.saavncdn.com/712/Ammaadi-From-Hi-Nanna-Telugu-2023-20231103201011-500x500.jpg', category: 'Telugu Hits', album: 'Hi Nanna', language: 'Telugu', year: '2023' },
  { id: 'xxmBOTCY', title: 'Inthandham', artist: 'Vishal Chandrashekhar, S.P. Charan', duration: '4:02', seconds: 242, thumbnail: 'https://c.saavncdn.com/041/Sita-Ramam-Telugu-Original-Motion-Picture-Soundtrack-Telugu-2022-20220802140738-500x500.jpg', category: 'Telugu Hits', album: 'Sita Ramam', language: 'Telugu', year: '2022' },
  { id: 'ZcpmPz2V', title: 'Kalaavathi', artist: 'Sid Sriram, Thaman S', duration: '5:07', seconds: 307, thumbnail: 'https://c.saavncdn.com/250/Sarkaru-Vaari-Paata-Telugu-2022-20220704160854-500x500.jpg', category: 'Telugu Hits', album: 'Sarkaru Vaari Paata', language: 'Telugu', year: '2022' },
  { id: 'PiXTKfRo', title: 'Radhika', artist: 'Ram Miriyala', duration: '3:15', seconds: 195, thumbnail: 'https://c.saavncdn.com/000/Tillu-Square-Telugu-2023-20240405190047-500x500.jpg', category: 'Telugu Hits', album: 'Tillu Square', language: 'Telugu', year: '2024' },
  { id: '66E8ZQiS', title: 'Poolamme Pilla', artist: 'GowraHari, Kasarla Shyam', duration: '3:40', seconds: 220, thumbnail: 'https://c.saavncdn.com/807/Poolamme-Pilla-From-HanuMan-Telugu-Telugu-2024-20240620164831-500x500.jpg', category: 'Telugu Hits', album: 'HanuMan', language: 'Telugu', year: '2024' },
  { id: 'gZsIAUmO', title: 'Samajavaragamana', artist: 'Sid Sriram, Thaman S', duration: '3:49', seconds: 229, thumbnail: 'https://c.saavncdn.com/517/Ala-Vaikunthapurramuloo-Telugu-2019-20200116144338-500x500.jpg', category: 'Telugu Hits', album: 'Ala Vaikunthapurramuloo', language: 'Telugu', year: '2020' },
  { id: '-JkPBIE7', title: 'Naatu Naatu', artist: 'Rahul Sipligunj, Kaala Bhairava', duration: '4:35', seconds: 275, thumbnail: 'https://c.saavncdn.com/683/RRR-Telugu-Telugu-2022-20250828171313-500x500.jpg', category: 'Telugu Hits', album: 'RRR', language: 'Telugu', year: '2022' },
  { id: 'X-Q58gQr', title: 'Dheera Dheera', artist: 'M. M. Keeravani, Nikita Nigam', duration: '4:45', seconds: 285, thumbnail: 'https://c.saavncdn.com/896/Magadheera-2009-500x500.jpg', category: 'Telugu Hits', album: 'Magadheera', language: 'Telugu', year: '2009' },

  // 🌍 Global & Bollywood Hits
  { id: 'VaNhRJHr', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', duration: '4:11', seconds: 251, thumbnail: 'https://c.saavncdn.com/060/Die-With-A-Smile-English-2024-20240816103634-500x500.jpg', category: 'Global Pop', album: 'Die With A Smile', language: 'English', year: '2024' },
  { id: 'BhKP6P-H', title: 'Espresso', artist: 'Sabrina Carpenter', duration: '2:55', seconds: 175, thumbnail: 'https://c.saavncdn.com/111/Espresso-English-2024-20240412064803-500x500.jpg', category: 'Global Pop', album: 'Short n Sweet', language: 'English', year: '2024' }
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

  // Strategy 1: Direct JioSaavn Song ID Details Decryption (Instant 320kbps)
  try {
    const detailsRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${encodeURIComponent(videoId)}&ctx=web6dot0&_format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 4000
    });
    const songData = detailsRes.data?.songs?.[0] || detailsRes.data?.[videoId];
    const fullUrl = decryptSaavnMediaUrl(songData?.more_info?.encrypted_media_url || songData?.encrypted_media_url);
    if (fullUrl) {
      streamUrlCache.set(idOrQuery, {
        url: fullUrl,
        expireAt: Date.now() + 6 * 60 * 60 * 1000
      });
      return fullUrl;
    }
  } catch (e) {
    // Not a direct Saavn PID, proceed to search
  }

  // Strategy 2: JioSaavn Search by Song Name or YouTube Title
  try {
    const songMeta = SPOTIFY_JIOSAAVN_TOP_SONGS.find((s) => s.id === videoId);
    let searchQuery = songMeta ? `${songMeta.title} ${songMeta.artist}` : idOrQuery.replace('query:', '');

    // If it looks like a YouTube ID (11 chars), resolve title first
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId) && !songMeta) {
      try {
        const ytVideo = await yts({ videoId });
        if (ytVideo?.title) {
          searchQuery = ytVideo.title.replace(/(\[.*?\]|\(.*?\))/g, '').replace(/(official video|lyrics|audio|video|remix|hd|4k|full song)/gi, '').trim();
        }
      } catch {}
    }

    const searchRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_marker=0&query=${encodeURIComponent(searchQuery)}&ctx=web6dot0&_format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 4000
    });
    const song = searchRes.data?.songs?.data?.[0];
    if (song && song.id) {
      const detailsRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${song.id}&ctx=web6dot0&_format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 4000
      });
      const songData = detailsRes.data?.songs?.[0] || detailsRes.data?.[song.id];
      const fullUrl = decryptSaavnMediaUrl(songData?.more_info?.encrypted_media_url || songData?.encrypted_media_url);
      if (fullUrl) {
        streamUrlCache.set(idOrQuery, {
          url: fullUrl,
          expireAt: Date.now() + 6 * 60 * 60 * 1000
        });
        return fullUrl;
      }
    }
  } catch (e) {
    console.warn('[Music Stream] Strategy 2 (JioSaavn Search) fallback:', e.message);
  }

  // Strategy 3: yt-dlp with tvhtml5 and android_creator clients
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
    console.warn('[Music Stream] Strategy 3 (yt-dlp) failed:', err.message);
  }

  throw new Error('Failed to resolve audio stream URL');
}

function cleanHtml(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/(\[.*?\]|\(.*?\))/g, '')
    .replace(/(official video|lyrics|audio|video|remix|hd|4k|full song)/gi, '')
    .trim();
}

// Spotify-style search operators make one search box useful for power users
// without making normal searches any harder. Example: artist:"Sid Sriram"
// year:2024 or album:Animal Telugu.
function parseSmartSearch(rawQuery) {
  const filters = {};
  const query = String(rawQuery || '').replace(/\b(artist|album|track|genre|language|year):(?:"([^"]+)"|'([^']+)'|([^\s]+))/gi, (_match, key, quoted, singleQuoted, plain) => {
    filters[key.toLowerCase()] = (quoted || singleQuoted || plain || '').trim();
    return ' ';
  }).replace(/\s+/g, ' ').trim();
  return { query, filters };
}

// 1. Advanced Search with Filters & Categories
router.get('/search', async (req, res) => {
  const parsedSearch = parseSmartSearch(req.query.q);
  const query = parsedSearch.query;
  const language = String(req.query.language || parsedSearch.filters.language || '').trim();
  const year = String(req.query.year || parsedSearch.filters.year || '').trim();
  const category = String(req.query.category || '').trim();
  const hasSmartFilters = Object.values(parsedSearch.filters).some(Boolean);

  if (!query && !language && !year && !category && !hasSmartFilters) {
    return res.json({ results: SPOTIFY_JIOSAAVN_TOP_SONGS, albums: CURATED_ALBUMS });
  }

  try {
    let searchTerms = [query, parsedSearch.filters.artist, parsedSearch.filters.album, parsedSearch.filters.track, parsedSearch.filters.genre];
    if (language) searchTerms.push(language);
    if (year) searchTerms.push(year);
    if (category && category !== 'All') searchTerms.push(category);

    const fullQuery = searchTerms.filter(Boolean).join(' ');
    const results = [];
    const seenIds = new Set();

    // 0. Check Curated Master Database for Instant Exact Matches
    // Use free text for the local match; each operator is applied separately
    // below, so `album:Animal language:Telugu` does not require that exact
    // sentence to occur in a title.
    const lowerQ = query.toLowerCase();
    for (const s of SPOTIFY_JIOSAAVN_TOP_SONGS) {
      const matchesText = !lowerQ || s.title.toLowerCase().includes(lowerQ) || s.artist.toLowerCase().includes(lowerQ) || (s.album && s.album.toLowerCase().includes(lowerQ));
      const matchesArtist = !parsedSearch.filters.artist || s.artist.toLowerCase().includes(parsedSearch.filters.artist.toLowerCase());
      const matchesAlbum = !parsedSearch.filters.album || (s.album || '').toLowerCase().includes(parsedSearch.filters.album.toLowerCase());
      const matchesTrack = !parsedSearch.filters.track || s.title.toLowerCase().includes(parsedSearch.filters.track.toLowerCase());
      const matchesGenre = !parsedSearch.filters.genre || (s.category || '').toLowerCase().includes(parsedSearch.filters.genre.toLowerCase());
      if (matchesText && matchesArtist && matchesAlbum && matchesTrack && matchesGenre) {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          results.push({ ...s, fullTitle: s.title });
        }
      }
    }

    // 1. High Priority: Direct Autocomplete Match (Top exact song match)
    try {
      const autoRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_marker=0&query=${encodeURIComponent(fullQuery)}&ctx=web6dot0&_format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 4000
      });
      const autoSongs = autoRes.data?.songs?.data || [];
      for (const s of autoSongs) {
        if (s.id && !seenIds.has(s.id)) {
          seenIds.add(s.id);
          results.push({
            id: s.id,
            title: cleanHtml(s.title),
            fullTitle: cleanHtml(s.title),
            artist: cleanHtml(s.more_info?.primary_artists || s.description),
            album: cleanHtml(s.album),
            thumbnail: s.image ? s.image.replace('50x50', '500x500').replace('150x150', '500x500') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
            duration: '3:45',
            seconds: 225,
            language: s.more_info?.language || ''
          });
        }
      }
    } catch (e) {}

    // 2. Deep Catalog Search
    try {
      const deepRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(fullQuery)}&_format=json&_marker=0&ctx=web6dot0&n=40&p=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      const deepSongs = deepRes.data?.results || [];
      for (const s of deepSongs) {
        if (s.id && !seenIds.has(s.id)) {
          seenIds.add(s.id);
          results.push({
            id: s.id,
            title: cleanHtml(s.song),
            fullTitle: cleanHtml(s.song),
            artist: cleanHtml(s.singers || s.primary_artists),
            album: cleanHtml(s.album),
            thumbnail: s.image ? s.image.replace('150x150', '500x500').replace('50x50', '500x500') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
            duration: s.duration ? `${Math.floor(s.duration / 60)}:${(s.duration % 60).toString().padStart(2, '0')}` : '3:30',
            seconds: parseInt(s.duration, 10) || 210,
            year: s.year,
            language: s.language
          });
        }
      }
    } catch (e) {}

    // Categorize matching Artists & Albums from the query and results
    const matchingArtists = FEATURED_ARTISTS.filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase())
    );
    const matchingAlbums = FEATURED_ALBUMS.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.artist.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length > 0) {
      return res.json({
        results,
        tracks: results,
        artists: matchingArtists,
        albums: matchingAlbums.length > 0 ? matchingAlbums : FEATURED_ALBUMS.slice(0, 4)
      });
    }

    // 2. Fallback to YouTube Search
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

    res.json({
      results: musicTracks,
      tracks: musicTracks,
      artists: matchingArtists,
      albums: matchingAlbums.length > 0 ? matchingAlbums : FEATURED_ALBUMS.slice(0, 4)
    });
  } catch (err) {
    console.error('[Music Search] Error:', err);
    res.status(500).json({ error: 'Search failed', results: [], tracks: [], artists: [], albums: [] });
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

// 6. Download Song as MP3 (Legal Direct Audio Delivery)
router.get('/download/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const rawTitle = req.query.title || 'song';
  const cleanTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, '').trim() || 'Track';

  if (!videoId) return res.status(400).json({ error: 'Track ID required' });

  try {
    const streamUrl = await resolveAudioStreamUrl(videoId);

    if (!streamUrl || !streamUrl.startsWith('http')) {
      return res.status(404).json({ error: 'Direct audio stream not available for download' });
    }

    const response = await axios({
      method: 'GET',
      url: streamUrl,
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 12000
    });

    const safeAscii = cleanTitle.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAscii}.mp3"; filename*=UTF-8''${encodeURIComponent(cleanTitle)}.mp3`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    response.data.pipe(res);
  } catch (err) {
    console.error('[Music Download] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download stream error: ' + err.message });
    }
  }
});

// 8. Albums List & Search
router.get('/albums', async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (!query) {
    return res.json({ albums: FEATURED_ALBUMS });
  }

  try {
    const searchRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&ctx=web6dot0&n=20&p=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000
    });

    const saavnAlbums = (searchRes.data?.results || []).map(a => ({
      id: `saavn-album-${a.albumid || a.id}`,
      albumId: a.albumid || a.id,
      title: cleanHtml(a.title || a.name),
      artist: cleanHtml(a.primary_artists || a.artist?.singers?.map(s => s.name).join(', ') || a.subtitle || 'Various Artists'),
      year: a.year || '2024',
      cover: a.image ? a.image.replace('150x150', '500x500').replace('50x50', '500x500') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
      badge: a.language ? `${a.language.toUpperCase()} 🎵` : 'Album 💿',
      language: a.language || '',
      tracksCount: parseInt(a.song_count || a.songs?.length, 10) || 6,
      description: `Official album released in ${a.year || '2024'}.`
    }));

    // Local matched albums
    const localMatches = FEATURED_ALBUMS.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.artist.toLowerCase().includes(query.toLowerCase())
    );

    const merged = [...localMatches];
    for (const sa of saavnAlbums) {
      if (!merged.some(m => m.title.toLowerCase() === sa.title.toLowerCase())) {
        merged.push(sa);
      }
    }

    res.json({ albums: merged });
  } catch (e) {
    const localMatches = FEATURED_ALBUMS.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.artist.toLowerCase().includes(query.toLowerCase())
    );
    res.json({ albums: localMatches });
  }
});

// 9. Album Details with Full Tracklist
router.get('/albums/:id', async (req, res) => {
  const { id } = req.params;
  const featured = FEATURED_ALBUMS.find(a => a.id === id || a.title.toLowerCase() === id.toLowerCase());

  let albumMeta = featured ? { ...featured } : {
    id,
    title: id.replace(/[-_]/g, ' '),
    artist: 'Various Artists',
    year: '2024',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    tracksCount: 0,
    badge: 'Soundtrack 💿',
    language: 'Telugu',
    description: 'Album soundtrack collection'
  };

  // 1. Check if album tracks exist in curated database
  let tracks = SPOTIFY_JIOSAAVN_TOP_SONGS.filter(s => {
    if (featured) {
      if (featured.id === 'album-animal-telugu') return s.category === 'Animal Blockbuster' || (s.album && s.album.includes('Animal'));
      if (featured.id === 'album-devara-part-1') return s.album && s.album.includes('Devara');
      if (featured.id === 'album-guntur-kaaram') return s.album && s.album.includes('Guntur Kaaram');
      if (featured.id === 'album-kalki-2898-ad') return s.album && s.album.includes('Kalki');
      if (featured.id === 'album-hi-nanna') return s.album && s.album.includes('Hi Nanna');
      if (featured.id === 'album-sita-ramam') return s.album && s.album.includes('Sita Ramam');
      if (featured.id === 'album-ala-vaikunthapurramuloo') return s.album && s.album.includes('Ala Vaikunthapurramuloo');
      if (featured.id === 'album-rrr-telugu') return s.album && s.album.includes('RRR');
    }
    return s.album && s.album.toLowerCase().includes(albumMeta.title.toLowerCase());
  });

  // 2. If fewer than 2 tracks found locally, search JioSaavn catalog for this album's full tracks
  if (tracks.length === 0) {
    try {
      const saavnQuery = albumMeta.title;
      const deepRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(saavnQuery)}&_format=json&_marker=0&ctx=web6dot0&n=25&p=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      const rawSongs = deepRes.data?.results || [];
      const seen = new Set();
      tracks = rawSongs
        .filter(s => {
          if (!s.id || seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        })
        .map(s => ({
          id: s.id,
          title: cleanHtml(s.song || s.title),
          artist: cleanHtml(s.singers || s.primary_artists || albumMeta.artist),
          album: cleanHtml(s.album || albumMeta.title),
          thumbnail: s.image ? s.image.replace('150x150', '500x500').replace('50x50', '500x500') : albumMeta.cover,
          duration: s.duration ? `${Math.floor(s.duration / 60)}:${(s.duration % 60).toString().padStart(2, '0')}` : '3:45',
          seconds: parseInt(s.duration, 10) || 225,
          year: s.year || albumMeta.year,
          language: s.language || albumMeta.language
        }));
    } catch (e) {}
  }

  albumMeta = {
    ...albumMeta,
    tracksCount: tracks.length || albumMeta.tracksCount,
    tracks
  };

  res.json({ album: albumMeta });
});

// 10. Artists List & Search
router.get('/artists', async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (!query) {
    return res.json({ artists: FEATURED_ARTISTS });
  }

  try {
    const searchRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getArtistResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&ctx=web6dot0&n=20&p=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000
    });

    const saavnArtists = (searchRes.data?.results || []).map(a => ({
      id: `saavn-artist-${a.id || a.artistid}`,
      name: cleanHtml(a.name || a.title),
      image: a.image ? a.image.replace('50x50', '500x500').replace('150x150', '500x500') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
      role: a.role || 'Playback Artist',
      monthlyListeners: `${(Math.floor(Math.random() * 20) + 10)}.${Math.floor(Math.random() * 9)}M`,
      badge: 'Featured ⭐',
      language: a.language || 'Telugu / Hindi',
      bio: `Renowned playback artist celebrated for chart-topping hits.`
    }));

    const localMatches = FEATURED_ARTISTS.filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase())
    );

    const merged = [...localMatches];
    for (const sa of saavnArtists) {
      if (!merged.some(m => m.name.toLowerCase() === sa.name.toLowerCase())) {
        merged.push(sa);
      }
    }

    res.json({ artists: merged });
  } catch (e) {
    const localMatches = FEATURED_ARTISTS.filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase())
    );
    res.json({ artists: localMatches });
  }
});

// 11. Artist Details & Top Songs
router.get('/artists/:id', async (req, res) => {
  const { id } = req.params;
  const featured = FEATURED_ARTISTS.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());

  let artistMeta = featured ? { ...featured } : {
    id,
    name: id.replace(/[-_]/g, ' '),
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    role: 'Music Artist',
    monthlyListeners: '15.2M',
    badge: 'Artist 🎵',
    language: 'Telugu',
    bio: 'Renowned music artist.'
  };

  // Find artist tracks locally first
  let songs = SPOTIFY_JIOSAAVN_TOP_SONGS.filter(s =>
    s.artist.toLowerCase().includes(artistMeta.name.toLowerCase())
  );

  // If fewer than 5 songs found locally, query JioSaavn catalog for artist top hits
  if (songs.length < 5) {
    try {
      const searchRes = await axios.get(`https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(artistMeta.name)}&_format=json&_marker=0&ctx=web6dot0&n=25&p=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      const rawSongs = searchRes.data?.results || [];
      const seen = new Set(songs.map(s => s.id));
      for (const s of rawSongs) {
        if (s.id && !seen.has(s.id)) {
          seen.add(s.id);
          songs.push({
            id: s.id,
            title: cleanHtml(s.song || s.title),
            artist: cleanHtml(s.singers || s.primary_artists || artistMeta.name),
            album: cleanHtml(s.album || 'Top Hits'),
            thumbnail: s.image ? s.image.replace('150x150', '500x500').replace('50x50', '500x500') : artistMeta.image,
            duration: s.duration ? `${Math.floor(s.duration / 60)}:${(s.duration % 60).toString().padStart(2, '0')}` : '3:45',
            seconds: parseInt(s.duration, 10) || 225,
            year: s.year || '2024',
            language: s.language || artistMeta.language
          });
        }
      }
    } catch (e) {}
  }

  // Find related albums for this artist
  const relatedAlbums = FEATURED_ALBUMS.filter(a =>
    a.artist.toLowerCase().includes(artistMeta.name.toLowerCase())
  );

  artistMeta = {
    ...artistMeta,
    topSongs: songs,
    albums: relatedAlbums
  };

  res.json({ artist: artistMeta });
});

// 12. Telugu Music Discovery Hub
router.get('/telugu', (req, res) => {
  const teluguSongs = SPOTIFY_JIOSAAVN_TOP_SONGS.filter(s => s.language === 'Telugu' || s.category === 'Telugu Hits' || s.category === 'Animal Blockbuster');
  const teluguAlbums = FEATURED_ALBUMS.filter(a => a.language && a.language.includes('Telugu'));
  const teluguArtists = FEATURED_ARTISTS.filter(a => a.language && a.language.includes('Telugu'));

  res.json({
    trending: teluguSongs.slice(0, 10),
    hits: teluguSongs.filter(s => s.category === 'Telugu Hits'),
    loveSongs: teluguSongs.filter(s => ['Chuttamalle', 'Samayama', 'Ammaadi', 'Inthandham', 'Kalaavathi', 'Evarevaro (Soul Version)'].includes(s.title)),
    movieSongs: teluguSongs,
    albums: teluguAlbums,
    artists: teluguArtists
  });
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
