import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import { X, Calendar, MapPin, Music, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import DateTimePicker from './DateTimePicker';

/**
 * RehearsalModal component.
 * Allows scheduling rehearsals and selecting Focus Songs.
 * Focus songs are inherited from a selected performance or chosen directly from the repertoire.
 */
export default function RehearsalModal({ isOpen, onClose, rehearsal, onSuccess }) {
  const { currentBand, token } = useBand();

  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [performanceId, setPerformanceId] = useState('');
  const [performances, setPerformances] = useState([]);
  const [songsToShow, setSongsToShow] = useState([]); // Songs available to be marked as focus
  const [focusSongIds, setFocusSongIds] = useState([]); // Selected focus song IDs
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch performances list and general songs on mount/open
  useEffect(() => {
    if (isOpen && currentBand) {
      fetchPerformances();
    }
  }, [currentBand, isOpen]);

  // Sync state when editing an existing rehearsal
  useEffect(() => {
    if (rehearsal) {
      setLocation(rehearsal.location || '');
      setPerformanceId(rehearsal.performance_id || '');
      
      if (rehearsal.date_time) {
        const d = new Date(rehearsal.date_time);
        const tzoffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        setDateTime(localISOTime);
      } else {
        setDateTime('');
      }

      // Map focus songs
      const focusIds = rehearsal.songs.filter(s => s.is_focus === 1).map(s => s.id);
      setFocusSongIds(focusIds);
    } else {
      setDateTime('');
      setLocation('');
      setPerformanceId('');
      setFocusSongIds([]);
      setSongsToShow([]);
    }
    setError('');
  }, [rehearsal, isOpen]);

  // Load appropriate checklist songs when performance selection changes
  useEffect(() => {
    if (!isOpen || !currentBand) return;

    if (performanceId) {
      // Find the selected performance to read its inherited setlist
      const selectedPerf = performances.find(p => p.id === parseInt(performanceId, 10));
      if (selectedPerf && selectedPerf.songs) {
        setSongsToShow(selectedPerf.songs);
      } else {
        setSongsToShow([]);
      }
    } else {
      // No performance selected: Load all repertoire songs as focus candidates
      fetchAllRepertoireSongs();
    }
  }, [performanceId, performances, isOpen]);

  if (!isOpen) return null;

  const fetchPerformances = async () => {
    try {
      const response = await fetch(`/api/performances?band_id=${currentBand.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setPerformances(data.performances || []);
      }
    } catch (err) {
      console.error('Error loading performances for dropdown:', err);
    }
  };

  const fetchAllRepertoireSongs = async () => {
    try {
      const response = await fetch(`/api/songs?band_id=${currentBand.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSongsToShow(data.songs || []);
      }
    } catch (err) {
      console.error('Error loading all songs:', err);
    }
  };

  // Toggle checkbox helper
  const handleToggleFocusSong = (songId) => {
    if (focusSongIds.includes(songId)) {
      setFocusSongIds(focusSongIds.filter(id => id !== songId));
    } else {
      setFocusSongIds([...focusSongIds, songId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const selectedDate = new Date(dateTime);
    const today = new Date();
    if (selectedDate.getTime() < today.getTime() - 60000) {
      setError('Rehearsal date and time cannot be in the past.');
      setLoading(false);
      return;
    }

    const payload = {
      date_time: dateTime,
      location: location.trim(),
      performance_id: performanceId ? parseInt(performanceId, 10) : null,
      focus_song_ids: focusSongIds
    };

    try {
      let response;
      if (rehearsal) {
        // Edit mode
        response = await fetch(`/api/rehearsals/${rehearsal.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create mode
        response = await fetch('/api/rehearsals', {
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
        throw new Error(data.error || 'Failed to save rehearsal.');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setDateTime('');
    setLocation('');
    setPerformanceId('');
    setFocusSongIds([]);
    setSongsToShow([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleModalClose}
      ></div>

      {/* Modal Card */}
      <div className="w-full max-w-xl bg-[#1A1A1A] border border-gray-800 rounded-lg p-6 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Yellow Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FFD700]"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Calendar className="text-[#FFD700]" size={20} />
            <h3 className="text-lg font-bold">
              {rehearsal ? 'Edit Rehearsal Details' : 'Schedule Rehearsal Session'}
            </h3>
          </div>
          <button 
            onClick={handleModalClose}
            className="text-gray-400 hover:text-[#FFD700] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-2.5 rounded-md flex items-center gap-2.5 text-xs flex-shrink-0">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Location *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Rehearsal Room 10"
              className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Date & Time *
            </label>
            <DateTimePicker value={dateTime} onChange={setDateTime} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Link to Upcoming Performance (Optional)
            </label>
            <select
              value={performanceId}
              onChange={(e) => setPerformanceId(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md py-2.5 px-3 text-white focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm cursor-pointer"
            >
              <option value="">-- No Linked Performance (General Practice) --</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({new Date(p.date_time).toLocaleDateString()})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              Linking a performance inherits its setlist. You can check off specific songs below to focus on.
            </p>
          </div>

          {/* Setlist check off pane */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 flex flex-col">
            <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wider mb-3 block">
              Set Practice Focus Songs ({focusSongIds.length} Marked)
            </span>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {songsToShow.length === 0 ? (
                <p className="text-xs text-gray-600 italic py-4 text-center">
                  No songs available. Add songs to your Song Bank first.
                </p>
              ) : (
                songsToShow.map((song) => {
                  const isChecked = focusSongIds.includes(song.id);
                  return (
                    <div 
                      key={song.id}
                      onClick={() => handleToggleFocusSong(song.id)}
                      className={`flex items-center gap-3 p-2.5 rounded border border-gray-800 bg-[#1A1A1A] cursor-pointer hover:border-gray-700 transition-all ${isChecked ? 'border-[#FFD700]/30 bg-yellow-500/[0.02]' : ''}`}
                    >
                      <button type="button" className="text-gray-400 hover:text-[#FFD700] transition-colors flex-shrink-0">
                        {isChecked ? (
                          <CheckSquare size={16} className="text-[#FFD700]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                      <div className="min-w-0">
                        <span className={`text-xs font-semibold block transition-colors ${isChecked ? 'text-white' : 'text-gray-300'}`}>
                          {song.title}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {song.song_key ? `Key: ${song.song_key}` : ''} {song.tempo ? `&bull; ${song.tempo} BPM` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800 mt-6 flex-shrink-0">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 border border-gray-800 text-gray-400 hover:text-white rounded-md transition-all text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#FFD700] text-black font-bold rounded-md hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                rehearsal ? 'Save Rehearsal' : 'Schedule Practice'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
