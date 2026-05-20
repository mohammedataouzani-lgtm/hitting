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

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1, 2, ou 3
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
  

  // ===== STEP 1: Prénom + Email + Password =====
  const handleStep1Continue = async () => {
    // Validation
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
      // Créer le compte Firebase
      const firebaseResult = await registerWithEmail(email, password);
      
      if (!firebaseResult.success) {
        Alert.alert('Erreur', 'Cet email existe peut-être déjà');
        setLoading(false);
        return;
      }

      const currentUser = firebaseResult.user;
      setUser(currentUser);

      // Envoyer email de vérification
      await sendEmailVerification(currentUser);

      Alert.alert(
        'Email de vérification envoyé',
        `Un lien de confirmation a été envoyé à ${email}. Clique dessus pour vérifier ton email.`
      );

      setStep(2);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: Vérifier email =====
  const handleStep2CheckEmail = async () => {
    setLoading(true);

    try {
      // Recharger l'utilisateur pour vérifier emailVerified
      const auth = getAuth();
      const currentUser = auth.currentUser;
      await currentUser.reload();

      if (currentUser.emailVerified) {
        setEmailVerified(true);
        // Charger les clubs pour l'étape 3
        const clubsResult = await getClubsFromFirestore();
        if (clubsResult.success) {
          setClubs(clubsResult.clubs);
        }
        setStep(3);
      } else {
        Alert.alert(
          'Email non vérifié',
          'Clique sur le lien dans l\'email pour vérifier ton adresse'
        );
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 3: Compléter profil =====
 // ===== STEP 3: Compléter profil =====
const handleStep3Complete = async () => {
  if (!selectedClub || !telephone || !numeroLicence) {
    Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
    return;
  }

  setLoading(true);

  try {
    const coachResult = await createCoachFirestore({
      email: user.email,
      prenom: prenom,
      telephone: telephone,
      numeroLicence: numeroLicence,
      firebaseUID: user.uid,
      clubId: selectedClub.id,
      clubName: selectedClub.name 
    });

    if (!coachResult.success) {
      Alert.alert('Erreur', 'Impossible de créer le profil coach');
      setLoading(false);
      return;
    }

    // Sauvegarder localement
    await AsyncStorage.setItem('coachId', coachResult.coachId);
    await AsyncStorage.setItem('coachEmail', user.email);
    await AsyncStorage.setItem('firebaseUID', user.uid);
    await AsyncStorage.setItem('clubId', selectedClub.id);
    await AsyncStorage.setItem('coachPrenom', prenom);
    await AsyncStorage.setItem('clubName', selectedClub.name);

    // ✨ Aller à l'étape paiement au lieu de Dashboard
    setStep(4);

  } catch (error) {
    console.error('Erreur:', error);
    Alert.alert('Erreur', 'Une erreur est survenue');
  } finally {
    setLoading(false);
  }
};
  // ===== RENDER STEP 1 =====
  if (step === 1) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez Hitting aujourd'hui</Text>

            <TextInput
              style={styles.input}
              placeholder="Prénom *"
              placeholderTextColor="#999"
              value={prenom}
              onChangeText={setPrenom}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Mot de passe *"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe *"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleStep1Continue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continuer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.footerText}>
                Vous avez déjà un compte ? <Text style={styles.footerLink}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ===== RENDER STEP 2 =====
  if (step === 2) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Entrer le code de vérification</Text>
            <Text style={styles.subtitle}>Un lien de confirmation a été envoyé à {email}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Clique sur le lien dans ton email pour vérifier ton adresse.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleStep2CheckEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>J'ai vérifié mon email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setStep(1)}
              disabled={loading}
            >
              <Text style={styles.footerText}>
                Retour
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
// ===== RENDER STEP 4: Paiement =====
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
        '1 mois offert à l\'inscription',
        'Fiches boxeurs illimitées',
        'Recherche d\'adversaires',
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
        '1 mois offert à l\'inscription',
        'Fiches boxeurs illimitées',
        'Recherche d\'adversaires',
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
              // TODO: Intégrer Stripe ou Adyen ici
              console.log(`Payment for ${plan.id} initiated`);
              
              // Après paiement réussi, go to Dashboard
             navigation.replace('Dashboard'); 
            } catch (error) {
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Choisissez votre formule</Text>
          <Text style={styles.subtitle}>Commencez votre abonnement</Text>

          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[styles.card, { backgroundColor: plan.color.background }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.planLabel, { color: plan.color.title }]}>
                  {plan.label}
                </Text>
                {plan.badge && (
                  <View style={[styles.badge, { backgroundColor: plan.color.badge }]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.price, { color: plan.color.title }]}>
                {plan.price}
              </Text>

              <Text style={[styles.description, { color: plan.color.description }]}>
                {plan.description}
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: plan.color.button }]}
                onPress={() => handlePayment(plan)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={plan.color.buttonText} />
                ) : (
                  <Text style={[styles.buttonText, { color: plan.color.buttonText }]}>
                    {plan.priceLabel}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.features}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Text style={[styles.bullet, { color: plan.color.bullet }]}>•</Text>
                    <Text style={[styles.featureText, { color: plan.color.bullet }]}>
                      {feature}
                    </Text>
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
  // ===== RENDER STEP 3 =====
  if (step === 3) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Bienvenue sur Hitting</Text>
            <Text style={styles.subtitle}>Complétez votre profil coach</Text>

            {/* Club Dropdown */}
            <Text style={styles.label}>Club *</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowClubModal(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {selectedClub ? selectedClub.name : 'Cherchez et sélectionnez votre club'}
              </Text>
            </TouchableOpacity>

            {/* Téléphone */}
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre numéro de téléphone"
              placeholderTextColor="#999"
              value={telephone}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
              editable={!loading}
            />

            {/* Numéro de licence */}
            <Text style={styles.label}>Numéro d'affiliation FFBoxe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre numéro d'affiliation FFBoxe"
              placeholderTextColor="#999"
              value={numeroLicence}
              onChangeText={setNumeroLicence}
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleStep3Complete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Valider mon profil</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Club Modal */}
        <Modal
          visible={showClubModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sélectionner votre club</Text>
                <TouchableOpacity onPress={() => setShowClubModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text>{clubs.length} clubs chargés</Text>
<FlatList
  data={clubs}
                data={clubs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.clubItem}
                    onPress={() => {
                      setSelectedClub(item);
                      setShowClubModal(false);
                    }}
                  >
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  button: {
     backgroundColor: "#d32f2f",
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 2,
  borderColor: "#d32f2f",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  dropdownButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '100%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  clubItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clubItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  clubItemDetails: {
    fontSize: 14,
    color: '#999',
  },
  card: {
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
},
cardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
},
planLabel: {
  fontSize: 14,
  fontWeight: '500',
},
badge: {
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 3,
},
badgeText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600',
},
price: {
  fontSize: 36,
  fontWeight: '700',
  marginBottom: 4,
},
description: {
  fontSize: 13,
  marginBottom: 16,
  opacity: 0.85,
},
button: {
  borderRadius: 10,
  paddingVertical: 15,
  alignItems: 'center',
  marginBottom: 20,
},
buttonText: {
  fontSize: 16,
  fontWeight: '600',
},
features: {
  gap: 10,
},
featureRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 8,
},
bullet: {
  fontSize: 16,
  lineHeight: 22,
},
featureText: {
  fontSize: 14,
  lineHeight: 22,
  flex: 1,
},
});