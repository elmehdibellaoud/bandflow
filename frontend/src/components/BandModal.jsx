import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBand } from '../context/BandContext';
import { X, PlusCircle, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Reusable modal for creating or joining a band.
 * Refactored for Phase 6+ (Dynamic Roles Verification & Stage Mode Overhaul).
 */
export default function BandModal({ isOpen, onClose, mode }) {
  const { createBand, joinBand, token } = useBand();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [bandId, setBandId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [verifiedBandName, setVerifiedBandName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Monitor bandId input to trigger automatic GET verify request on exactly 9 characters
  useEffect(() => {
    if (mode === 'join') {
      const code = bandId.trim();
      if (code.length === 9) {
        verifyBandId(code);
      } else {
        // Reset verified state if the user changes the code length away from 9
        setAvailableRoles([]);
        setVerifiedBandName('');
        setRoleId('');
        setError('');
      }
    }
  }, [bandId, mode]);

  if (!isOpen) return null;

  const verifyBandId = async (code) => {
    setVerifying(true);
    setError('');
    try {
      const response = await fetch(`/api/bands/verify/${code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.valid) {
        setVerifiedBandName(data.band.name);
        setAvailableRoles(data.band.roles || []);
      } else {
        throw new Error(data.error || 'Invalid Band Space ID.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
      setAvailableRoles([]);
      setVerifiedBandName('');
      setRoleId('');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'create') {
        if (!name.trim()) throw new Error('Band name is required.');
        await createBand(name);
      } else {
        if (!bandId.trim()) throw new Error('Band ID is required.');
        if (!roleId) throw new Error('You must select a band role.');
        await joinBand(bandId.trim(), parseInt(roleId, 10));
      }
      
      handleModalClose();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setName('');
    setBandId('');
    setRoleId('');
    setAvailableRoles([]);
    setVerifiedBandName('');
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
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-lg p-6 shadow-2xl relative z-10 overflow-hidden">
        {/* Stage Yellow top line accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FFD700]"></div>

        {/* Title bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {mode === 'create' ? (
              <PlusCircle className="text-[#FFD700]" size={22} />
            ) : (
              <UserPlus className="text-[#FFD700]" size={22} />
            )}
            <h2 className="text-xl font-bold text-[#F4F4F5]">
              {mode === 'create' ? 'Create New Band' : 'Join Band Space'}
            </h2>
          </div>
          <button 
            onClick={handleModalClose}
            className="text-[#A1A1AA] hover:text-[#FFD700] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-2.5 rounded-md flex items-center gap-2.5 text-xs">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' ? (
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                Band Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Electric Vibe"
                className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Band Space ID *
                </label>
                <input
                  type="text"
                  required
                  value={bandId}
                  onChange={(e) => setBandId(e.target.value.toUpperCase())}
                  placeholder="e.g. ROCK-1234"
                  maxLength={9}
                  className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
                />
                
                {/* Verification notifications and status indicators */}
                {verifying && (
                  <span className="text-[10px] text-gray-500 mt-1 block">Verifying space code...</span>
                )}
                {verifiedBandName && (
                  <div className="flex items-center gap-1 text-[10px] text-green-400 mt-1.5 font-bold">
                    <CheckCircle size={12} />
                    <span>Linked: {verifiedBandName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                  Choose Your Band Role
                </label>
                <select
                  required
                  disabled={availableRoles.length === 0}
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full bg-[#080808] border border-[#262626] rounded-md py-2.5 px-3 text-[#F4F4F5] placeholder-gray-600 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">
                    {availableRoles.length === 0 
                      ? '-- Enter a valid 9-character Band ID first --' 
                      : '-- Select a Musical Role --'}
                  </option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[#262626] mt-6">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 border border-[#262626] text-[#A1A1AA] hover:text-white rounded-md transition-all text-sm min-h-[44px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'join' && availableRoles.length === 0)}
              className="px-6 py-2 bg-[#FFD700] text-black font-bold rounded-md hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                mode === 'create' ? 'Create' : 'Join Band'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
