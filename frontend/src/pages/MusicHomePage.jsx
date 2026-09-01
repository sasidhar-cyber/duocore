import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import {
  Search,
  Mic,
  Play,
  Pause,
  Download,
  Heart,
  Sparkles,
  TrendingUp,
  Music,
  Compass,
  Radio,
  Flame,
  Clock,
  Disc3,
  Layers,
  History,
  Check,
  Plus,
  Trash2,
  FolderPlus,
  BarChart3,
  SlidersHorizontal,
  X,
  ListPlus,
  Keyboard,
  Shuffle
} from 'lucide-react';

const SMART_SEARCHES = [
  { label: '🔥 Animal Telugu', query: 'album:Animal language:Telugu' },
  { label: '💚 Telugu Love', query: 'genre:"Telugu Hits"' },
  { label: '🌙 Late-night chill', query: 'Lo-Fi Chill' },
  { label: '⚡ 2024 Hits', query: 'year:2024' }
];

const GENRE_TAGS = [
  'All Songs',
  'Telugu Hits',
  'Bollywood Hits',
  'Global Pop',
  'Rock & Classics',
  'Lo-Fi Chill'
];

const LANGUAGES = ['All Languages', 'Telugu', 'Hindi', 'English', 'Tamil'];
const YEARS = ['All Years', '2024', '2023', '2022', '2020s', '2010s'];

export function MusicHomePage({ onOpenPinPrompt }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    favorites,
    playlists,
    recentlyPlayed,
    userTasteArtists,
    toggleFavorite,
    isFavorite,
    playAllFavorites,
    openNowPlaying,
    openPlaylistModal,
    openStats,
    openShortcutsHelp,
    openSecretChat,
    createPlaylist,
    deletePlaylist,
    playPlaylist
  } = useMusic();

  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'playlists' | 'favorites' | 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [activeCategory, setActiveCategory] = useState('All Songs');
  const [showFilters, setShowFilters] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('soundwave_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const suggestionTimerRef = useRef(null);

  // Load trending preset tracks, curated albums & recommendations
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTrendingMusic(),
      api.getRecommendations().catch(() => null)
    ])
      .then(([trendRes, recRes]) => {
        setTrendingTracks(trendRes.trending || []);
        setSearchResults(trendRes.trending || []);
        setAlbums(trendRes.albums || []);
        if (recRes) setRecommendations(recRes);
      })
      .catch((err) => console.warn('Failed to load music feed:', err))
      .finally(() => setLoading(false));
  }, []);

  // Save recent searches
  useEffect(() => {
    localStorage.setItem('soundwave_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Handle Search Input (Auto-suggestions & Stealth Chat Trigger)
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    // Stealth Command Interceptor
    if (q.trim() === '//chat' || q.trim() === '//vault' || q.trim() === '//duo') {
      setSearchQuery('');
      if (onOpenPinPrompt) onOpenPinPrompt();
      return;
    }

    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);

    if (q.trim().length >= 2) {
      suggestionTimerRef.current = setTimeout(() => {
        api.getSearchSuggestions(q.trim())
          .then((res) => setSuggestions(res.suggestions || []))
          .catch(() => setSuggestions([]));
      }, 250);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      if (!q.trim()) setSearchResults(trendingTracks);
    }
  };

  const executeSearch = async (customQuery = null) => {
    const q = customQuery !== null ? customQuery : searchQuery;
    setShowSuggestions(false);
    if (!q.trim() && selectedLanguage === 'All Languages' && selectedYear === 'All Years') {
      setSearchResults(trendingTracks);
      return;
    }

    // Save to recent searches
    if (q.trim()) {
      setRecentSearches((prev) => [q.trim(), ...prev.filter((s) => s.toLowerCase() !== q.trim().toLowerCase())].slice(0, 8));
    }

    setLoading(true);
    try {
      const res = await api.searchMusicAdvanced({
        q: q.trim(),
        language: selectedLanguage !== 'All Languages' ? selectedLanguage : '',
        year: selectedYear !== 'All Years' ? selectedYear : '',
        category: activeCategory !== 'All Songs' ? activeCategory : ''
      });
      setSearchResults(res.results || []);
      if (res.albums) setAlbums(res.albums);
    } catch (err) {
      console.warn('Music search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (sug) => {
    setSearchQuery(sug);
    setShowSuggestions(false);
    executeSearch(sug);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported by this browser. Try Chrome on your phone.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'te-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsVoiceSearching(true);
    recognition.onresult = (event) => {
      const spokenQuery = event.results?.[0]?.[0]?.transcript || '';
      setSearchQuery(spokenQuery);
      executeSearch(spokenQuery);
    };
    recognition.onerror = () => setIsVoiceSearching(false);
    recognition.onend = () => setIsVoiceSearching(false);
    recognition.start();
  };

  const handleSelectCategory = async (cat) => {
    setActiveCategory(cat);
    if (cat === 'All Songs') {
      setSearchResults(trendingTracks);
      return;
    }

    const filtered = trendingTracks.filter((t) => t.category === cat);
    if (filtered.length > 0) {
      setSearchResults(filtered);
    } else {
      executeSearch(cat);
    }
  };

  const handleAlbumClick = (album) => {
    setSearchQuery(album.title);
    executeSearch(album.title);
  };

  const handleDownload = (track, e) => {
    e.stopPropagation();
    const downloadUrl = api.getMusicDownloadUrl(track.id, `${track.artist} - ${track.title}`);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${track.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setCreatingPlaylist(true);
    try {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
    } catch {
      alert('Could not create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const featuredSong = trendingTracks.find((track) => track.id === 'yXAasilI') || {
    id: 'yXAasilI',
    title: 'Evarevaro (Soul Version)',
    artist: 'Vishal Mishra, Anantha Sriram - ANIMAL (Telugu)',
    duration: '3:45',
    thumbnail: 'https://c.saavncdn.com/420/Evarevaro-Soul-Version-From-ANIMAL-Telugu-2023-20231223151007-500x500.jpg'
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-8 pb-36 max-w-7xl mx-auto space-y-8 select-none">
      {/* Top Search & Filter Bar */}
      <div className="relative max-w-3xl mx-auto space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search songs, artists, albums, movies (A to Z)..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500/60 text-sm text-white placeholder:text-slate-500 shadow-xl focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(trendingTracks); }}
                className="absolute right-3 top-3.5 p-1 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleVoiceSearch}
              title="Search by voice"
              className={`absolute ${searchQuery ? 'right-10' : 'right-3'} top-3 p-1.5 rounded-lg transition-colors ${isVoiceSearching ? 'text-red-400 animate-pulse' : 'text-slate-500 hover:text-emerald-400'}`}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Auto Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-emerald-400 flex items-center gap-2 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => executeSearch()}
            className="px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-transform active:scale-95 shrink-0 shadow-lg shadow-emerald-500/30"
          >
            Search
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3.5 rounded-2xl border transition-all ${
              showFilters || selectedLanguage !== 'All Languages' || selectedYear !== 'All Years'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Filter by Language & Year"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Expand Row (Language & Year) */}
        {showFilters && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 animate-in fade-in space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold shrink-0">Language:</span>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setSelectedLanguage(lang); }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedLanguage === lang
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold shrink-0">Year:</span>
                {YEARS.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => { setSelectedYear(yr); }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedYear === yr
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => executeSearch()}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 shrink-0">Smart search</span>
          {SMART_SEARCHES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setSearchQuery(item.query); executeSearch(item.query); }}
              className="shrink-0 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900 hover:border-emerald-500/50 hover:text-emerald-300 text-[11px] font-bold text-slate-300 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 px-1">Try: <span className="text-slate-400">artist:Sid album:Animal year:2024</span> — or tap the mic and say a song name.</p>

        {/* Recent Searches Pills */}
        {!searchQuery && recentSearches.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold shrink-0">Recent:</span>
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => handleSelectSuggestion(s)}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 hover:text-emerald-400 whitespace-nowrap transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Navigation Tabs: Explore | Playlists | Favorites | History */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'explore'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Explore Songs</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'playlists'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListPlus className="w-4 h-4" />
            <span>Playlists ({playlists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Liked Songs ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Listening History</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={openStats}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all"
            title="View Listening Statistics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={openShortcutsHelp}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXPLORE SONGS & HOME FEED                                         */}
      {/* ========================================================================= */}
      {activeTab === 'explore' && (
        <div className="space-y-8">
          {/* Featured Hero Banner (Only when not searching) */}
          {!searchQuery && (
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center md:text-left z-10">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SPOTIFY #1 TRENDING TRACK</span>
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white">{featuredSong.title}</h2>
                <p className="text-sm text-emerald-400 font-semibold">{featuredSong.artist}</p>

                <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                  <button
                    onClick={() => {
                      playTrack(featuredSong, trendingTracks);
                      openNowPlaying();
                    }}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/40 transition-transform active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Full Track</span>
                  </button>

                  <button
                    onClick={(e) => handleDownload(featuredSong, e)}
                    className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700 flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download MP3</span>
                  </button>
                </div>
              </div>

              <div className="relative w-44 h-44 sm:w-56 sm:h-56 shrink-0 z-10">
                <img
                  src={featuredSong.thumbnail}
                  alt={featuredSong.title}
                  className="w-full h-full rounded-3xl object-cover shadow-2xl ring-4 ring-emerald-500/40 animate-pulse"
                />
              </div>

              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            </div>
          )}

          {/* ✨ RECOMMENDED FOR YOU */}
          {!searchQuery && recommendations?.recommendedForYou?.length > 0 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>Recommended For You</span>
                </h3>
                <span className="text-xs text-emerald-400 font-mono font-bold">Rule-Based Curation</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {recommendations.recommendedForYou.slice(0, 6).map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playTrack(track, recommendations.recommendedForYou);
                        openNowPlaying();
                      }}
                      className="p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isThisPlaying ? (
                            <Pause className="w-6 h-6 text-emerald-400 fill-current" />
                          ) : (
                            <Play className="w-6 h-6 text-emerald-400 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate group-hover:text-emerald-400">{track.title}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOP ALBUMS & PLAYLISTS SECTION */}
          {!searchQuery && albums.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Disc3 className="w-5 h-5 text-emerald-400" />
                  <span>Trending Albums & Charts</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Spotify / JioSaavn</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => handleAlbumClick(album)}
                    className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2.5 shadow-lg"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden">
                      <img
                        src={album.cover}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-emerald-400 border border-white/10">
                        {album.badge}
                      </div>
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {album.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {album.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Genre Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {GENRE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSelectCategory(tag)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === tag
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Songs Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>{searchQuery ? `Search Results for "${searchQuery}"` : activeCategory}</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">{searchResults.length} Tracks Available</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-800 rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-slate-800 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <p className="text-sm text-slate-400">No tracks found matching your query.</p>
                <button
                  onClick={() => handleSelectCategory('All Songs')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-emerald-400 font-bold text-xs border border-slate-800"
                >
                  Browse All Songs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {searchResults.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isFavorite(track.id);

                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => {
                        playTrack(track, searchResults);
                        openNowPlaying();
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative overflow-hidden ${
                        isCurrent
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                          : 'bg-slate-900/70 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isThisPlaying ? (
                              <Pause className="w-6 h-6 text-emerald-400 fill-current" />
                            ) : (
                              <Play className="w-6 h-6 text-emerald-400 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            {track.artist}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {track.duration}
                          </span>
                        </div>
                      </div>

                      {/* Actions: Add to Playlist, Download & Like */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPlaylistModal(track);
                          }}
                          className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                          title="Add to Playlist"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track);
                          }}
                          className={`p-2 rounded-xl transition-transform active:scale-90 ${
                            liked ? 'text-emerald-400' : 'text-slate-500 hover:text-white'
                          }`}
                          title={liked ? 'Liked' : 'Like'}
                        >
                          <Heart className={`w-4 h-4 ${liked ? 'fill-emerald-400' : ''}`} />
                        </button>

                        <button
                          onClick={(e) => handleDownload(track, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                          title="Download MP3"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOM PLAYLISTS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'playlists' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Your Playlists</h3>
              <p className="text-xs text-slate-400">Create and curate your custom music collections</p>
            </div>

            <form onSubmit={handleCreatePlaylistSubmit} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Playlist Name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 w-48 sm:w-60"
              />
              <button
                type="submit"
                disabled={creatingPlaylist || !newPlaylistName.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-transform active:scale-95 disabled:opacity-40"
              >
                + Create
              </button>
            </form>
          </div>

          {playlists.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3 glass-panel rounded-3xl border border-slate-800 p-8">
              <FolderPlus className="w-12 h-12 mx-auto text-slate-600" />
              <h4 className="text-sm font-bold text-slate-300">No playlists yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Type a playlist name above to create your first playlist, or click '+' on any song to add it!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                        🎵
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate">{pl.name}</h4>
                        <span className="text-[11px] font-mono text-slate-400">{pl.track_count || 0} tracks</span>
                      </div>
                    </div>

                    <button
                      onClick={() => deletePlaylist(pl.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => playPlaylist(pl.id, false)}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>

                    <button
                      onClick={() => playPlaylist(pl.id, true)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                      title="Shuffle Playlist"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIKED SONGS & FAVORITES                                            */}
      {/* ========================================================================= */}
      {activeTab === 'favorites' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                <span>Liked Songs</span>
              </h3>
              <p className="text-xs text-slate-400">{favorites.length} songs in your favorites</p>
            </div>

            {favorites.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playAllFavorites(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play All</span>
                </button>

                <button
                  onClick={() => playAllFavorites(true)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Shuffle Favorites"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3 glass-panel rounded-3xl border border-slate-800 p-8">
              <Heart className="w-12 h-12 mx-auto text-slate-700" />
              <h4 className="text-sm font-bold text-slate-300">No Liked Songs Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tap the heart icon on any song to save it to your favorites list!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {favorites.map((track, idx) => (
                <div
                  key={track.id || idx}
                  onClick={() => {
                    playTrack(track, favorites);
                    openNowPlaying();
                  }}
                  className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(track);
                    }}
                    className="p-2 text-emerald-400 hover:text-red-400"
                    title="Remove from favorites"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LISTENING HISTORY                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <span>Recently Played Tracks</span>
              </h3>
              <p className="text-xs text-slate-400">{recentlyPlayed.length} songs in history</p>
            </div>

            <button
              onClick={openStats}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 font-bold text-xs flex items-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Full Analytics</span>
            </button>
          </div>

          {recentlyPlayed.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3 glass-panel rounded-3xl border border-slate-800 p-8">
              <History className="w-12 h-12 mx-auto text-slate-700" />
              <h4 className="text-sm font-bold text-slate-300">No Listening History</h4>
              <p className="text-xs text-slate-500">Play some tracks to start building your history!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentlyPlayed.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => {
                    playTrack(track, recentlyPlayed);
                    openNowPlaying();
                  }}
                  className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-5 text-center">{idx + 1}</span>
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-slate-500">{track.duration}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
