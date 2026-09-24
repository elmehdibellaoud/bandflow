import React, { createContext, useContext, useState, useEffect } from 'react';

const BandContext = createContext();

/**
 * BandProvider component providing:
 * - user: Authenticated user details.
 * - token: JWT key.
 * - myBands: Array of bands the user is a member of.
 * - currentBand: Active band (with name, id, unique_band_id, role, instrument).
 * - Auth methods: login, register, logout.
 * - Band actions: createBand, joinBand, selectBand, fetchMyBands.
 */
export function BandProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [myBands, setMyBands] = useState([]);
  const [currentBand, setCurrentBand] = useState(() => {
    const savedBand = localStorage.getItem('currentBand');
    return savedBand ? JSON.parse(savedBand) : null;
  });
  const [loading, setLoading] = useState(false);

  // Fetch bands lists whenever token changes
  useEffect(() => {
    if (token) {
      fetchMyBands();
    } else {
      setMyBands([]);
    }
  }, [token]);

  // Fetch bands memberships from server
  const fetchMyBands = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/bands/my-bands', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyBands(data.bands);
        
        // Sync active band role and details
        if (currentBand) {
          const updated = data.bands.find(b => b.id === currentBand.id);
          if (updated) {
            setCurrentBand(updated);
            localStorage.setItem('currentBand', JSON.stringify(updated));
          } else {
            // Band deleted or user membership revoked
            setCurrentBand(null);
            localStorage.removeItem('currentBand');
          }
        }
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error('Error fetching bands:', error);
    }
  };

  // Authenticate user
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (email, password, fullName) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const logout = () => {
    setToken(null);
    setUser(null);
    setCurrentBand(null);
    setMyBands([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentBand');
  };

  // Select current active band
  const selectBand = (band) => {
    setCurrentBand(band);
    localStorage.setItem('currentBand', JSON.stringify(band));
  };

  // Create new band space
  const createBand = async (name) => {
    try {
      const response = await fetch('/api/bands/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create band');
      }
      
      await fetchMyBands(); // Refresh list to get accurate membership
      
      const newBand = {
        id: data.band.id,
        name: data.band.name,
        unique_band_id: data.band.unique_band_id,
        role: 'manager',
        instrument: null
      };
      
      selectBand(newBand);
      return newBand;
    } catch (error) {
      console.error('Create band error:', error);
      throw error;
    }
  };

  // Join existing band space
  const joinBand = async (uniqueBandId, roleId) => {
    try {
      const response = await fetch('/api/bands/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ unique_band_id: uniqueBandId, role_id: roleId })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join band');
      }
      
      await fetchMyBands(); // Refresh list
      
      const joinedBand = {
        id: data.band.id,
        name: data.band.name,
        unique_band_id: data.band.unique_band_id,
        role: 'member',
        instrument: data.band.instrument
      };
      
      selectBand(joinedBand);
      return joinedBand;
    } catch (error) {
      console.error('Join band error:', error);
      throw error;
    }
  };

  return (
    <BandContext.Provider value={{
      token,
      user,
      myBands,
      currentBand,
      loading,
      login,
      register,
      logout,
      selectBand,
      createBand,
      joinBand,
      fetchMyBands
    }}>
      {children}
    </BandContext.Provider>
  );
}

export function useBand() {
  const context = useContext(BandContext);
  if (!context) {
    throw new Error('useBand must be used within a BandProvider');
  }
  return context;
}
