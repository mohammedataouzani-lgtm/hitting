import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser?.email ?? 'null');
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // ← AJOUT : met à jour user immédiatement après login
  const login = (firebaseUser) => {
    setUser(firebaseUser);
  };

const logout = async () => {
  const { logout: firebaseLogout } = await import('./services/firebase'); 
  await firebaseLogout();
  setUser(null);
};

  return (
    <AuthContext.Provider value={{ user, loadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);