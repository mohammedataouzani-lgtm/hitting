import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../../context/AuthContext';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loginWithEmail,
  loginWithGoogleCredential,
} from "../../services/firebase";
import { doc, getDoc, getFirestore } from "firebase/firestore";

const { width } = Dimensions.get("window");

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);

  // Configuration Google Sign-In
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      "380253921077-qoule85g3a3ivi7au1c2jv0r94jqneuh.apps.googleusercontent.com",
    androidClientId:
      "380253921077-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com", 
    webClientId:
      "380253921077-u6bro404ui016onmskqi3fjjv2r5t835.apps.googleusercontent.com",
  });

  // Gérer la réponse Google
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  // Images du carrousel
  const carouselImages = [
    "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800",
    "https://images.unsplash.com/photo-1561677843-39dee7a319ca?w=800",
    "https://images.unsplash.com/photo-1587411768941-671226e4a152?w=800",
  ];

  // VERSION UNIQUE DE HANDLELOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const firebaseResult = await loginWithEmail(email, password);

      if (!firebaseResult.success) {
        Alert.alert("Erreur", "Email ou mot de passe incorrect");
        setLoading(false);
        return;
      }

      const { user } = firebaseResult;

// ✅ Lecture directe par UID au lieu d'une query sur toute la collection
const db = getFirestore();
const docRef = doc(db, 'coaches', user.uid);
const snapshot = await getDoc(docRef);

if (!snapshot.exists()) {
  Alert.alert("Accès refusé", "Votre profil n'a pas été trouvé.");
  setLoading(false);
  return;
}

const coach = snapshot.data();

      // Sauvegardes existantes
      await AsyncStorage.setItem("coachId", user.uid); 
      await AsyncStorage.setItem("coachEmail", email);
      await AsyncStorage.setItem("firebaseUID", user.uid);
      await AsyncStorage.setItem("coachPrenom", coach.prenom || "Coach");
      await AsyncStorage.setItem("clubId", coach.clubId || "");
      await AsyncStorage.setItem("clubName", coach.clubName || "Votre club");

      // Sauvegarde sécurisée et switch de navigation vers le Dashboard
    login(user);
navigation.replace("Dashboard");
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // VERSION UNIQUE DE HANDLEGOOGLELOGIN
  const handleGoogleLogin = async (idToken) => {
    setLoading(true);
    try {
      const result = await loginWithGoogleCredential(idToken);

      if (!result.success) {
        Alert.alert("Erreur", "Connexion Google échouée");
        setLoading(false);
        return;
      }

      const { user } = result;
      const db = getFirestore();
      const coachesRef = collection(db, "coaches");
      const q = query(coachesRef, where("firebaseUID", "==", user.uid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("Accès refusé", "Votre profil n'a pas été trouvé.");
        setLoading(false);
        return;
      }

      const coach = snapshot.docs[0].data();

      // Sauvegardes existantes
      await AsyncStorage.setItem("coachId", snapshot.docs[0].id);
      await AsyncStorage.setItem("coachEmail", user.email);
      await AsyncStorage.setItem("firebaseUID", user.uid);
      await AsyncStorage.setItem("coachPrenom", coach.prenom || "Coach");
      await AsyncStorage.setItem("clubId", coach.clubId || "");
      await AsyncStorage.setItem("clubName", coach.clubName || "Votre club");

      // Connexion via le contexte global
      await login(user.uid);

    } catch (error) {
      console.error("Erreur Google:", error);
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveSlide(slideIndex);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carrousel d'images */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {carouselImages.map((imageUrl, index) => (
              <View key={index} style={styles.slide}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.carouselImage}
                />
              </View>
            ))}
          </ScrollView>

          {/* Indicateurs de pagination */}
          <View style={styles.pagination}>
            {carouselImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeSlide && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Contenu du formulaire */}
        <View style={styles.content}>
          <Text style={styles.title}>Bienvenue sur Hitting</Text>

          {/* Champs du formulaire */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {/* Bouton de connexion */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Divider "ou" */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Texte "Se connecter avec" */}
            <Text style={styles.socialTitle}>Se connecter avec</Text>

            {/* Boutons sociaux */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => promptAsync()}
                disabled={!request || loading}
              >
                <Text style={styles.socialIcon}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonDisabled]}
                disabled={true}
              >
                <Text style={styles.socialIcon}>f</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.footerText}>
                  Pas encore de compte,{" "}
                  <Text style={styles.footerLink}>créer ici</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1 },
  carouselContainer: { height: 300, position: "relative" },
  slide: { width: width, height: 300 },
  carouselImage: { width: width - 32, height: 300, marginHorizontal: 16, borderRadius: 20, resizeMode: "cover" },
  pagination: { flexDirection: "row", position: "absolute", bottom: 16, alignSelf: "center" },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ccc", marginHorizontal: 4 },
  paginationDotActive: { backgroundColor: "#000" },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#000", marginBottom: 24 },
  form: { width: "100%" },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: "#ddd", color: "#000" },
  loginButton: { backgroundColor: "#d32f2f", borderRadius: 8, padding: 16, alignItems: "center", marginBottom: 20, borderWidth: 2, borderColor: "#d32f2f" },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ddd" },
  dividerText: { marginHorizontal: 16, color: "#666", fontSize: 14 },
  socialTitle: { textAlign: "center", color: "#000", fontSize: 14, marginBottom: 16 },
  socialButtons: { flexDirection: "row", justifyContent: "center", gap: 16 },
  socialButton: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  socialIcon: { fontSize: 24, fontWeight: "bold", color: "#666" },
  footer: { marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 14, color: "#666" },
  footerLink: { color: "#007AFF", fontWeight: "600" },
  socialButtonDisabled: { opacity: 0.3 },
});