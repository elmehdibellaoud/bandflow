import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import { X, Calendar, Music, ArrowUp, ArrowDown, Trash2, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import DateTimePicker from './DateTimePicker';

/**
 * Reusable modal for scheduling and planning performances.
 * Refactored into a 3-step wizard with dynamic roster assignment matrices:
 * Step 1: Event Info (Title, Venue, Date Picker validation).
 * Step 2: Setlist compilation (Select songs out of the Song Bank).
 * Step 3: Roster assignment matrix (Specify which musicians play on which individual songs).
 */
export default function PerformanceModal({ isOpen, onClose, performance, onSuccess }) {
  const { currentBand, token } = useBand();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [venue, setVenue] = useState('');
  
  const [availableSongs, setAvailableSongs] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]); // Array of song objects in sequence order
  const [members, setMembers] = useState([]); // Registered band members list
  const [roster, setRoster] = useState({}); // Maps songId -> array of performing user_ids

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch available songs and members on mount or when band changes
  useEffect(() => {
    if (isOpen && currentBand) {
      fetchAvailableSongs();
      fetchBandMembers();
    }
  }, [currentBand, isOpen]);

  // Sync state when editing a performance
  useEffect(() => {
    if (performance) {
      setTitle(performance.title || '');
      
      // Convert DATETIME format to local datetime string compatible with input type="datetime-local"
      if (performance.date_time) {
        const d = new Date(performance.date_time);
        const tzoffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        setDateTime(localISOTime);
      } else {
        setDateTime('');
      }
      
      setVenue(performance.venue || '');
      setSelectedSongs(performance.songs || []);
      
      // Initialize roster assignments
      const initialRoster = {};
      (performance.songs || []).forEach(song => {
        initialRoster[song.id] = song.performing_members || [];
      });
      setRoster(initialRoster);
    } else {
      setTitle('');
      setDateTime('');
      setVenue('');
      setSelectedSongs([]);
      setRoster({});
    }
    setStep(1);
    setError('');
  }, [performance, isOpen]);

  if (!isOpen) return null;

  const fetchAvailableSongs = async () => {
    try {
      const response = await fetch(`/api/songs?band_id=${currentBand.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableSongs(data.songs || []);
      }
    } catch (err) {
      console.error('Error fetching songs for setlist builder:', err);
    }
  };

  const fetchBandMembers = async () => {
    try {
      const response = await fetch(`/api/bands/${currentBand.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  // Helper to construct minimum datetime formatted string for local ISO
  const getMinDateTime = () => {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !dateTime || !venue.trim()) {
      setError('Please fill in all event details.');
      return;
    }

    const selectedDate = new Date(dateTime);
    const today = new Date();
    // Validate that time is not in the past
    if (selectedDate.getTime() < today.getTime() - 60000) {
      setError('Event date and time cannot be in the past.');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = () => {
    setError('');
    if (selectedSongs.length === 0) {
      setError('Please select at least one song for the setlist.');
      return;
    }
    setStep(3);
  };

  // Roster assignments handlers
  const handleToggleMember = (songId, userId) => {
    setRoster(prev => {
      const currentList = prev[songId] || [];
      if (currentList.includes(userId)) {
        return { ...prev, [songId]: currentList.filter(id => id !== userId) };
      } else {
        return { ...prev, [songId]: [...currentList, userId] };
      }
    });
  };

  const handleSelectAllMembers = (songId) => {
    setRoster(prev => {
      const currentList = prev[songId] || [];
      const allMemberIds = members.map(m => m.user_id);
      const allSelected = allMemberIds.every(id => currentList.includes(id));
      return {
        ...prev,
        [songId]: allSelected ? [] : allMemberIds
      };
    });
  };

  // Add song to active setlist
  const handleAddSongToSet = (song) => {
    if (selectedSongs.some(s => s.id === song.id)) return;
    setSelectedSongs([...selectedSongs, song]);
  };

  // Remove song from active setlist
  const handleRemoveSongFromSet = (songId) => {
    setSelectedSongs(selectedSongs.filter(s => s.id !== songId));
    // Also clean up from roster mappings
    setRoster(prev => {
      const updated = { ...prev };
      delete updated[songId];
      return updated;
    });
  };

  // Re-order active setlist
  const handleMoveSong = (index, direction) => {
    const newSetlist = [...selectedSongs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSetlist.length) return;
    
    // Swap elements
    const temp = newSetlist[index];
    newSetlist[index] = newSetlist[targetIndex];
    newSetlist[targetIndex] = temp;
    setSelectedSongs(newSetlist);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const payload = {
      title: title.trim(),
      date_time: dateTime,
      venue: venue.trim(),
      songs: selectedSongs.map(s => ({
        id: s.id,
        performing_members: roster[s.id] || []
      }))
    };

    try {
      let response;
      if (performance) {
        response = await fetch(`/api/performances/${performance.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/performances', {
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
        throw new Error(data.error || 'Failed to save performance.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="w-full max-w-2xl bg-[#141414] border border-[#262626] rounded-lg p-6 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FFD700]"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-[#F4F4F5]">
            <Calendar className="text-[#FFD700]" size={20} />
            <h3 className="text-lg font-bold">
              {performance ? 'Edit Show Planner' : 'Schedule New Performance'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-[#FFD700] transition-colors"
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

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-shrink-0 select-none">
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step === 1 ? 'bg-[#FFD700] text-black' : 'bg-zinc-800 text-zinc-500'}`}>1</span>
          <span className="w-12 h-[1px] bg-zinc-800"></span>
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step === 2 ? 'bg-[#FFD700] text-black' : 'bg-zinc-800 text-zinc-500'}`}>2</span>
          <span className="w-12 h-[1px] bg-zinc-800"></span>
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step === 3 ? 'bg-[#FFD700] text-black' : 'bg-zinc-800 text-zinc-500'}`}>3</span>
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto pr-1">
          {step === 1 && (
            /* STEP 1: EVENT DETAILS FORM */
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                    Event / Show Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Summer Rock Festival"
                    className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                    Venue / Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Madison Square Garden"
                    className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Date & Time *
                </label>
                <DateTimePicker value={dateTime} onChange={setDateTime} />
              </div>

              <div className="flex justify-end pt-6 border-t border-[#262626] mt-6">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#FFD700] text-black font-bold rounded-md hover:bg-yellow-400 transition-all flex items-center gap-1.5 text-sm min-h-[44px] cursor-pointer"
                >
                  Next: Build Setlist <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            /* STEP 2: SETLIST BUILDER PANEL */
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left side: Available Songs */}
                <div className="bg-[#080808] border border-[#262626] rounded-lg p-4 flex flex-col max-h-[350px]">
                  <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Music size={12} /> Repertoire Songs
                  </h4>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {availableSongs.length === 0 ? (
                      <p className="text-xs text-gray-600 italic p-4 text-center">No songs in Song Bank. Add them in the Song Bank tab first.</p>
                    ) : (
                      availableSongs.map(song => {
                        const isAdded = selectedSongs.some(s => s.id === song.id);
                        return (
                          <div 
                            key={song.id}
                            className={`flex items-center justify-between p-2.5 rounded border text-xs transition-all ${isAdded ? 'border-[#262626] bg-zinc-900/10 opacity-50' : 'border-[#262626] hover:border-zinc-800 bg-[#141414]'}`}
                          >
                            <div>
                              <span className="font-semibold text-white block">{song.title}</span>
                              <span className="text-[10px] text-[#A1A1AA] font-mono">{song.song_key || '-'} &bull; {song.tempo ? `${song.tempo} BPM` : '-'}</span>
                            </div>
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => handleAddSongToSet(song)}
                              className="px-2 py-1 bg-zinc-800 hover:bg-[#FFD700] hover:text-black rounded text-[10px] font-bold text-[#E4E4E7] disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right side: Ordered Setlist */}
                <div className="bg-[#080808] border border-[#262626] rounded-lg p-4 flex flex-col max-h-[350px]">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1">
                      Setlist Order
                    </h4>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {selectedSongs.length === 0 ? (
                      <p className="text-xs text-gray-600 italic p-6 text-center border border-dashed border-[#262626] rounded-md">Setlist is empty. Add songs from the left bank.</p>
                    ) : (
                      selectedSongs.map((song, index) => (
                        <div 
                          key={song.id}
                          className="flex items-center justify-between p-2 border border-[#262626] bg-[#141414] rounded text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 bg-zinc-850 text-zinc-400 rounded-full flex items-center justify-center font-mono text-[10px] flex-shrink-0 font-bold">
                              {index + 1}
                            </span>
                            <span className="font-semibold text-white truncate">{song.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button; button"
                              onClick={() => handleMoveSong(index, -1)}
                              disabled={index === 0}
                              className="p-1 hover:text-[#FFD700] text-gray-500 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSong(index, 1)}
                              disabled={index === selectedSongs.length - 1}
                              className="p-1 hover:text-[#FFD700] text-gray-500 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSongFromSet(song.id)}
                              className="p-1 hover:text-red-400 text-gray-500 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-between pt-6 border-t border-[#262626] mt-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-[#262626] text-[#A1A1AA] hover:text-white rounded-md transition-all text-sm flex items-center gap-1.5 font-semibold cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft size={16} /> Back to Details
                </button>
                
                <button
                  type="button"
                  onClick={handleStep2Submit}
                  className="px-6 py-2 bg-[#FFD700] text-black font-bold rounded-md hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer min-h-[44px]"
                >
                  Next: Assign Roster <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            /* STEP 3: ROSTER SELECTOR MATRIX */
            <div className="flex flex-col gap-6">
              <div className="bg-[#080808] border border-[#262626] rounded-lg p-4 flex flex-col max-h-[350px] overflow-y-auto">
                <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1">
                  Musician Setlist Roster
                </h4>
                
                <div className="space-y-4">
                  {selectedSongs.map((song, idx) => {
                    const assignedIds = roster[song.id] || [];
                    const allSelected = members.length > 0 && members.map(m => m.user_id).every(id => assignedIds.includes(id));
                    
                    return (
                      <div key={song.id} className="p-3 border border-[#262626] bg-[#141414] rounded-lg space-y-3">
                        <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center font-mono text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-white text-sm">{song.title}</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleSelectAllMembers(song.id)}
                            className="text-[10px] bg-zinc-800 hover:bg-[#FFD700] hover:text-black font-bold px-2 py-1 rounded transition-colors text-[#E4E4E7] cursor-pointer"
                          >
                            {allSelected ? 'Clear All' : 'Select All Members'}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {members.map(member => {
                            const isChecked = assignedIds.includes(member.user_id);
                            return (
                              <label key={member.user_id} className="flex items-center gap-2 cursor-pointer text-xs text-[#E4E4E7] select-none hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleMember(song.id, member.user_id)}
                                  className="rounded border-[#262626] bg-[#080808] text-[#FFD700] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer accent-[#FFD700]"
                                />
                                <div className="truncate">
                                  <span className="block truncate font-medium">{member.full_name}</span>
                                  <span className="text-[9px] text-[#A1A1AA] truncate block">{member.instrument || 'Musician'}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-between pt-6 border-t border-[#262626] mt-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-[#262626] text-[#A1A1AA] hover:text-white rounded-md transition-all text-sm flex items-center gap-1.5 font-semibold cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft size={16} /> Back to Setlist
                </button>
                
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-[#FFD700] text-black font-bold rounded-md hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer min-h-[44px]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    performance ? 'Save Revisions' : 'Schedule Performance'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
