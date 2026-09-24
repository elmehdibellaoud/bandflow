import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBand } from '../context/BandContext';
import BandModal from '../components/BandModal';
import { Music, Plus, LogOut, Radio, Crown, Guitar } from 'lucide-react';

/**
 * Launchpad View (Overhauled for Phase 6 Stage Mode).
 * - App background: #080808
 * - Card container background: #141414
 * - Container borders: #262626
 * - Active accents: #FFD700
 */
export default function Launchpad() {
  const { user, myBands, selectBand, logout, fetchMyBands } = useBand();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'join'

  useEffect(() => {
    fetchMyBands();
  }, []);

  const handleSelectBand = (band) => {
    selectBand(band);
    navigate('/dashboard');
  };

  const openModal = (mode) => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#E4E4E7] flex flex-col font-sans">
      {/* Header bar */}
      <header className="border-b border-[#262626] bg-[#141414] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FFD700] text-black rounded flex items-center justify-center">
            <Music size={18} className="stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#F4F4F5]">
            Band<span className="text-[#FFD700]">Flow</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-[#A1A1AA] text-sm hidden sm:inline">
            Logged in as <span className="text-[#F4F4F5] font-semibold">{user?.full_name}</span>
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#262626] text-[#A1A1AA] hover:text-[#FFD700] hover:border-[#FFD700] rounded-md transition-all text-xs min-h-[44px] cursor-pointer"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-4xl font-extrabold tracking-tight text-[#F4F4F5] mb-2">
            Welcome back, <span className="text-[#FFD700]">{user?.full_name}</span>
          </h2>
          <p className="text-[#A1A1AA] text-base">Select a Band Space to enter, or launch a new one.</p>
        </div>

        {/* Bands Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Active Bands User Belongs To */}
          {myBands.map((band) => (
            <div
              key={band.id}
              onClick={() => handleSelectBand(band)}
              className="bg-[#141414] border border-[#262626] rounded-lg p-6 hover:border-[#FFD700] cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-yellow-500/5 duration-200 flex flex-col justify-between h-48 group relative overflow-hidden"
            >
              {/* Background gradient decorative card effect */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#A1A1AA] tracking-wider font-mono">
                    ID: {band.unique_band_id}
                  </span>
                  {band.role === 'manager' ? (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#FFD700] bg-yellow-500/10 border border-[#FFD700]/30 px-2 py-0.5 rounded-full">
                      <Crown size={10} /> Manager
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] bg-zinc-800 border border-[#262626] px-2 py-0.5 rounded-full">
                      <Guitar size={10} /> Member
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-[#F4F4F5] group-hover:text-[#FFD700] transition-colors truncate pr-4">
                  {band.name}
                </h3>
              </div>

              <div className="border-t border-[#262626] pt-4 flex items-center justify-between mt-auto">
                <span className="text-xs text-[#A1A1AA] flex items-center gap-1.5">
                  <Radio size={14} className="text-green-500 animate-pulse" />
                  {band.role === 'manager' ? 'Full access' : `${band.instrument || 'Musician'}`}
                </span>
                <span className="text-xs text-[#FFD700] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter Space &rarr;
                </span>
              </div>
            </div>
          ))}

          {/* Action Card: Create a Band */}
          <div
            onClick={() => openModal('create')}
            className="border-2 border-dashed border-[#262626] rounded-lg p-6 flex flex-col items-center justify-center h-48 cursor-pointer hover:border-[#FFD700] hover:bg-[#141414]/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-full border border-[#262626] group-hover:border-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black flex items-center justify-center mb-3 transition-all text-gray-400">
              <Plus size={20} />
            </div>
            <span className="text-white font-bold group-hover:text-[#FFD700] transition-colors">
              Create a Band
            </span>
            <span className="text-xs text-gray-500 mt-1">Start a new band space</span>
          </div>

          {/* Action Card: Join a Band */}
          <div
            onClick={() => openModal('join')}
            className="border-2 border-dashed border-[#262626] rounded-lg p-6 flex flex-col items-center justify-center h-48 cursor-pointer hover:border-[#FFD700] hover:bg-[#141414]/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-full border border-[#262626] group-hover:border-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black flex items-center justify-center mb-3 transition-all text-gray-400 font-bold">
              <Plus size={20} className="rotate-45" />
            </div>
            <span className="text-white font-bold group-hover:text-[#FFD700] transition-colors">
              Join with Band ID
            </span>
            <span className="text-xs text-gray-500 mt-1">Enter another band space</span>
          </div>
        </div>
      </main>

      {/* Modal Popup */}
      <BandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
      />
    </div>
  );
}
