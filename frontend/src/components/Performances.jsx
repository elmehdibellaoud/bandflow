import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import PerformanceModal from './PerformanceModal';
import RehearsalModal from './RehearsalModal';
import { 
  Calendar, MapPin, Clock, Music, Plus, Edit2, 
  Trash2, AlertTriangle, FileMusic, ArrowLeft,
  Link as LinkIcon, Star, Eye
} from 'lucide-react';

/**
 * Unified Master Schedule Timeline Component (Overhauled for Phase 6 Stage Mode).
 * Combines Gigs and Rehearsals into a single chronological feed.
 * Highlights linked practices with setlist inheritance connectors.
 * Optimizes viewing flow on mobile viewports with double-pane toggle.
 */
export default function Performances() {
  const { currentBand, token } = useBand();

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // Can be a gig or rehearsal
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'details' (for mobile viewport splitting)
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (currentBand) {
      fetchBandMembers();
    }
  }, [currentBand]);

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
      console.error('Error fetching band members:', err);
    }
  };
  
  // Modals state
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [editPerformance, setEditPerformance] = useState(null);
  
  const [isRehModalOpen, setIsRehModalOpen] = useState(false);
  const [editRehearsal, setEditRehearsal] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isManager = currentBand?.role === 'manager';

  // Load all schedule events
  useEffect(() => {
    fetchSchedule();
  }, [currentBand]);

  const fetchSchedule = async () => {
    if (!currentBand) return;
    setLoading(true);
    setError('');
    try {
      // Fetch Gigs and Practices in parallel
      const [perfRes, rehRes] = await Promise.all([
        fetch(`/api/performances?band_id=${currentBand.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/rehearsals?band_id=${currentBand.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const perfData = await perfRes.json();
      const rehData = await rehRes.json();

      if (!perfRes.ok) throw new Error(perfData.error || 'Failed to fetch performances.');
      if (!rehRes.ok) throw new Error(rehData.error || 'Failed to fetch rehearsals.');

      const gigs = (perfData.performances || []).map(p => ({ ...p, type: 'gig' }));
      const rehearsals = (rehData.rehearsals || []).map(r => ({ ...r, type: 'rehearsal' }));

      // Merge and sort chronologically (earliest first)
      const combinedList = [...gigs, ...rehearsals].sort(
        (a, b) => new Date(a.date_time) - new Date(b.date_time)
      );

      setEvents(combinedList);

      // Restore selection if possible, otherwise default to first show/practice
      if (combinedList.length > 0) {
        // Try to find the previously selected event by type & id
        const found = selectedEvent 
          ? combinedList.find(e => e.type === selectedEvent.type && e.id === selectedEvent.id)
          : null;
        setSelectedEvent(found || combinedList[0]);
      } else {
        setSelectedEvent(null);
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      // Simulate slight delay to demonstrate beautiful skeleton loaders
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // Performance cancellation
  const handleDeletePerformance = async (e, id, title) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to cancel the show "${title}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/performances/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete performance.');
      }
      fetchSchedule();
    } catch (err) {
      alert(err.message || 'An error occurred.');
    }
  };

  // Rehearsal cancellation
  const handleDeleteRehearsal = async (e, id, location) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to cancel the rehearsal at "${location}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/rehearsals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete rehearsal.');
      }
      fetchSchedule();
    } catch (err) {
      alert(err.message || 'An error occurred.');
    }
  };

  const handleEditEvent = (e, item) => {
    e.stopPropagation();
    if (item.type === 'gig') {
      setEditPerformance(item);
      setIsPerfModalOpen(true);
    } else {
      setEditRehearsal(item);
      setIsRehModalOpen(true);
    }
  };

  const handleAddPerformance = () => {
    setEditPerformance(null);
    setIsPerfModalOpen(true);
  };

  const handleAddRehearsal = () => {
    setEditRehearsal(null);
    setIsRehModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setViewMode('details'); // Toggle to details view on mobile viewports
  };

  // Formatting helpers
  const formatDate = (dateStr) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateStr) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleTimeString(undefined, options);
  };



  // Skeleton Loader elements
  const TimelineSkeletonLoader = () => (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#080808] border border-[#262626] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 w-2/3">
            <div className="w-10 h-10 bg-zinc-800 rounded"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
            </div>
          </div>
          <div className="w-16 h-6 bg-zinc-800 rounded"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[500px]">
      
      {/* LEFT COLUMN: Master Timeline list feed */}
      {/* Responsive toggle: hidden on mobile if viewMode is 'details' */}
      <div className={`flex-1 bg-[#141414] border border-[#262626] rounded-lg p-6 flex flex-col transition-all duration-200 ${viewMode === 'details' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#262626] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#F4F4F5] flex items-center gap-2">
              <Calendar className="text-[#FFD700]" size={18} />
              Chronological Timeline
            </h3>
            <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wide block mt-1 font-mono">
              Gigs & Practices Combined ({events.length} Events)
            </span>
          </div>
          
          {isManager && (
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={handleAddPerformance}
                className="bg-[#FFD700] text-black font-bold px-4 py-2.5 rounded-md hover:bg-yellow-400 active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md min-h-[44px] cursor-pointer"
              >
                <Plus size={14} /> Schedule Gig
              </button>
              <button 
                onClick={handleAddRehearsal}
                className="border border-[#262626] text-[#E4E4E7] hover:border-[#FFD700] hover:text-[#FFD700] font-bold px-4 py-2.5 rounded-md active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                <Plus size={14} /> Schedule Practice
              </button>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md flex items-center gap-3 text-sm">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Timeline list contents */}
        {loading ? (
          <TimelineSkeletonLoader />
        ) : events.length === 0 ? (
          <div className="py-12 flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-gray-900 border border-[#262626] text-gray-500 rounded-full flex items-center justify-center mb-3">
              <Calendar size={22} />
            </div>
            <h4 className="font-bold text-white mb-1">Your Schedule is Empty</h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
              Collaborate and align your band space by scheduling upcoming concert shows or practice rehearsal sessions.
            </p>
            {isManager && (
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={handleAddPerformance}
                  className="border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black font-semibold px-4 py-2 rounded transition-all text-xs min-h-[44px] cursor-pointer"
                >
                  Schedule Show
                </button>
                <button 
                  onClick={handleAddRehearsal}
                  className="border border-[#262626] text-white hover:border-[#FFD700] hover:text-[#FFD700] font-semibold px-4 py-2 rounded transition-all text-xs min-h-[44px] cursor-pointer"
                >
                  Schedule Practice
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {events.map((item) => {
              const isSelected = selectedEvent?.type === item.type && selectedEvent?.id === item.id;
              const isGig = item.type === 'gig';
              const focusCount = !isGig ? item.songs.filter(s => s.is_focus === 1).length : 0;
              
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelectEvent(item)}
                  className={`border p-4 rounded-lg flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-[#080808] border-[#FFD700] shadow-md shadow-yellow-500/5' : 'bg-[#080808] border-[#262626] hover:border-gray-700'}`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Date Block */}
                    <div className={`w-10 h-10 rounded border flex flex-col items-center justify-center text-center flex-shrink-0 ${isSelected ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'bg-[#141414] border-[#262626] text-[#FFD700]'}`}>
                      <span className="text-[8px] uppercase font-bold tracking-wider">
                        {new Date(item.date_time).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold -mt-1">
                        {new Date(item.date_time).getDate()}
                      </span>
                    </div>

                    {/* Metadata details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#F4F4F5] text-sm truncate">
                          {isGig ? item.title : 'Rehearsal Practice'}
                        </h4>
                        
                        {/* Event type badge */}
                        {isGig ? (
                          <span className="text-[8px] bg-[#FFD700] text-black font-extrabold px-1.5 py-0.2 rounded tracking-wide uppercase">
                            Gig
                          </span>
                        ) : (
                          <span className="text-[8px] border border-zinc-600 text-zinc-400 font-extrabold px-1.5 py-0.2 rounded tracking-wide uppercase">
                            Practice
                          </span>
                        )}
                      </div>

                      {/* Connection text showing setlist inheritance */}
                      {!isGig && item.performance_id && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#FFD700] font-mono">
                          <LinkIcon size={10} className="stroke-[2.5]" />
                          <span className="truncate">Inheriting: {item.performance_title}</span>
                        </div>
                      )}

                      <p className="text-xs text-[#A1A1AA] truncate flex items-center gap-1.5 mt-1">
                        <MapPin size={12} /> {isGig ? item.venue : item.location}
                      </p>
                    </div>
                  </div>

                  {/* Right side items */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isGig ? (
                      <span className="text-[10px] bg-zinc-900 border border-[#262626] text-[#A1A1AA] px-2 py-0.5 rounded font-mono hidden sm:inline">
                        {item.songs.length} Tracks
                      </span>
                    ) : (
                      <span className="text-[10px] bg-zinc-900 border border-[#262626] text-[#FFD700] px-2 py-0.5 rounded font-mono hidden sm:inline-flex items-center gap-0.5">
                        <Star size={9} className="fill-current" /> {focusCount} Focus
                      </span>
                    )}
                    
                    {isManager ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleEditEvent(e, item)}
                          className="p-3 text-gray-400 hover:text-[#FFD700] hover:bg-zinc-800/40 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => isGig ? handleDeletePerformance(e, item.id, item.title) : handleDeleteRehearsal(e, item.id, item.location)}
                          className="p-3 text-gray-400 hover:text-red-400 hover:bg-zinc-800/40 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          title="Cancel"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleSelectEvent(item)}
                        className="p-3 text-gray-400 hover:text-[#FFD700] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Selected Event details pane */}
      {/* Responsive toggle: hidden on mobile if viewMode is 'list' */}
      <div className={`w-full lg:w-96 bg-[#141414] border border-[#262626] rounded-lg p-6 flex flex-col justify-between transition-all duration-200 ${viewMode === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {selectedEvent ? (
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Back navigation button (only visible on mobile view splits) */}
              <button
                onClick={() => setViewMode('list')}
                className="lg:hidden mb-4 text-[#A1A1AA] hover:text-[#FFD700] flex items-center gap-1.5 text-xs font-bold min-h-[44px]"
              >
                <ArrowLeft size={14} /> Back to Timeline Feed
              </button>

              {/* Event Metadata details */}
              <div className="border-b border-[#262626] pb-4 mb-4">
                <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block mb-1 font-mono">
                  {selectedEvent.type === 'gig' ? 'Gig / Show Details' : 'Practice Rehearsal Details'}
                </span>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {selectedEvent.type === 'gig' ? selectedEvent.title : 'Practice Session'}
                </h3>
                
                <div className="space-y-2 text-xs text-[#E4E4E7]">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#FFD700]" />
                    <span>{formatDate(selectedEvent.date_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#FFD700]" />
                    <span>{formatTime(selectedEvent.date_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#FFD700]" />
                    <span className="truncate">{selectedEvent.type === 'gig' ? selectedEvent.venue : selectedEvent.location}</span>
                  </div>
                  
                  {/* Linked gig link inside details */}
                  {selectedEvent.type === 'rehearsal' && selectedEvent.performance_id && (
                    <div className="flex items-center gap-2 text-[#FFD700] border-t border-[#262626] pt-2.5 mt-2.5">
                      <LinkIcon size={14} className="stroke-[2.5]" />
                      <span className="truncate font-semibold">Linked gig setlist: {selectedEvent.performance_title}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Songs lists */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1.5">
                    <FileMusic size={14} /> 
                    {selectedEvent.type === 'gig' ? 'Setlist Tracks' : 'Practice Setlist'}
                  </h4>
                  <span className="text-[10px] text-[#A1A1AA] font-bold uppercase font-mono">
                    {selectedEvent.songs.length} Tracks
                  </span>
                </div>

                <div className="overflow-y-auto max-h-[250px] space-y-1.5 pr-1">
                  {selectedEvent.songs.length === 0 ? (
                    <p className="text-xs text-gray-600 italic py-4 text-center">
                      No repertoire tracks configured.
                    </p>
                  ) : (
                    selectedEvent.songs.map((song, index) => {
                      const isFocus = selectedEvent.type === 'rehearsal' && song.is_focus === 1;
                      
                      return (
                        <div 
                          key={song.id} 
                          className={`flex flex-col p-2.5 rounded text-xs transition-all gap-1.5 ${isFocus ? 'bg-yellow-500/[0.03] border border-[#FFD700]/30 shadow-sm' : 'bg-[#080808] border border-[#262626]'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                              <span className={`font-mono text-[10px] font-bold ${isFocus ? 'text-[#FFD700]' : 'text-gray-500'}`}>
                                {(index + 1).toString().padStart(2, '0')}
                              </span>
                              <span className={`font-semibold truncate ${isFocus ? 'text-[#F4F4F5]' : 'text-[#E4E4E7]'}`}>
                                {song.title}
                              </span>
                            </div>
                          </div>

                          {/* Dynamic Musician Roster Badges */}
                          {selectedEvent.type === 'gig' && song.performing_members && song.performing_members.length > 0 && (
                            <div className="flex flex-wrap gap-1 border-t border-[#262626] pt-1.5 mt-0.5">
                              {song.performing_members.map(userId => {
                                const member = members.find(m => m.user_id === userId);
                                if (!member) return null;
                                return (
                                  <span key={userId} className="text-[9px] bg-zinc-800 text-gray-300 px-1.5 py-0.5 rounded font-mono font-semibold border border-zinc-700">
                                    {member.full_name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#262626] pt-4 mt-6 flex-shrink-0 flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>Created: {new Date(selectedEvent.created_at).toLocaleDateString()}</span>
              <span className="font-semibold text-[#FFD700] font-mono">
                {selectedEvent.type === 'gig' 
                  ? `${selectedEvent.songs.length} Songs` 
                  : `${selectedEvent.songs.filter(s => s.is_focus === 1).length} Focus Items`
                }
              </span>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
            <Calendar size={28} className="text-gray-800 mb-2" />
            <p className="text-xs italic">Select a timeline item to load its details and track configurations.</p>
          </div>
        )}
      </div>

      {/* Modals popup */}
      <PerformanceModal
        isOpen={isPerfModalOpen}
        onClose={() => setIsPerfModalOpen(false)}
        performance={editPerformance}
        onSuccess={fetchSchedule}
      />

      <RehearsalModal
        isOpen={isRehModalOpen}
        onClose={() => setIsRehModalOpen(false)}
        rehearsal={editRehearsal}
        onSuccess={fetchSchedule}
      />
    </div>
  );
}
