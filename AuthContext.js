import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser?.email || 'null');
      setUser(firebaseUser);

      if (firebaseUser) {
        // Utilisateur connecté → on stocke le token
        const token = await firebaseUser.getIdToken();
        await SecureStore.setItemAsync('userToken', token);
        setUserToken(token);
      } else {
        // Utilisateur déconnecté → on efface le token
        await SecureStore.deleteItemAsync('userToken');
        setUserToken(null);
      }

      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (token) => {
    await SecureStore.setItemAsync('userToken', token);
    setUserToken(token);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, setUserToken, login, logout, user, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);