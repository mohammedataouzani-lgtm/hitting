import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DemandeCombatScreen({ navigation, route }) {
  const { boxer, adversaire } = route.params || {};

  if (!boxer || !adversaire) {
    return (
      <View style={styles.container}>
        <Text>Informations manquantes pour la demande</Text>
      </View>
    );
  }

  const [monClub, setMonClub] = useState('');
  const [typeCombat, setTypeCombat] = useState('Gala');
  const [dateSouhaitee, setDateSouhaitee] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [adresse, setAdresse] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const clubAdversaire = adversaire.adversaireClub || '';

  const today = new Date();
  const dateDemande = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const formatDate = (date) =>
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

  useEffect(() => {
    const fetchCoachClub = async () => {
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const db = getFirestore();
        const coachDoc = await getDoc(doc(db, 'coaches', uid));
        if (coachDoc.exists()) {
          const data = coachDoc.data();
          setMonClub(data.clubName || '');
        }
      } catch (error) {
        console.error('❌ Erreur récupération club coach:', error);
      }
    };
    fetchCoachClub();
  }, []);

  const handleSendRequest = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const emailCoach1 = auth.currentUser.email;

      const nomParts = (adversaire.adversaireNom || '').trim().split(' ');
      const prenomAdversaire = nomParts[0] || '';
      const nomAdversaire = nomParts.slice(1).join(' ') || nomParts[0] || '';

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/addDemandeMatch',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nomBoxeur: boxer.nom || '',
            prenomBoxeur: boxer.prenom || '',
            nomAdversaire,
            prenomAdversaire,
            dateSouhaitee: dateSouhaitee.toISOString(),
            adresse,
            message,
            emailCoach1,
            emailCoach2: adversaire.emailCoach2 || '',
            clubBoxeur: monClub,
            clubAdversaire,
            categorieDemandeur: boxer.categoriePoids || '',
            categorieAdversaire: Array.isArray(adversaire.categoriePoids) ? adversaire.categoriePoids[0] : adversaire.categoriePoids || '',
            typeCombat,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          "Demande envoyée ! 🥊",
          `Votre demande de combat entre ${boxer.prenom} ${boxer.nom} et ${adversaire.adversaireNom} a bien été transmise au coach adverse.`,
          [{ text: "Super !", onPress: () => navigation.pop(2) }]
        );
      } else {
        Alert.alert("Erreur", "La demande n'a pas pu être envoyée. Réessayez.");
      }
    } catch (error) {
      console.error('❌ Erreur envoi demande:', error);
      Alert.alert("Erreur", "Une erreur est survenue. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backTxt}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* VS CARD */}
        <View style={styles.vsCard}>
          <View style={styles.boxerProfile}>
            <Image
              source={{ uri: boxer.photo || boxer.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' }}
              style={styles.avatar}
            />
            <Text style={styles.boxerName} numberOfLines={2}>
              {boxer.prenom} {boxer.nom}
            </Text>
            <View style={styles.statsMiniRow}>
              {[{ l: 'VIC.', v: boxer.vic }, { l: 'DEF.', v: boxer.def }, { l: 'NULS', v: boxer.nuls }].map(({ l, v }) => (
                <View key={l} style={styles.statMiniItem}>
                  <Text style={styles.statMiniVal}>{v ?? '—'}</Text>
                  <Text style={styles.statMiniLbl}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.vsBadgeContainer}>
            <View style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </View>
          </View>

          <View style={styles.boxerProfile}>
            <Image
              source={{ uri: adversaire.adversairePhoto || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' }}
              style={styles.avatar}
            />
            <Text style={styles.boxerName} numberOfLines={2}>
              {adversaire.adversaireNom}
            </Text>
            <View style={styles.statsMiniRow}>
              {[{ l: 'VIC.', v: adversaire.palmares?.vic }, { l: 'DEF.', v: adversaire.palmares?.def }, { l: 'NULS', v: adversaire.palmares?.nuls }, { l: 'K.O', v: adversaire.palmares?.ko }].map(({ l, v }) => (
                <View key={l} style={styles.statMiniItem}>
                  <Text style={styles.statMiniVal}>{v ?? '—'}</Text>
                  <Text style={styles.statMiniLbl}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CLUBS */}
        <Text style={styles.sectionHeading}>CLUBS</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Mon club</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={monClub}
            editable={false}
            placeholder="Chargement..."
            placeholderTextColor="#A1A1A6"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Club adversaire</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={clubAdversaire}
            editable={false}
            placeholder="Club adverse"
            placeholderTextColor="#A1A1A6"
          />
        </View>

        {/* DÉTAILS DU COMBAT */}
        <Text style={styles.sectionHeading}>DÉTAIL DU COMBAT</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Type de combat</Text>
          <View style={styles.toggleRow}>
            {['Gala', 'Sparring'].map((type) => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => setTypeCombat(type)}
                style={[styles.toggleBtn, typeCombat === type && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleBtnTxt, typeCombat === type && styles.toggleBtnTxtActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.fieldLabel}>Date souhaitée</Text>
            <TouchableOpacity
              style={styles.inputDate}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.inputDateTxt}>{formatDate(dateSouhaitee)}</Text>
              <Text style={{ fontSize: 16 }}>📅</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateSouhaitee}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDateSouhaitee(selectedDate);
                }}
              />
            )}
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Date de demande</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={dateDemande}
              editable={false}
              placeholderTextColor="#A1A1A6"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Adresse du combat</Text>
          <TextInput
            style={styles.input}
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Adresse de la salle"
            placeholderTextColor="#C7C7CC"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Ajouter un message pour le coach adverse"
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* BOUTON ENVOI */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.sendBtn, loading && { opacity: 0.6 }]}
          onPress={handleSendRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendBtnTxt}>Envoyer la demande</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: '#FAF9F6',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backArrow: { fontSize: 22, color: '#222', fontWeight: '600' },
  backTxt: { fontSize: 16, fontWeight: '700', color: '#222' },
  scrollContent: { paddingHorizontal: 18 },

  vsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#E8E8E8',
    borderTopWidth: 5,
    borderTopColor: '#C2185B',
  },
  boxerProfile: { flex: 1, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E0E0E0', marginBottom: 8 },
  boxerName: { fontSize: 14, fontWeight: '800', color: '#111', textAlign: 'center', height: 38, marginBottom: 6, paddingHorizontal: 4 },
  statsMiniRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  statMiniItem: { alignItems: 'center', minWidth: 26 },
  statMiniVal: { fontSize: 13, fontWeight: '900', color: '#333' },
  statMiniLbl: { fontSize: 8, fontWeight: '700', color: '#999', marginTop: 1 },
  vsBadgeContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  vsText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  sectionHeading: { fontSize: 12, fontWeight: '800', color: '#8A8A8F', letterSpacing: 0.5, marginTop: 8, marginBottom: 12 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#3A3A3C', marginBottom: 8 },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1C1E',
  },
  disabledInput: { backgroundColor: '#F2F2F7', borderColor: '#E5E5EA', color: '#8E8E93' },
  textArea: { height: 100, paddingTop: 12, paddingBottom: 12 },
  row: { flexDirection: 'row' },

  inputDate: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputDateTxt: { fontSize: 15, color: '#1C1C1E' },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
  },
  toggleBtnActive: { backgroundColor: '#E8F0FE', borderColor: '#42A5F5' },
  toggleBtnTxt: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
  toggleBtnTxtActive: { color: '#42A5F5' },

  sendBtn: {
    backgroundColor: '#B71C1C',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#B71C1C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});