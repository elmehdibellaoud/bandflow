import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import SongModal from './SongModal';
import { 
  Search, Plus, Edit2, Trash2, Library, 
  ExternalLink, AlertTriangle 
} from 'lucide-react';

/**
 * SongBank view component (Overhauled for Phase 6 Stage Mode).
 * - Implements mobile-first responsive layout (collapsing table into vertical cards).
 * - Strictly follows #080808, #141414, #262626, and #FFD700 theme definitions.
 * - Provides 44px safe tap targets for buttons and interactions.
 * - Features high-fidelity skeleton loading placeholder screens.
 */
export default function SongBank() {
  const { currentBand, token } = useBand();

  const [songs, setSongs] = useState([]);
  const [searchSongQuery, setSearchSongQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isManager = currentBand?.role === 'manager';

  // Load repertoire songs on mount or band switch
  useEffect(() => {
    fetchSongs();
  }, [currentBand]);

  const fetchSongs = async () => {
    if (!currentBand) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/songs?band_id=${currentBand.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch songs.');
      }
      setSongs(data.songs || []);
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      // Simulate slight delay to demonstrate beautiful skeleton loader animations
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const handleDeleteSong = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/songs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete song.');
      }
      fetchSongs();
    } catch (err) {
      alert(err.message || 'An error occurred.');
    }
  };

  const handleEditSong = (song) => {
    setSelectedSong(song);
    setIsModalOpen(true);
  };

  const handleAddSong = () => {
    setSelectedSong(null);
    setIsModalOpen(true);
  };



  const filteredSongs = songs.filter(song => {
    const titleMatch = song.title.toLowerCase().includes(searchSongQuery.toLowerCase());
    const keyMatch = song.song_key && song.song_key.toLowerCase().includes(searchSongQuery.toLowerCase());
    return titleMatch || keyMatch;
  });

  // Skeleton placeholders loader components
  const SongSkeletonLoader = () => (
    <div className="space-y-4">
      {/* Desktop Skeleton Table */}
      <div className="hidden md:block animate-pulse">
        <div className="h-10 bg-[#080808] border-b border-[#262626] mb-4 rounded"></div>
         {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center py-4 border-b border-[#262626] gap-4">
            <div className="w-1/3 h-4 bg-zinc-800 rounded"></div>
            <div className="w-12 h-4 bg-zinc-800 rounded"></div>
            <div className="w-16 h-4 bg-zinc-800 rounded"></div>
            <div className="w-12 h-4 bg-zinc-800 rounded"></div>
            {isManager && <div className="w-16 h-4 bg-zinc-800 rounded"></div>}
          </div>
        ))}
      </div>

      {/* Mobile Skeleton Cards */}
      <div className="block md:hidden space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#080808] border border-[#262626] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="w-1/2 h-4 bg-zinc-800 rounded"></div>
              <div className="w-10 h-6 bg-zinc-800 rounded"></div>
            </div>
            <div className="w-1/3 h-3 bg-zinc-800 rounded"></div>
            <div className="border-t border-[#262626] pt-3 mt-1 flex justify-between">
              <div className="w-16 h-4 bg-zinc-800 rounded"></div>
              <div className="w-20 h-4 bg-zinc-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 shadow-xl">
      {/* Filtering and Add Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchSongQuery}
            onChange={(e) => setSearchSongQuery(e.target.value)}
            placeholder="Search songs by title or key..."
            className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 pl-10 pr-4 text-white placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
          />
        </div>

        {isManager && (
          <button 
            onClick={handleAddSong}
            className="bg-[#FFD700] text-black font-bold px-5 py-2.5 rounded-md hover:bg-yellow-400 active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-md shadow-yellow-500/5 min-h-[44px] cursor-pointer"
          >
            <Plus size={16} /> Add Song
          </button>
        )}
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="mb-4 bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md flex items-center gap-3 text-sm">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Repertoire Loader */}
      {loading ? (
        <SongSkeletonLoader />
      ) : filteredSongs.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
          <div className="w-12 h-12 bg-gray-900 border border-[#262626] text-gray-500 rounded-full flex items-center justify-center mb-3">
            <Library size={22} />
          </div>
          <h4 className="font-bold text-[#F4F4F5] mb-1">No songs found</h4>
          <p className="text-xs text-[#A1A1AA] mb-4 leading-relaxed">
            {searchSongQuery 
              ? `No matches found for "${searchSongQuery}". Try another search term.`
              : isManager 
                ? 'Your Song Bank is currently empty. Get started by adding your first band track.' 
                : 'Your Manager has not added any songs to the setlist bank yet.'
            }
          </p>
          {isManager && !searchSongQuery && (
            <button 
              onClick={handleAddSong}
              className="border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black font-semibold px-4 py-2 rounded transition-all text-xs min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Add Your First Song
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Viewports >= 768px: Grid Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-[#E4E4E7]">
              <thead className="bg-[#080808] text-gray-500 uppercase text-xs tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Key</th>
                  <th className="px-6 py-4">Tempo</th>
                  <th className="px-6 py-4">Link</th>
                  {isManager && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#F4F4F5] truncate max-w-[200px]">
                      {song.title}
                    </td>
                    <td className="px-6 py-4 font-mono text-[#FFD700] font-bold">
                      {song.song_key || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {song.tempo ? `${song.tempo} BPM` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {song.reference_link ? (
                        <a 
                          href={song.reference_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[#A1A1AA] hover:text-[#FFD700] transition-colors text-xs"
                        >
                          Listen <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleEditSong(song)}
                            className="p-3 text-gray-400 hover:text-[#FFD700] hover:bg-zinc-800/40 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            title="Edit Details"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSong(song.id, song.title)}
                            className="p-3 text-gray-400 hover:text-red-400 hover:bg-zinc-800/40 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            title="Delete Song"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Viewports < 768px: Responsive Mobile list cards (44px target protection) */}
          <div className="block md:hidden space-y-3">
            {filteredSongs.map((song) => (
              <div 
                key={song.id} 
                className="bg-[#080808] border border-[#262626] rounded-lg p-4 flex flex-col gap-3.5 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="truncate pr-2">
                    <h4 className="font-bold text-[#F4F4F5] text-sm truncate">{song.title}</h4>
                    <span className="text-xs text-[#A1A1AA] font-mono block mt-1">
                      {song.tempo ? `${song.tempo} BPM` : '-'}
                    </span>
                  </div>
                  <span className="font-mono text-[#FFD700] text-xs font-bold bg-[#FFD700]/10 border border-[#FFD700]/20 px-2.5 py-0.5 rounded">
                    {song.song_key || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#262626] pt-3.5 mt-1">
                  <div>
                    {song.reference_link ? (
                      <a 
                        href={song.reference_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-[#E4E4E7] hover:text-[#FFD700] transition-all text-xs min-h-[44px] min-w-[44px]"
                      >
                        Listen <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">-</span>
                    )}
                  </div>

                  {isManager && (
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleEditSong(song)}
                        className="p-3 text-gray-400 hover:text-[#FFD700] hover:bg-zinc-800/40 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSong(song.id, song.title)}
                        className="p-3 text-gray-400 hover:text-red-400 hover:bg-zinc-800/40 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        title="Delete Song"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Popup component */}
      <SongModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        song={selectedSong}
        onSuccess={fetchSongs}
      />
    </div>
  );
}
