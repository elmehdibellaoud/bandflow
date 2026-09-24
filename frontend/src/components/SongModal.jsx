import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import { X, Music, AlertTriangle } from 'lucide-react';

/**
 * Reusable modal for adding or editing a song.
 * Refactored to completely remove Duration fields and validate strictly Spotify/YouTube reference links.
 * Restricted to Manager writes.
 */
export default function SongModal({ isOpen, onClose, song, onSuccess }) {
  const { currentBand, token } = useBand();

  const [title, setTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [tempo, setTempo] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state with selected song data on open
  useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setSongKey(song.song_key || '');
      setTempo(song.tempo || '');
      setReferenceLink(song.reference_link || '');
    } else {
      setTitle('');
      setSongKey('');
      setTempo('');
      setReferenceLink('');
    }
    setError('');
  }, [song, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!title.trim()) {
      setError('Song title is required.');
      setLoading(false);
      return;
    }

    const trimmedLink = referenceLink.trim();
    if (trimmedLink) {
      const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com\/|spotify:)/i;
      const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i;
      
      if (!spotifyRegex.test(trimmedLink) && !youtubeRegex.test(trimmedLink)) {
        setError('Reference link must be strictly a Spotify or YouTube URL.');
        setLoading(false);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      song_key: songKey.trim() || null,
      tempo: tempo ? parseInt(tempo, 10) : null,
      duration: null, // duration is removed from client inputs
      reference_link: trimmedLink || null,
    };

    try {
      let response;
      if (song) {
        // Edit mode
        response = await fetch(`/api/songs/${song.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create mode
        response = await fetch('/api/songs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payload,
            band_id: currentBand.id
          })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save song');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal panel container */}
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-lg p-6 shadow-2xl relative z-10 overflow-hidden">
        {/* Stage Yellow top line accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FFD700]"></div>

        {/* Header titles */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-white">
            <Music className="text-[#FFD700]" size={20} />
            <h3 className="text-lg font-bold text-[#F4F4F5]">
              {song ? 'Edit Song Details' : 'Add New Song'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-[#FFD700] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-2.5 rounded-md flex items-center gap-2 text-xs">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Song Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free Bird"
              className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                Song Key
              </label>
              <input
                type="text"
                value={songKey}
                onChange={(e) => setSongKey(e.target.value)}
                placeholder="e.g. Am, F#"
                className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                Tempo (BPM)
              </label>
              <input
                type="number"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="e.g. 120"
                className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Spotify or YouTube Reference Link
            </label>
            <input
              type="url"
              value={referenceLink}
              onChange={(e) => setReferenceLink(e.target.value)}
              placeholder="e.g. https://open.spotify.com/track/..."
              className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
            />
            <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
              Accepts strictly Spotify link (open.spotify.com) or YouTube link (youtube.com / youtu.be).
            </p>
          </div>

          {/* Buttons panel */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[#262626] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#262626] text-[#A1A1AA] hover:text-white rounded-md transition-all text-sm min-h-[44px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#FFD700] text-black font-bold rounded-md hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm min-h-[44px] cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                song ? 'Save' : 'Add Song'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
