import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useBand } from '../context/BandContext';
import SongBank from '../components/SongBank';
import Performances from '../components/Performances';
import { 
  Music, Home, Library, Calendar, RefreshCw, LogOut, 
  Crown, Guitar, UserCheck, Star, Copy, Check, Mic, Disc 
} from 'lucide-react';

// Maps standard musical roles to high-contrast Stage Yellow icons
const getInstrumentIcon = (instrument) => {
  const inst = (instrument || '').toLowerCase();
  if (inst.includes('vocal') || inst.includes('sing') || inst.includes('voice')) {
    return <Mic size={14} className="text-[#FFD700] stroke-[2.5] flex-shrink-0" />;
  }
  if (inst.includes('guitar') || inst.includes('bass') || inst.includes('lead') || inst.includes('rhythm')) {
    return <Guitar size={14} className="text-[#FFD700] stroke-[2.5] flex-shrink-0" />;
  }
  if (inst.includes('drum') || inst.includes('perc') || inst.includes('beat')) {
    return <Disc size={14} className="text-[#FFD700] stroke-[2.5] flex-shrink-0 animate-spin" style={{ animationDuration: '3s' }} />;
  }
  if (inst.includes('key') || inst.includes('piano') || inst.includes('synth') || inst.includes('organ')) {
    return <Music size={14} className="text-[#FFD700] stroke-[2.5] flex-shrink-0" />;
  }
  return <Music size={14} className="text-[#FFD700] stroke-[2.5] flex-shrink-0" />;
};

/**
 * Dashboard Shell View Overhaul.
 * Strictly adheres to Phase 6 premium Stage Mode palette:
 * - App Background: #080808
 * - Containers & Card Elements: #141414
 * - Soft Borders: #262626
 * - Highlight Accent: #FFD700
 * - Responsive Bottom Navigation bar for mobile viewports (minimum 44px tap targets).
 */
export default function Dashboard() {
  const { currentBand, logout, token } = useBand();
  const navigate = useNavigate();

  // Route protection - must have a band selected to see dashboard
  if (!currentBand) {
    return <Navigate to="/launchpad" replace />;
  }

  const [activeTab, setActiveTab] = useState('home');
  const [members, setMembers] = useState([]);
  const [totalSongs, setTotalSongs] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentBand.unique_band_id);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  React.useEffect(() => {
    if (currentBand) {
      fetchBandStats();
    }
  }, [currentBand]);

  const fetchBandStats = async () => {
    setLoadingStats(true);
    try {
      const memRes = await fetch(`/api/bands/${currentBand.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const memData = await memRes.json();
      if (memRes.ok) {
        setMembers(memData.members || []);
      }

      const songRes = await fetch(`/api/songs?band_id=${currentBand.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const songData = await songRes.json();
      if (songRes.ok) {
        setTotalSongs((songData.songs || []).length);
      }
    } catch (err) {
      console.error('Error loading band stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'song-bank', label: 'Song Bank', icon: Library },
    { id: 'calendar', label: 'Schedule', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-[#E4E4E7] flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header (Fixed height/sticky, minimum 44px tap targets) */}
      <div className="md:hidden flex items-center justify-between px-6 py-3 bg-[#141414] border-b border-[#262626] sticky top-0 z-40 h-16">
        <div className="flex items-center gap-2 truncate">
          <div className="w-8 h-8 bg-[#FFD700] text-black rounded flex items-center justify-center flex-shrink-0">
            <Music size={16} className="stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#F4F4F5] truncate">
            {currentBand.name}
          </span>
        </div>
        
        {/* Quick mobile utility buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            onClick={() => navigate('/launchpad')}
            className="p-3 text-[#A1A1AA] hover:text-[#FFD700] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-[#080808]"
            title="Switch Space"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handleLogout}
            className="p-3 text-[#A1A1AA] hover:text-red-400 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-[#080808]"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (Persistent left panel, hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-[#141414] border-r border-[#262626] flex-col justify-between p-6 flex-shrink-0">
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FFD700] text-black rounded flex items-center justify-center">
              <Music size={18} className="stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#F4F4F5]">
              Band<span className="text-[#FFD700]">Flow</span>
            </span>
          </div>

          {/* Active Band Badge Card */}
          <div className="bg-[#080808] border border-[#262626] rounded-lg p-4">
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block mb-1">
              Active Space
            </span>
            <span className="text-lg font-bold text-[#F4F4F5] block truncate mb-2">
              {currentBand.name}
            </span>
            <div className="flex items-center justify-between bg-[#141414] border border-[#262626] rounded px-2.5 py-1">
              <span className="text-[10px] text-[#FFD700] font-mono font-bold select-all">
                ID: {currentBand.unique_band_id}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-[#A1A1AA] hover:text-[#FFD700] transition-colors p-1 cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center rounded hover:bg-[#080808]"
                title="Copy Band ID to Clipboard"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Tab Navigation links (minimum 44px heights) */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-md font-semibold text-sm transition-all min-h-[44px]
                    ${isActive 
                      ? 'bg-[#FFD700] text-black shadow-lg shadow-yellow-500/10' 
                      : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#080808]'}
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar utility controls (minimum 44px heights) */}
        <div className="flex flex-col gap-2 border-t border-[#262626] pt-6 mt-6">
          <button
            onClick={() => navigate('/launchpad')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-[#A1A1AA] hover:text-[#FFD700] hover:bg-[#080808] font-semibold text-sm transition-all min-h-[44px]"
          >
            <RefreshCw size={18} />
            Switch Band
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-[#A1A1AA] hover:text-red-400 hover:bg-[#080808] font-semibold text-sm transition-all min-h-[44px]"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col bg-[#080808] overflow-y-auto">
        {/* Banner header showing user's role */}
        <header className="bg-[#141414] border-b border-[#262626] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs text-[#A1A1AA] font-medium tracking-wide">Space View</span>
            <h2 className="text-xl font-bold text-[#F4F4F5] capitalize">{activeTab === 'calendar' ? 'Schedule & Setlists' : activeTab.replace('-', ' ')}</h2>
          </div>

          <div>
            {currentBand.role === 'manager' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider text-black bg-[#FFD700] border border-[#FFD700] uppercase">
                <Crown size={14} className="stroke-[2.5]" />
                Manager Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider text-[#FFD700] bg-yellow-500/10 border border-[#FFD700]/30 uppercase">
                <Guitar size={14} />
                View Mode ({currentBand.instrument || 'Musician'})
              </span>
            )}
          </div>
        </header>

        {/* Dynamic content rendering based on active tab */}
        {/* Adding extra bottom padding on mobile layout (pb-24) to avoid bottom bar overlap */}
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Space intro details card */}
              <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 relative overflow-hidden">
                <h3 className="text-2xl font-bold text-[#F4F4F5] mb-2">
                  Welcome to <span className="text-[#FFD700]">{currentBand.name}</span>
                </h3>
                <p className="text-[#A1A1AA] text-sm max-w-2xl leading-relaxed">
                  Collaborate with your band members, build your setlist library, and sync on rehearsal schedules. Invite other bandmates using the code <span className="text-[#FFD700] font-mono font-bold">{currentBand.unique_band_id}</span>.
                </p>
              </div>

              {/* Members roster */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Musicians list */}
                <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-lg p-6">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#F4F4F5]">
                    <UserCheck className="text-[#FFD700]" size={18} />
                    Musicians ({members.length})
                  </h4>
                  <div className="divide-y divide-[#262626]">
                    {members.map((member, idx) => (
                      <div key={idx} className="py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${member.role === 'manager' ? 'bg-[#FFD700] text-black' : 'bg-gray-800 text-gray-300'}`}>
                            {member.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold block text-[#E4E4E7] text-sm">{member.full_name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {getInstrumentIcon(member.instrument)}
                              <span className="text-xs text-[#A1A1AA]">{member.instrument || 'Musician'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {member.role === 'manager' && (
                            <span className="text-[9px] font-bold text-[#FFD700] border border-[#FFD700]/30 bg-yellow-500/10 px-2 py-0.5 rounded uppercase">
                              Admin
                            </span>
                          )}
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setlist statistics */}
                <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#F4F4F5]">
                      <Star className="text-[#FFD700]" size={18} />
                      Setlist Stats
                    </h4>
                    <ul className="space-y-3.5 text-sm text-[#E4E4E7]">
                      <li className="flex justify-between">
                        <span className="text-[#A1A1AA]">Total Songs</span>
                        <span className="font-bold text-white">{totalSongs}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-[#A1A1AA]">Roster Role</span>
                        <span className="font-bold text-[#FFD700] capitalize">{currentBand.role}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-[#A1A1AA]">Instrument</span>
                        <span className="font-bold text-white truncate max-w-[120px]">{currentBand.instrument || 'Lead'}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-[#262626] pt-4 mt-6">
                    <span className="text-xs text-[#A1A1AA] italic block">
                      Role assigned: {currentBand.role === 'manager' ? 'Band Manager' : 'Band Member'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'song-bank' && <SongBank />}

          {activeTab === 'calendar' && <Performances />}
        </main>
      </div>

      {/* Mobile Floating Bottom Navigation Bar (Hidden on desktop, minimum 44px tap targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141414] border-t border-[#262626] flex items-center justify-around h-16 pb-safe shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px] min-w-[44px] transition-all
                ${isActive ? 'text-[#FFD700]' : 'text-[#A1A1AA] hover:text-[#E4E4E7]'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
