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
  Shuffle,
  User,
  Users,
  MoreVertical,
  ArrowRight,
  Headphones
} from 'lucide-react';
import { AlbumDetailModal } from '../components/AlbumDetailModal';
import { ArtistDetailModal } from '../components/ArtistDetailModal';
import { TrackActionMenu } from '../components/TrackActionMenu';
import {
  downloadTrack,
  getDownloadedTracks,
  subscribeDownloads,
  removeDownloadedTrack,
  clearDownloadedTracks,
  isTrackDownloaded
} from '../utils/downloadManager';

const SMART_SEARCHES = [
  { label: '🔥 Animal Telugu', query: 'album:Animal language:Telugu' },
  { label: '⚡ Devara Hits', query: 'album:Devara' },
  { label: '💚 Sid Sriram Hits', query: 'artist:"Sid Sriram"' },
  { label: '🎸 Rockstar Anirudh', query: 'artist:Anirudh' },
  { label: '🌙 Late-night chill', query: 'Lo-Fi Chill' },
  { label: '🏆 Spotify Telugu Top 50', query: 'genre:"Telugu Hits"' }
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
    createPlaylist,
    deletePlaylist,
    playPlaylist
  } = useMusic();

  // Navigation tab: explore | search | albums | artists | telugu | playlists | favorites | history | downloads
  const [activeTab, setActiveTab] = useState('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [activeCategory, setActiveCategory] = useState('All Songs');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [searchResults, setSearchResults] = useState([]);
  const [searchArtists, setSearchArtists] = useState([]);
  const [searchAlbums, setSearchAlbums] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [teluguData, setTeluguData] = useState(null);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('duocore_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  // Offline Downloads state
  const [downloadedTracks, setDownloadedTracks] = useState(getDownloadedTracks());
  const [downloadingMap, setDownloadingMap] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  // Modals state
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [selectedAlbumData, setSelectedAlbumData] = useState(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);

  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedArtistData, setSelectedArtistData] = useState(null);
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);

  const [selectedActionTrack, setSelectedActionTrack] = useState(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const suggestionTimerRef = useRef(null);

  // Toast feedback helper
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Subscribe to offline downloads updates
  useEffect(() => {
    const unsub = subscribeDownloads((list) => {
      setDownloadedTracks(list);
    });
    return unsub;
  }, []);

  // Fetch initial data: Trending, Albums, Artists, Telugu Hub
  useEffect(() => {
    api.getTrendingMusic()
      .then((res) => {
        if (res?.trending) {
          setTrendingTracks(res.trending);
          setSearchResults(res.trending);
        }
      })
      .catch(() => {});

    api.getAlbums()
      .then((res) => {
        if (res?.albums) setAlbums(res.albums);
      })
      .catch(() => {});

    api.getArtists()
      .then((res) => {
        if (res?.artists) setArtists(res.artists);
      })
      .catch(() => {});

    api.getTeluguHub()
      .then((res) => {
        if (res) setTeluguData(res);
      })
      .catch(() => {});

    api.getRecommendations()
      .then((res) => {
        if (res?.recommendations) {
          setRecommendations({
            recommendedForYou: res.recommendations,
            basedOn: res.basedOn
          });
        }
      })
      .catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (activeCategory === 'All Songs') {
        setSearchResults(trendingTracks);
      }
      setSearchArtists([]);
      setSearchAlbums([]);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedLanguage, selectedYear]);

  // Execute Search query
  const executeSearch = async (overrideQuery = null) => {
    const q = overrideQuery !== null ? overrideQuery : searchQuery;
    if (!q && !selectedLanguage && !selectedYear && activeCategory === 'All Songs') {
      setSearchResults(trendingTracks);
      return;
    }

    setLoading(true);
    try {
      const res = await api.searchMusicAdvanced({
        q,
        language: selectedLanguage !== 'All Languages' ? selectedLanguage : '',
        year: selectedYear !== 'All Years' ? selectedYear : '',
        category: activeCategory !== 'All Songs' ? activeCategory : ''
      });

      setSearchResults(res.results || res.tracks || []);
      setSearchArtists(res.artists || []);
      setSearchAlbums(res.albums || []);

      if (q && !recentSearches.includes(q)) {
        const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
        setRecentSearches(updated);
        try {
          localStorage.setItem('duocore_recent_searches', JSON.stringify(updated));
        } catch {}
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-suggestions debounce
  const handleQueryChange = (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    suggestionTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.getSearchSuggestions(val);
        setSuggestions(res.suggestions || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 150);
  };

  const handleSelectSuggestion = (s) => {
    setSearchQuery(s);
    setShowSuggestions(false);
    executeSearch(s);
  };

  // Voice Search (Telugu + English)
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice search not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'te-IN'; // Telugu with English fallback
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsVoiceSearching(true);
    recognition.onend = () => setIsVoiceSearching(false);
    recognition.onerror = () => setIsVoiceSearching(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setSearchQuery(transcript);
        executeSearch(transcript);
        showToast(`🎤 "${transcript}"`);
      }
    };

    recognition.start();
  };

  // Download Handler for track
  const handleDownload = async (track, e) => {
    e?.stopPropagation?.();
    if (!track?.id || downloadingMap[track.id]) return;

    setDownloadingMap(prev => ({ ...prev, [track.id]: true }));
    showToast(`⬇ Downloading "${track.title}"...`);

    try {
      await downloadTrack(track);
      showToast(`✓ "${track.title}" saved to Downloads!`);
    } catch (err) {
      showToast(`❌ Download failed: ${err.message || 'Stream error'}`);
    } finally {
      setDownloadingMap(prev => ({ ...prev, [track.id]: false }));
    }
  };

  // Open Album Modal
  const handleOpenAlbum = (albumIdOrName, albumObj = null) => {
    setSelectedAlbumId(albumIdOrName);
    setSelectedAlbumData(albumObj);
    setIsAlbumModalOpen(true);
  };

  // Open Artist Modal
  const handleOpenArtist = (artistIdOrName, artistObj = null) => {
    setSelectedArtistId(artistIdOrName);
    setSelectedArtistData(artistObj);
    setIsArtistModalOpen(true);
  };

  // Open Track Action Menu
  const handleOpenTrackMenu = (track, e) => {
    e?.stopPropagation?.();
    setSelectedActionTrack(track);
    setIsActionMenuOpen(true);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createPlaylist(newPlaylistName.trim(), 'Custom Playlist');
      setNewPlaylistName('');
      setCreatingPlaylist(false);
      showToast('Playlist created!');
    } catch {
      showToast('Failed to create playlist');
    }
  };

  const featuredSong = trendingTracks[0] || {
    id: 'K4Nkmr0K',
    title: 'Nanna Nuv Naa Pranam',
    artist: 'Sonu Nigam, Harshavardhan Rameshwar',
    album: 'Animal (Telugu)',
    thumbnail: 'https://c.saavncdn.com/466/Nanna-Nuv-Naa-Pranam-From-ANIMAL-TELUGU-Telugu-2023-20231114011010-500x500.jpg',
    duration: '3:45'
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-6 pb-28">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl shadow-emerald-500/40 animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* Album Detail Modal */}
      <AlbumDetailModal
        albumId={selectedAlbumId}
        albumData={selectedAlbumData}
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        onOpenArtist={(art) => {
          setIsAlbumModalOpen(false);
          handleOpenArtist(art);
        }}
      />

      {/* Artist Detail Modal */}
      <ArtistDetailModal
        artistId={selectedArtistId}
        artistData={selectedArtistData}
        isOpen={isArtistModalOpen}
        onClose={() => setIsArtistModalOpen(false)}
        onOpenAlbum={(albId, albData) => {
          setIsArtistModalOpen(false);
          handleOpenAlbum(albId, albData);
        }}
      />

      {/* Track Action Menu */}
      <TrackActionMenu
        track={selectedActionTrack}
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        onOpenAlbum={(alb) => handleOpenAlbum(alb)}
        onOpenArtist={(art) => handleOpenArtist(art)}
        onShowToast={showToast}
      />

      {/* Search Header Bar */}
      <div className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search songs, artists, albums, or type artist:Sid album:Animal..."
              className="w-full pl-11 pr-24 py-3 sm:py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm font-medium placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(trendingTracks);
                    setShowSuggestions(false);
                  }}
                  className="p-1.5 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleVoiceSearch}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
                  isVoiceSearching
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-emerald-400'
                }`}
                title="Telugu & English Voice Search"
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all shrink-0 ${
              showFilters || selectedLanguage !== 'All Languages' || selectedYear !== 'All Years'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Search Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Auto Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="relative z-30">
            <div className="absolute top-1 left-0 right-0 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden py-1">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-4 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-3 text-xs sm:text-sm text-slate-200 hover:text-emerald-400 transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Language</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
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
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Release Year</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {YEARS.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
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
          </div>
        )}

        {/* Smart Search Quick Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 shrink-0">Smart:</span>
          {SMART_SEARCHES.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setSearchQuery(item.query);
                executeSearch(item.query);
              }}
              className="shrink-0 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900 hover:border-emerald-500/50 hover:text-emerald-300 text-[11px] font-bold text-slate-300 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Music Library Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'explore', label: 'Explore', icon: Compass },
            { id: 'albums', label: 'Albums', icon: Disc3 },
            { id: 'artists', label: 'Artists', icon: User },
            { id: 'telugu', label: 'Telugu Hub', icon: Flame },
            { id: 'playlists', label: `Playlists (${playlists.length})`, icon: ListPlus },
            { id: 'favorites', label: `Liked (${favorites.length})`, icon: Heart },
            { id: 'history', label: 'History', icon: History },
            { id: 'downloads', label: `Downloads (${downloadedTracks.length})`, icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            onClick={openStats}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all"
            title="Listening Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXPLORE & HOME FEED                                                */}
      {/* ========================================================================= */}
      {activeTab === 'explore' && (
        <div className="space-y-8 animate-in fade-in">
          
          {/* Featured Hero Banner */}
          {!searchQuery && (
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center md:text-left z-10">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SPOTIFY #1 TRENDING TELUGU</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{featuredSong.title}</h2>
                <p className="text-xs sm:text-sm text-emerald-400 font-semibold">{featuredSong.artist}</p>

                <div className="flex items-center justify-center md:justify-start gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      playTrack(featuredSong, trendingTracks);
                      openNowPlaying();
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 transition-transform active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Track</span>
                  </button>

                  <button
                    onClick={(e) => handleDownload(featuredSong, e)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="relative w-36 h-36 sm:w-48 sm:h-48 shrink-0 z-10">
                <img
                  src={featuredSong.thumbnail}
                  alt={featuredSong.title}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
                  }}
                  className="w-full h-full rounded-2xl object-cover shadow-2xl ring-4 ring-emerald-500/40"
                />
              </div>
            </div>
          )}

          {/* Categorized Search Results: Artists & Albums */}
          {searchQuery && searchArtists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>Matching Artists</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {searchArtists.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => handleOpenArtist(art.id, art)}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer flex items-center gap-3 group transition-all"
                  >
                    <img
                      src={art.image}
                      alt={art.name}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                      }}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400">{art.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{art.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchAlbums.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-emerald-400" />
                <span>Matching Albums</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {searchAlbums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => handleOpenAlbum(alb.id, alb)}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 cursor-pointer flex items-center gap-3 group transition-all"
                  >
                    <img
                      src={alb.cover}
                      alt={alb.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                      }}
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400">{alb.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{alb.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🦁 ANIMAL Blockbuster Showcase Row */}
          {!searchQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Animal (Telugu & Hindi Blockbuster)</span>
                </h3>
                <button
                  onClick={() => handleOpenAlbum('album-animal-telugu')}
                  className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1"
                >
                  <span>View Full Album</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {trendingTracks.filter(s => s.category === 'Animal Blockbuster' || (s.album && s.album.includes('Animal'))).slice(0, 6).map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track, trendingTracks)}
                      className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 cursor-pointer group transition-all"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-slate-800">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isThisPlaying ? (
                            <Pause className="w-6 h-6 text-amber-400 fill-current" />
                          ) : (
                            <Play className="w-6 h-6 text-amber-400 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400">{track.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Songs Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>{searchQuery ? `Search Results for "${searchQuery}"` : 'Top Trending Tracks'}</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">{searchResults.length} Songs</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-800/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isFavorite(track.id);
                  const isDl = isTrackDownloaded(track.id);
                  const isDlLoading = downloadingMap[track.id];

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
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800">
                          <img
                            src={track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop'}
                            alt={track.title}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                            }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isThisPlaying ? (
                              <Pause className="w-5 h-5 text-emerald-400 fill-current" />
                            ) : (
                              <Play className="w-5 h-5 text-emerald-400 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {track.artist}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {track.duration}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Download button */}
                        <button
                          onClick={(e) => handleDownload(track, e)}
                          disabled={isDlLoading}
                          className={`p-1.5 rounded-xl transition-all ${
                            isDl
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : isDlLoading
                              ? 'text-cyan-400 animate-pulse'
                              : 'text-slate-500 hover:text-white hover:bg-slate-800'
                          }`}
                          title={isDl ? 'Downloaded' : 'Download Track'}
                        >
                          {isDlLoading ? (
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          ) : isDl ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Like button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track);
                          }}
                          className={`p-1.5 rounded-xl transition-transform active:scale-90 ${
                            liked ? 'text-rose-500' : 'text-slate-500 hover:text-white'
                          }`}
                          title={liked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                        </button>

                        {/* More menu */}
                        <button
                          onClick={(e) => handleOpenTrackMenu(track, e)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                          title="More Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
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
      {/* TAB 2: ALBUMS SECTION                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'albums' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-emerald-400" />
                <span>Albums & Soundtracks</span>
              </h3>
              <p className="text-xs text-slate-400">High-fidelity curated soundtracks and official albums</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((alb) => (
              <div
                key={alb.id}
                onClick={() => handleOpenAlbum(alb.id, alb)}
                className="p-3.5 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer group transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-800 shadow-lg">
                    <img
                      src={alb.cover}
                      alt={alb.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-emerald-400 border border-white/10">
                      {alb.badge || 'ALBUM 💿'}
                    </div>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-11 h-11 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {alb.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {alb.artist}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-3 pt-2 border-t border-slate-800/60">
                  <span>{alb.year || '2024'}</span>
                  <span>{alb.tracksCount || 6} Tracks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ARTISTS SECTION                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'artists' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                <span>Featured Artists</span>
              </h3>
              <p className="text-xs text-slate-400">Discover top composers, singers, and producers</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artists.map((art) => (
              <div
                key={art.id}
                onClick={() => handleOpenArtist(art.id, art)}
                className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 cursor-pointer group transition-all text-center flex flex-col items-center"
              >
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden mb-3 bg-slate-800 shadow-xl border-2 border-slate-800 group-hover:border-cyan-400 transition-colors">
                  <img
                    src={art.image}
                    alt={art.name}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[9px] font-mono text-cyan-300 font-bold mb-1">
                  {art.badge || 'VERIFIED ⭐'}
                </span>
                <h4 className="text-sm font-bold text-white truncate max-w-full group-hover:text-cyan-400 transition-colors">
                  {art.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate max-w-full mt-0.5">
                  {art.role}
                </p>
                <span className="text-[10px] text-slate-500 font-mono mt-2">
                  {art.monthlyListeners || '15M+'} Listeners
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TELUGU MUSIC HUB                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'telugu' && (
        <div className="space-y-8 animate-in fade-in">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-400" />
              <span>Telugu Music Discovery</span>
            </h3>
            <p className="text-xs text-slate-400">Trending Tollywood hits, soulful melodies, and blockbuster albums</p>
          </div>

          {/* Telugu Blockbuster Albums */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-emerald-400 font-bold">Top Telugu Soundtracks</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(teluguData?.albums || albums.filter(a => a.language?.includes('Telugu'))).map((alb) => (
                <div
                  key={alb.id}
                  onClick={() => handleOpenAlbum(alb.id, alb)}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 cursor-pointer group transition-all"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-slate-800">
                    <img
                      src={alb.cover}
                      alt={alb.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h5 className="text-xs font-bold text-white truncate group-hover:text-emerald-400">{alb.title}</h5>
                  <p className="text-[10px] text-slate-500 truncate">{alb.artist}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Telugu Hits Tracks */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold">Chartbuster Songs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(teluguData?.hits || trendingTracks.filter(s => s.language === 'Telugu')).map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, teluguData?.hits || trendingTracks)}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                      }}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400">{track.title}</h5>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleOpenTrackMenu(track, e)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-white"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OFFLINE DOWNLOADS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'downloads' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <span>Downloaded Music ({downloadedTracks.length})</span>
              </h3>
              <p className="text-xs text-slate-400">Authorized audio files saved for offline listening</p>
            </div>

            {downloadedTracks.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all downloaded songs from offline library?')) {
                    clearDownloadedTracks();
                    showToast('Cleared offline library');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all"
              >
                Clear All
              </button>
            )}
          </div>

          {downloadedTracks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
              <Download className="w-12 h-12 mx-auto text-slate-700" />
              <h4 className="text-sm font-bold text-slate-300">No Downloaded Songs Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tap the download icon on any song, album, or now-playing view to save authorized audio for offline listening.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {downloadedTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id || idx}
                    onClick={() => playTrack(track, downloadedTracks)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isCurrent
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/20'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-500 w-5 text-center">{idx + 1}</span>
                      <img
                        src={track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop'}
                        alt={track.title}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
                        }}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                        Offline Ready
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDownloadedTrack(track.id);
                          showToast(`Removed "${track.title}" from downloads`);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                        title="Remove from Downloads"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CUSTOM PLAYLISTS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'playlists' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-emerald-400" />
                <span>Your Playlists</span>
              </h3>
              <p className="text-xs text-slate-400">Custom organized collections</p>
            </div>

            <button
              onClick={() => setCreatingPlaylist(true)}
              className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Playlist</span>
            </button>
          </div>

          {creatingPlaylist && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center gap-2 animate-in fade-in">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name..."
                className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleCreatePlaylist}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
              >
                Save
              </button>
              <button
                onClick={() => setCreatingPlaylist(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
              <FolderPlus className="w-12 h-12 mx-auto text-slate-700" />
              <h4 className="text-sm font-bold text-slate-300">No Playlists Created</h4>
              <p className="text-xs text-slate-500">Create your first playlist and add your favorite tracks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => playPlaylist(pl)}
                  className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Music className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400">{pl.name}</h4>
                      <p className="text-xs text-slate-400">{pl.songCount || pl.songs?.length || 0} songs</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlaylist(pl.id);
                      showToast('Deleted playlist');
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: LIKED SONGS                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'favorites' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-current" />
                <span>Liked Songs ({favorites.length})</span>
              </h3>
              <p className="text-xs text-slate-400">Your personal favorite library</p>
            </div>

            {favorites.length > 0 && (
              <button
                onClick={playAllFavorites}
                className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/30 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play All</span>
              </button>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
              <Heart className="w-12 h-12 mx-auto text-slate-700" />
              <h4 className="text-sm font-bold text-slate-300">No Liked Songs Yet</h4>
              <p className="text-xs text-slate-500">Tap the heart icon on any song to add it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {favorites.map((track, idx) => (
                <div
                  key={track.id || idx}
                  onClick={() => playTrack(track, favorites)}
                  className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-5 text-center">{idx + 1}</span>
                    <img
                      src={track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop'}
                      alt={track.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
                      }}
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400">{track.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track);
                      }}
                      className="p-2 text-rose-500 hover:scale-110 transition-transform"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={(e) => handleOpenTrackMenu(track, e)}
                      className="p-1.5 text-slate-500 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: LISTENING HISTORY                                                  */}
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
            <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
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
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
                      }}
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-slate-500">{track.duration}</span>
                    <button
                      onClick={(e) => handleOpenTrackMenu(track, e)}
                      className="p-1.5 text-slate-500 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
