import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail
} from 'firebase/auth';
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

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

console.log('🔑 Firebase config:', {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '✅ OK' : '❌ MANQUANT',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '✅ OK' : '❌ MANQUANT',
});

export { auth };

// Connexion Email/Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
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

// Déconnexion
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Création profil coach via Cloud Function (vérifie côté serveur que le club
// n'est pas déjà rattaché à un autre coach). En cas de refus : code = 'CLUB_DEJA_PRIS'.
export const registerCoach = async (coachDetails) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, error: 'Non connecté' };
    const token = await currentUser.getIdToken();
    const response = await fetch(
      'https://europe-west9-hitting-23de9.cloudfunctions.net/registerCoach',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: coachDetails.firstName || '',
          lastName: coachDetails.lastName || '',
          telephone: coachDetails.telephone || '',
          numeroLicence: coachDetails.numeroLicence || '',
          clubId: coachDetails.clubId || '',
        }),
      }
    );
    const data = await response.json();
    if (data.success) return { success: true };
    return { success: false, code: data.code, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Récupération des clubs via Cloud Function
export const getClubsFromFirestore = async () => {
  try {
    const response = await fetch('https://europe-west9-hitting-23de9.cloudfunctions.net/getClubs');
    if (!response.ok) return { success: false, clubs: [] };
    const data = await response.json();
    if (data.clubs && data.clubs.length > 0) return { success: true, clubs: data.clubs };
    return { success: false, clubs: [] };
  } catch (error) {
    return { success: false, clubs: [] };
  }
};

// Récupération profil coach via Cloud Function
export const getCoachProfile = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, error: 'Non connecté' };
    const token = await currentUser.getIdToken(true);
    const response = await fetch(
      'https://europe-west9-hitting-23de9.cloudfunctions.net/getCoachProfile',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();
    console.log('📦 Réponse getCoachProfile:', data);
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Mise à jour du téléphone
export const updateTelephone = async (uid, telephone) => {
  try {
    await updateDoc(doc(db, 'coaches', uid), { telephone });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Mise à jour de l'email (nécessite re-auth)
export const updateCoachEmail = async (currentPassword, newEmail) => {
  try {
    const currentUser = auth.currentUser;
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updateEmail(currentUser, newEmail);
    await updateDoc(doc(db, 'coaches', currentUser.uid), { email: newEmail });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Upload photo de profil
export const updateAvatar = async (uid, imageUri) => {
  try {
    const storage = getStorage();
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const storageRef = ref(storage, `avatars/${uid}.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    await updateDoc(doc(db, 'coaches', uid), { avatarUrl: downloadURL });
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Suppression du compte coach
export const deleteCoachAccount = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, error: 'Non connecté' };
    const token = await currentUser.getIdToken(true);
    const response = await fetch(
      'https://europe-west9-hitting-23de9.cloudfunctions.net/deleteCoachAccount',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
};