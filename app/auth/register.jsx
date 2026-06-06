import React, { useState } from 'react';
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
  FlatList,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWithEmail } from '../../services/firebase';
import { createCoachFirestore } from '../../services/firebase';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { getClubsFromFirestore } from '../../services/firebase';
import { useAuth } from '../../AuthContext';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser] = useState(null);
  
  // Step 2
  const [emailVerified, setEmailVerified] = useState(false);
  
  // Step 3
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [telephone, setTelephone] = useState('');
  const [numeroLicence, setNumeroLicence] = useState('');
  const [showClubModal, setShowClubModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ===== STEP 1 =====
  const handleStep1Continue = async () => {
    if (!prenom || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      const firebaseResult = await registerWithEmail(email, password);
      if (!firebaseResult.success) {
        Alert.alert('Erreur', 'Cet email existe peut-être déjà');
        return;
      }
      const currentUser = firebaseResult.user;
      setUser(currentUser);
      await sendEmailVerification(currentUser);
      Alert.alert('Email de vérification envoyé', `Un lien de confirmation a été envoyé à ${email}.`);
      setStep(2);
    } catch (error) {
      console.error('Erreur Step 1:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2 =====
  const handleStep2CheckEmail = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      await currentUser.reload();
      if (currentUser.emailVerified) {
        setEmailVerified(true);
        const clubsResult = await getClubsFromFirestore();
        if (clubsResult.success) {
          setClubs(clubsResult.clubs);
        }
        setStep(3);
      } else {
        Alert.alert('Email non vérifié', "Clique sur le lien dans l'email pour vérifier ton adresse");
      }
    } catch (error) {
      console.error('Erreur Step 2:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 3 =====
  const handleStep3Complete = async () => {
    if (!selectedClub || !telephone || !numeroLicence) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    try {
      const coachResult = await createCoachFirestore(user.uid, {
        firstName: prenom,
        lastName: '',
        email: user.email,
        telephone: telephone,
        numeroLicence: numeroLicence,
        clubId: selectedClub.id,
        clubName: selectedClub.name 
      });
      if (!coachResult.success) {
        Alert.alert('Erreur', 'Impossible de créer le profil coach');
        return;
      }
      await AsyncStorage.setItem('coachEmail', user.email);
      await AsyncStorage.setItem('firebaseUID', user.uid);
      await AsyncStorage.setItem('clubId', selectedClub.id);
      await AsyncStorage.setItem('coachPrenom', prenom);
      await AsyncStorage.setItem('clubName', selectedClub.name);
      setStep(4);
    } catch (error) {
      console.error('Erreur Step 3:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création du profil');
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 4: Paiement =====
  if (step === 4) {
    const PLANS = [
      {
        id: 'mensuel',
        label: 'Mensuel',
        badge: 'Populaire',
        price: '12,50€',
        priceLabel: 'Payer 12,50€',
        description: 'Accès complet, sans engagement.',
        color: {
          background: '#b81c1c',
          title: '#8B1A1A',
          description: '#8B1A1A',
          button: '#d32f2f',
          buttonText: '#FFFFFF',
          bullet: '#8B1A1A',
          badge: '#1A73E8',
        },
        features: [
          "1 mois offert à l'inscription",
          'Fiches boxeurs illimitées',
          "Recherche d'adversaires",
          'Historique des combats',
          'Messagerie inter-clubs',
        ],
      },
      {
        id: 'annuel',
        label: 'Annuellement',
        badge: null,
        price: '150€',
        priceLabel: 'Payer 150€',
        description: 'Économisez 2 mois par rapport au mensuel.',
        color: {
          background: '#C9DCF5',
          title: '#1A4A8B',
          description: '#1A4A8B',
          button: '#1A73E8',
          buttonText: '#FFFFFF',
          bullet: '#1A4A8B',
          badge: null,
        },
        features: [
          "1 mois offert à l'inscription",
          'Fiches boxeurs illimitées',
          "Recherche d'adversaires",
          'Historique des combats',
          'Messagerie inter-clubs',
        ],
      },
    ];

    const handlePayment = (plan) => {
      Alert.alert(
        'Confirmer votre abonnement',
        `Vous allez souscrire à l'offre ${plan.label} à ${plan.price}.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: async () => {
              setLoading(true);
              try {
                console.log(`Payment for ${plan.id} initiated`);
                // TODO: Intégrer Stripe ou Adyen ici
                await login(user.uid);
              } catch (error) {
                console.error('Erreur paiement:', error.message);
                Alert.alert('Erreur', 'Le paiement a échoué');
              } finally {
                setLoading(false);
              }
            }
          },
        ]
      );
    };

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Choisissez votre formule</Text>
            <Text style={styles.subtitle}>Commencez votre abonnement</Text>
            {PLANS.map((plan) => (
              <View key={plan.id} style={[styles.card, { backgroundColor: plan.color.background }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.planLabel, { color: plan.color.title }]}>{plan.label}</Text>
                  {plan.badge && (
                    <View style={[styles.badge, { backgroundColor: plan.color.badge }]}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.price, { color: plan.color.title }]}>{plan.price}</Text>
                <Text style={[styles.description, { color: plan.color.description }]}>{plan.description}</Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: plan.color.button }]}
                  onPress={() => handlePayment(plan)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={plan.color.buttonText} />
                  ) : (
                    <Text style={[styles.buttonText, { color: plan.color.buttonText }]}>{plan.priceLabel}</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.features}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Text style={[styles.bullet, { color: plan.color.bullet }]}>•</Text>
                      <Text style={[styles.featureText, { color: plan.color.bullet }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setStep(3)} disabled={loading}>
              <Text style={styles.footerText}>← Retour</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ===== RENDER STEP 1 =====
  if (step === 1) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez Hitting aujourd'hui</Text>
            <TextInput style={styles.input} placeholder="Prénom *" placeholderTextColor="#999" value={prenom} onChangeText={setPrenom} editable={!loading} />
            <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
            <TextInput style={styles.input} placeholder="Mot de passe *" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
            <TextInput style={styles.input} placeholder="Confirmer le mot de passe *" placeholderTextColor="#999" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleStep1Continue} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuer</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.footerText}>Vous avez déjà un compte ? <Text style={styles.footerLink}>Se connecter</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ===== RENDER STEP 2 =====
  if (step === 2) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Vérification email</Text>
            <Text style={styles.subtitle}>Un lien de confirmation a été envoyé à {email}</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Clique sur le lien dans ton email pour vérifier ton adresse.</Text>
            </View>
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleStep2CheckEmail} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>J'ai vérifié mon email</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(1)} disabled={loading}>
              <Text style={styles.footerText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ===== RENDER STEP 3 =====
  if (step === 3) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Bienvenue sur Hitting</Text>
            <Text style={styles.subtitle}>Complétez votre profil coach</Text>
            <Text style={styles.label}>Club *</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowClubModal(true)}>
              <Text style={styles.dropdownButtonText}>
                {selectedClub ? selectedClub.name : 'Cherchez et sélectionnez votre club'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput style={styles.input} placeholder="Ex: 06 12 34 56 78" placeholderTextColor="#999" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" maxLength={14} editable={!loading} />
            <Text style={styles.helpText}>Fixe ou portable accepté</Text>
            <Text style={styles.label}>Numéro d'affiliation FFBoxe *</Text>
            <TextInput style={styles.input} placeholder="Votre numéro d'affiliation FFBoxe" placeholderTextColor="#999" value={numeroLicence} onChangeText={setNumeroLicence} editable={!loading} />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleStep3Complete} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Valider mon profil</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
        <Modal visible={showClubModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sélectionner votre club</Text>
                <TouchableOpacity onPress={() => setShowClubModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ paddingHorizontal: 24, paddingVertical: 8, color: '#666' }}>{clubs.length} clubs chargés</Text>
              <FlatList
                data={clubs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.clubItem} onPress={() => { setSelectedClub(item); setShowClubModal(false); }}>
                    <Text style={styles.clubItemName}>{item.name}</Text>
                    <Text style={styles.clubItemDetails}>{item.ville} - {item.codePostal}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 8, marginTop: 20 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ddd', color: '#000' },
  button: { backgroundColor: "#d32f2f", borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 16, borderWidth: 2, borderColor: "#d32f2f" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footerText: { textAlign: 'center', color: '#666', fontSize: 14 },
  footerLink: { color: '#007AFF', fontWeight: '600' },
  infoBox: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 16, marginBottom: 24 },
  infoText: { fontSize: 14, color: '#333', lineHeight: 20 },
  dropdownButton: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  dropdownButtonText: { fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '100%', paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  modalClose: { fontSize: 24, color: '#666' },
  clubItem: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  clubItemName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  clubItemDetails: { fontSize: 14, color: '#999' },
  card: { borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planLabel: { fontSize: 14, fontWeight: '500' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  price: { fontSize: 36, fontWeight: '700', marginBottom: 4 },
  description: { fontSize: 13, marginBottom: 16, opacity: 0.85 },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: { fontSize: 16, lineHeight: 22 },
  featureText: { fontSize: 14, lineHeight: 22, flex: 1 },
  helpText: { fontSize: 12, color: '#666', marginBottom: 12, marginTop: -8, paddingLeft: 4 },
});
