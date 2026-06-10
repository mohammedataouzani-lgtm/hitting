import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../../AuthContext';

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
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loginWithEmail,
  loginWithGoogleCredential,
} from "../../services/firebase";
import {
  doc,
  getDoc,
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const { width } = Dimensions.get("window");

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);

  // --- Mot de passe oublié ---
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // --- Identifiant oublié ---
  const [showForgotEmail, setShowForgotEmail] = useState(false);
  const [searchPrenom, setSearchPrenom] = useState("");
  const [searchTel, setSearchTel] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // Configuration Google Sign-In
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      "380253921077-qoule85g3a3ivi7au1c2jv0r94jqneuh.apps.googleusercontent.com",
    androidClientId:
      "380253921077-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com",
    webClientId:
      "380253921077-u6bro404ui016onmskqi3fjjv2r5t835.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const carouselImages = [
    "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800",
    "https://images.unsplash.com/photo-1561677843-39dee7a319ca?w=800",
    "https://images.unsplash.com/photo-1587411768941-671226e4a152?w=800",
  ];

  // ─────────────────────────────────────────────
  // LOGIN EMAIL
  // ─────────────────────────────────────────────
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
      const db = getFirestore();
      const docRef = doc(db, "coaches", user.uid);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        Alert.alert("Accès refusé", "Votre profil n'a pas été trouvé.");
        setLoading(false);
        return;
      }
      const coach = snapshot.data();
      await AsyncStorage.setItem("coachId", user.uid);
      await AsyncStorage.setItem("coachEmail", email);
      await AsyncStorage.setItem("firebaseUID", user.uid);
      await AsyncStorage.setItem("coachPrenom", coach.prenom || "Coach");
      await AsyncStorage.setItem("clubId", coach.clubId || "");
      await AsyncStorage.setItem("clubName", coach.clubName || "Votre club");
      login(user);
      navigation.replace("Dashboard");
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // LOGIN GOOGLE
  // ─────────────────────────────────────────────
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
      await AsyncStorage.setItem("coachId", snapshot.docs[0].id);
      await AsyncStorage.setItem("coachEmail", user.email);
      await AsyncStorage.setItem("firebaseUID", user.uid);
      await AsyncStorage.setItem("coachPrenom", coach.prenom || "Coach");
      await AsyncStorage.setItem("clubId", coach.clubId || "");
      await AsyncStorage.setItem("clubName", coach.clubName || "Votre club");
      await login(user.uid);
    } catch (error) {
      console.error("Erreur Google:", error);
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // MOT DE PASSE OUBLIÉ
  // ─────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("Erreur", "Veuillez saisir votre adresse email.");
      return;
    }
    setResetLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail.trim());
      Alert.alert(
        "Email envoyé",
        "Un lien de réinitialisation a été envoyé à " + resetEmail.trim(),
        [{ text: "OK", onPress: () => { setShowForgotPassword(false); setResetEmail(""); } }]
      );
    } catch (error) {
      console.error("Reset password error:", error);
      if (error.code === "auth/user-not-found") {
        Alert.alert("Erreur", "Aucun compte associé à cet email.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Erreur", "Adresse email invalide.");
      } else {
        Alert.alert("Erreur", "Une erreur est survenue. Réessayez.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // IDENTIFIANT OUBLIÉ
  // ─────────────────────────────────────────────
  const handleForgotEmail = async () => {
    if (!searchPrenom.trim() || !searchTel.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    setSearchLoading(true);
    try {
      const db = getFirestore();
      const coachesRef = collection(db, "coaches");

      // Recherche par firstName + lastName + telephone
      const q = query(
        coachesRef,
        where("firstName", "==", searchPrenom.trim()),
        where("telephone", "==", searchTel.trim())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert(
          "Introuvable",
          "Aucun compte trouvé avec ces informations. Vérifiez vos données ou contactez le support."
        );
      } else {
        const coach = snapshot.docs[0].data();
        const foundEmail = coach.email || coach.coachEmail || "";
        // On masque partiellement l'email : was***@gmail.com
        const maskedEmail = maskEmail(foundEmail);
        Alert.alert(
          "Compte trouvé",
          `Votre identifiant est : ${maskedEmail}\n\nConnectez-vous avec cet email.`,
          [{ text: "OK", onPress: () => { setShowForgotEmail(false); resetForgotEmailForm(); } }]
        );
      }
    } catch (error) {
      console.error("Forgot email error:", error);
      Alert.alert("Erreur", "Une erreur est survenue. Réessayez.");
    } finally {
      setSearchLoading(false);
    }
  };

  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return email;
    const [local, domain] = email.split("@");
    const visible = local.slice(0, 3);
    return `${visible}${"*".repeat(Math.max(local.length - 3, 2))}@${domain}`;
  };

  const resetForgotEmailForm = () => {
    setSearchPrenom("");
    setSearchTel("");
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveSlide(slideIndex);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carrousel */}
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
                <Image source={{ uri: imageUrl }} style={styles.carouselImage} />
              </View>
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {carouselImages.map((_, index) => (
              <View
                key={index}
                style={[styles.paginationDot, index === activeSlide && styles.paginationDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Formulaire */}
        <View style={styles.content}>
          <Text style={styles.title}>Bienvenue sur Hitting</Text>
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

            {/* Mot de passe oublié */}
            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => setShowForgotPassword(true)}
            >
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton connexion */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.socialTitle}>Se connecter avec</Text>

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

              {/* Identifiant oublié */}
              <TouchableOpacity
                style={styles.forgotEmailLinkWrapper}
                onPress={() => setShowForgotEmail(true)}
              >
                <Text style={styles.footerText}>
                  <Text style={styles.footerLink}>Identifiant oublié ?</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─── MODAL : Mot de passe oublié ─── */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <KeyboardAvoidingView
          style={styles.centeredModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.centeredModalContainer}>
            <Text style={styles.modalTitle}>Mot de passe oublié</Text>
            <Text style={styles.modalSubtitle}>
              Saisissez votre email, on vous envoie un lien de réinitialisation.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Votre adresse email"
              placeholderTextColor="#999"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!resetLoading}
            />

            <TouchableOpacity
              style={[styles.loginButton, resetLoading && styles.loginButtonDisabled]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => { setShowForgotPassword(false); setResetEmail(""); }}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL : Identifiant oublié ─── */}
      <Modal
        visible={showForgotEmail}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotEmail(false)}
      >
        <KeyboardAvoidingView
          style={styles.centeredModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.centeredModalContainer}>
            <Text style={styles.modalTitle}>Identifiant oublié</Text>
            <Text style={styles.modalSubtitle}>
              Renseignez vos informations pour retrouver votre compte.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="#999"
              value={searchPrenom}
              onChangeText={setSearchPrenom}
              autoCapitalize="words"
              editable={!searchLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Numéro de téléphone"
              placeholderTextColor="#999"
              value={searchTel}
              onChangeText={setSearchTel}
              keyboardType="phone-pad"
              editable={!searchLoading}
            />

            <TouchableOpacity
              style={[styles.loginButton, searchLoading && styles.loginButtonDisabled]}
              onPress={handleForgotEmail}
              disabled={searchLoading}
            >
              {searchLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Retrouver mon compte</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => { setShowForgotEmail(false); resetForgotEmailForm(); }}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  forgotPasswordLink: { alignSelf: "flex-end", marginTop: -8, marginBottom: 16 },
  forgotPasswordText: { color: "#d32f2f", fontSize: 13, fontWeight: "500" },
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
  socialButtonDisabled: { opacity: 0.3 },
  footer: { marginTop: 24, alignItems: "center", gap: 12 },
  footerText: { fontSize: 14, color: "#666" },
  footerLink: { color: "#007AFF", fontWeight: "600" },
  forgotEmailLinkWrapper: { marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  centeredModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 },
  centeredModalContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#000", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: "#666", marginBottom: 24, lineHeight: 20 },
  modalCancelButton: { marginTop: 8, alignItems: "center", padding: 12 },
  modalCancelText: { color: "#666", fontSize: 15 },
});
