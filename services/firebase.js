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
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAP9_49optIP-Me0Uj4LvoqIqE1eE6_U8o",
  authDomain: "hitting-23de9.firebaseapp.com",
  projectId: "hitting-23de9",
  storageBucket: "hitting-23de9.firebasestorage.app",
  messagingSenderId: "380253921077",
  appId: "1:380253921077:web:bb107a84eb99237e96f67c",
  measurementId: "G-22MMWRL2GK"
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

// Récupérer tous les clubs depuis Firestore
export const getClubsFromFirestore = async () => {
  try {
    console.log('Fetching clubs from Firestore...');
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    
    const clubs = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      ville: doc.data().ville,
      codePostal: doc.data().codePostal,
      region: doc.data().region
    }));
    
    console.log('Clubs from Firestore:', clubs);
    return { success: true, clubs };
  } catch (error) {
    console.error('Error fetching clubs from Firestore:', error);
    return { success: false, error: error.message };
  }
};

export { db };



export const createCoachFirestore = async (coachData) => {
  try {
    const coachesRef = collection(db, 'coaches');
    const docRef = await addDoc(coachesRef, {
      email: coachData.email,
      prenom: coachData.prenom,
      telephone: coachData.telephone || '',
      numeroLicence: coachData.numeroLicence || '',
      firebaseUID: coachData.firebaseUID,
      clubId: coachData.clubId || '',
      clubName: coachData.clubName || ''  
    });
    return { success: true, coachId: docRef.id };
  } catch (error) {
    console.error('Error creating coach:', error);
    return { success: false, error: error.message };
  }
};