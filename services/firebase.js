import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Initialiser Auth avec persistance AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Connexion Email/Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Inscription Email/Password
export const registerWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Connexion avec Google (via ID Token)
export const loginWithGoogleCredential = async (idToken) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Connexion avec Facebook (via Access Token)
export const loginWithFacebookCredential = async (accessToken) => {
  try {
    const credential = FacebookAuthProvider.credential(accessToken);
    const result = await signInWithCredential(auth, credential);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Déconnexion
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export { auth };
const db = getFirestore(app);

// Cette fonction reste ici car le TÉLÉPHONE appelle l'URL de la fonction Cloud
export const getClubsFromFirestore = async () => {
  try {
    console.log('🔄 Fetching clubs from Cloud Function (Paris)...');

    // La nouvelle URL v2 mise à jour :
    const response = await fetch(
      'https://europe-west9-hitting-23de9.cloudfunctions.net/getClubs'
    );

    console.log('📦 Response status:', response.status);

    if (!response.ok) {
      console.error('❌ HTTP error:', response.status);
      return { success: false, clubs: [] };
    }

    const data = await response.json();
    
    console.log('📄 Response data:', data);

    if (data.success) {
      console.log('✅ Success! Found', data.clubs.length, 'clubs');
      return { success: true, clubs: data.clubs };
    }
    
    console.log('❌ API returned success:false', data.error);
    return { success: false, clubs: [] };
    
  } catch (error) {
    console.error('❌ Error fetching clubs:', error.message);
    return { success: false, clubs: [] };
  }
};