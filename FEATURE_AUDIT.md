# SoundWave Feature Audit & Implementation Plan

## ✅ ALREADY EXISTS (DO NOT DUPLICATE)

### Core Player & Playback
- ✅ HTML5 Audio engine with singleton pattern
- ✅ Play/Pause/Next/Previous controls
- ✅ Seek/scrubber with live progress
- ✅ Volume control + mute
- ✅ Shuffle mode
- ✅ Loop/Repeat mode
- ✅ Web Audio API equalizer (3-band: bass/mid/treble)
- ✅ 5 EQ presets (Flat, Bass Boost, Vocal, Treble, Balanced)
- ✅ Sleep timer with countdown
- ✅ Mini-player (MusicPlayerBar.jsx)
- ✅ Full-screen Now Playing modal (NowPlayingModal.jsx)

### Queue Management
- ✅ Queue state management
- ✅ Add to Queue
- ✅ Play Next in Queue (playNextInQueue)
- ✅ Queue Drawer UI (QueueDrawer.jsx)
- ✅ Current track indicator

### Favorites & Playlists
- ✅ Like/Unlike songs (toggleFavorite)
- ✅ Favorites sync (localStorage + API)
- ✅ Create playlist (createPlaylist)
- ✅ Delete playlist (deletePlaylist)
- ✅ Add to playlist modal (PlaylistModal.jsx)
- ✅ Playlists state management

### Music Discovery
- ✅ Search (with debouncing support via NewMusicHomePage)
- ✅ Trending songs (52 curated tracks)
- ✅ Featured albums (8 albums)
- ✅ Featured artists (8 artists)
- ✅ Album detail modal (AlbumDetailModal.jsx)
- ✅ Artist detail modal (ArtistDetailModal.jsx)
- ✅ Telugu Hub content

### Track Actions
- ✅ Track Action Menu (TrackActionMenu.jsx) with:
  - Play Now
  - Add to Queue
  - Play Next
  - Like/Unlike
  - Add to Playlist
  - Go to Album
  - Go to Artist
  - Share (Web Share API + copy fallback)
  - Download

### Lyrics
- ✅ Lyrics Modal (LyricsModal.jsx)
- ✅ LRC timestamp parsing
- ✅ Synchronized scrolling
- ✅ Font size controls
- ✅ Timing offset adjuster (±0.5s)
- ✅ LRCLIB API integration

### Downloads/Offline
- ✅ Download manager (downloadManager.js)
- ✅ IndexedDB storage with blob URLs
- ✅ Download progress tracking
- ✅ Downloaded badge/state checks

### Statistics
- ✅ Stats Modal (StatsModal.jsx)
- ✅ Total minutes listened
- ✅ Total plays count
- ✅ Top 5 most played songs
- ✅ Top artists by play count
- ✅ Backend `/api/music/stats` endpoint

### History & Recommendations
- ✅ Recently played tracking (localStorage)
- ✅ User taste artists (localStorage)
- ✅ Backend `/api/music/history` endpoint
- ✅ Backend `/api/music/recommendations` endpoint

### UI Components
- ✅ Responsive grid layouts (2-6 columns based on viewport)
- ✅ Horizontal carousels with scroll snap
- ✅ Tab navigation (home/albums/artists/telugu/playlists/favorites/history/downloads)
- ✅ Toast notifications
- ✅ Loading states
- ✅ Keyboard shortcuts modal

### Backend APIs
- ✅ `/api/music/search` - Advanced search with filters
- ✅ `/api/music/suggestions` - Auto-complete
- ✅ `/api/music/trending` - Curated trending tracks
- ✅ `/api/music/stream/:videoId` - Multi-strategy stream resolution
- ✅ `/api/music/albums` - Featured albums
- ✅ `/api/music/artists` - Featured artists
- ✅ `/api/music/telugu` - Telugu hub
- ✅ `/api/music/lyrics` - LRCLIB lyrics API
- ✅ `/api/music/favorites` - CRUD
- ✅ `/api/music/playlists` - CRUD
- ✅ `/api/music/history` - Listening history
- ✅ `/api/music/stats` - User statistics

---

## 🚫 MISSING HIGH-VALUE FEATURES TO IMPLEMENT

### 1. SMART HOME SECTIONS (Priority: HIGH)
**Missing:**
- ❌ "Continue Listening" (resume from where you left off)
- ❌ "Because You Listened To..." (similar tracks)
- ❌ "Daily Mix" (personalized playlist generation)
- ❌ "New Releases" section on home
- ❌ Mood-based sections (Romantic, Party, Chill, Workout, Sleep)

**Implementation:**
- Add backend logic to `/api/music/recommendations` to return structured sections
- Extend `NewMusicHomePage` to render dynamic sections based on user history

---

### 2. DISCOVER/EXPLORE TAB (Priority: HIGH)
**Missing:**
- ❌ Dedicated Explore/Discover tab separate from Home
- ❌ Top Charts by region/language
- ❌ Decades filter (70s, 80s, 90s, 2000s, 2010s, 2020s)
- ❌ Mood categories grid
- ❌ Genre categories grid

**Implementation:**
- Create new `ExplorePage.jsx` component
- Add "Explore" tab to NewMusicHomePage navigation
- Backend: Add `/api/music/charts`, `/api/music/moods`, `/api/music/genres`

---

### 3. ENHANCED SEARCH (Priority: MEDIUM)
**Existing search is good but missing:**
- ❌ "Top Result" card (show best match prominently)
- ❌ Trending searches
- ❌ Clear search history
- ❌ Search filters UI (Songs/Artists/Albums/Playlists tabs in results)

**Implementation:**
- Enhance search results layout in `NewMusicHomePage`
- Add search history management to localStorage
- Add result category tabs

---

### 4. RADIO / AUTOPLAY (Priority: HIGH)
**Missing:**
- ❌ "Start Radio" from any song
- ❌ Automatic queue continuation when queue ends
- ❌ Similar tracks generation

**Implementation:**
- Add `startRadio(track)` to MusicContext
- Backend: `/api/music/radio/:trackId` - generate similar tracks
- Auto-fetch next tracks when queue has < 3 songs remaining

---

### 5. QUEUE IMPROVEMENTS (Priority: MEDIUM)
**Missing from existing QueueDrawer:**
- ❌ Reorder tracks (drag-and-drop)
- ❌ "Save Queue as Playlist"
- ❌ "Up Next" vs "Later" sections

**Implementation:**
- Add DnD library or implement manual reorder
- Add "Save Queue" button in QueueDrawer
- Split queue into "Up Next" (next 5) and "Later"

---

### 6. PLAYLIST ENHANCEMENTS (Priority: MEDIUM)
**Missing:**
- ❌ Playlist cover art generation/customization
- ❌ Playlist total duration display
- ❌ Sort playlist tracks (by date added, alphabetical, artist)
- ❌ Search within playlist

**Implementation:**
- Extend PlaylistModal with cover picker
- Add sorting dropdown in playlist views
- Calculate and display total duration

---

### 7. WRAPPED / YEAR IN REVIEW (Priority: LOW)
**Missing:**
- ❌ Yearly/monthly summary page
- ❌ Shareable wrapped cards

**Implementation:**
- Create `WrappedPage.jsx` showing top stats
- Generate shareable images
- Only show if sufficient listening data exists

---

### 8. OFFLINE IMPROVEMENTS (Priority: MEDIUM)
**Existing download system works, but missing:**
- ❌ Storage usage meter
- ❌ Download all songs in album/playlist
- ❌ Offline mode toggle/indicator

**Implementation:**
- Add IndexedDB size calculation
- Bulk download functionality
- Offline mode banner when network is unavailable

---

### 9. PLAYER ENHANCEMENTS (Priority: LOW)
**Missing:**
- ❌ Crossfade between tracks
- ❌ Playback speed control (0.5x - 2x)
- ❌ Resume last playback position on app restart

**Implementation:**
- Add crossfade using Web Audio API gain ramping
- Add speed selector in NowPlayingModal
- Persist playback position to localStorage

---

### 10. UI POLISH (Priority: HIGH)
**Missing:**
- ❌ Skeleton loaders for images/cards
- ❌ Smooth page transitions
- ❌ Better empty states with illustrations
- ❌ Proper error boundaries

**Implementation:**
- Create `SkeletonCard.jsx` component
- Add Framer Motion page transitions
- Design empty state components
- Add React Error Boundaries

---

### 11. SHARING ENHANCEMENTS (Priority: LOW)
**Existing share works via TrackActionMenu, but missing:**
- ❌ Share playlist
- ❌ Share album
- ❌ Share artist
- ❌ Generate shareable image cards

**Implementation:**
- Extend share functionality to albums/playlists/artists
- Generate Open Graph-style preview cards

---

## 📋 IMPLEMENTATION PRIORITY ORDER

### Phase 1: Core Experience (Implement First)
1. ✅ Smart Home Sections (Continue Listening, Daily Mix, Moods)
2. ✅ Radio / Autoplay
3. ✅ UI Polish (Skeletons, Empty States, Transitions)

### Phase 2: Discovery (Implement Second)
4. ✅ Explore/Discover Tab
5. ✅ Enhanced Search with Top Result
6. ✅ Queue Improvements

### Phase 3: Polish (Implement Third)
7. ✅ Playlist Enhancements
8. ✅ Offline Improvements
9. ✅ Player Enhancements (speed, crossfade)

### Phase 4: Optional (Time Permitting)
10. ⏸️ Wrapped / Year in Review
11. ⏸️ Sharing Enhancements

---

## 🔒 FROZEN (DO NOT TOUCH)
- ❌ ChatView.jsx
- ❌ DuoChatScreen.jsx
- ❌ SecretRoomModal.jsx
- ❌ SecretVaultModal.jsx
- ❌ PinUnlockModal.jsx
- ❌ VideoCallModal.jsx
- ❌ AudioCallModal.jsx
- ❌ IncomingCallModal.jsx
- ❌ RoomContext.jsx
- ❌ All Chat backend routes
- ❌ Socket.IO events
- ❌ WebRTC
- ❌ Database chat tables

---

## 🎯 NEXT STEPS

1. Start with **Smart Home Sections** to improve personalization
2. Add **Radio/Autoplay** for continuous listening
3. Create **Skeleton Loaders** and **Empty States** for polish
4. Build **Explore Tab** for better discovery
5. Test everything thoroughly
6. Run production build
7. Verify git diff shows no Chat modifications
