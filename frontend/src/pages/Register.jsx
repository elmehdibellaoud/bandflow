import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBand } from '../context/BandContext';
import { Music, Mail, Lock, User, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Register view.
 * Overhauled to strictly follow the Stage Mode design tokens:
 * - App background: #080808
 * - Form card container: #141414
 * - Container borders: #262626
 * - Active accents: #FFD700
 */
export default function Register() {
  const { register } = useBand();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      await register(email, password, fullName);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col justify-center items-center px-4 font-sans">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-lg p-8 shadow-2xl relative overflow-hidden">
        {/* Stage Yellow top accent border */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#FFD700]"></div>

        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#FFD700] text-black rounded-lg flex items-center justify-center mb-3 shadow-lg shadow-yellow-500/10">
            <Music size={26} className="stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F4F5]">
            Band<span className="text-[#FFD700]">Flow</span>
          </h1>
          <p className="text-[#A1A1AA] text-sm mt-1">Create a new musician account</p>
        </div>

        {/* Success notification banner */}
        {success && (
          <div className="mb-6 bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-md flex items-center gap-3 text-sm">
            <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md flex items-center gap-3 text-sm">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#080808] border border-[#262626] rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#080808] border border-[#262626] rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-[#080808] border border-[#262626] rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] focus:outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-[#FFD700] text-black font-bold py-3 rounded-md hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 mt-6 min-h-[44px] cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#A1A1AA]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#FFD700] font-semibold hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
