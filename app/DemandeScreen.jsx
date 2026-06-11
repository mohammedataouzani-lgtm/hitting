import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  StatusBar, Dimensions, Modal, Animated, PanResponder,
  TouchableWithoutFeedback, TextInput, Platform, Alert,
  ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;
const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

// ─────────────────────────────────────────────
// BOTTOM SHEET INFOS ADVERSAIRE
// ─────────────────────────────────────────────
function AdversaireSheet({ visible, match, boxer, onClose, onDemandePress }) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [translateY, backdropAnim]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 300, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [translateY, backdropAnim, onClose]);

  React.useEffect(() => {
    if (visible) { translateY.setValue(SHEET_HEIGHT); open(); }
  }, [visible]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => { if (g.dy > 100 || g.vy > 0.5) close(); else open(); },
  })).current;

  if (!visible || !match) return null;

  const palmares = match.palmares || {};

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={s.handleBar} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetBody}>
          {/* VS header */}
          <View style={s.vsRow}>
            {/* Mon boxeur */}
            <View style={s.vsBoxeur}>
              <Image source={{ uri: boxer.avatar }} style={s.vsAvatar} />
              <Text style={s.vsName}>{boxer.nom}</Text>
              <View style={s.vsStats}>
                {[{ l: 'VIC.', v: boxer.vic }, { l: 'DÉF.', v: boxer.def }, { l: 'NULS', v: boxer.nuls }].map(({ l, v }) => (
                  <View key={l} style={s.vsStat}><Text style={s.vsStatVal}>{v}</Text><Text style={s.vsStatLbl}>{l}</Text></View>
                ))}
              </View>
            </View>

            {/* VS badge */}
            <View style={s.vsBadge}><Text style={s.vsBadgeTxt}>VS</Text></View>

            {/* Adversaire */}
            <View style={s.vsBoxeur}>
              {match.adversairePhoto ? (
                <Image source={{ uri: match.adversairePhoto }} style={s.vsAvatar} />
              ) : (
                <View style={[s.vsAvatar, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 24 }}>🥊</Text>
                </View>
              )}
              <Text style={s.vsName}>{match.adversaireNom}</Text>
              <View style={s.vsStats}>
                {[{ l: 'VIC.', v: palmares.vic }, { l: 'DÉF.', v: palmares.def }, { l: 'NULS', v: palmares.nuls }, { l: 'K.O', v: palmares.ko }].map(({ l, v }) => (
                  <View key={l} style={s.vsStat}><Text style={s.vsStatVal}>{v ?? '—'}</Text><Text style={s.vsStatLbl}>{l}</Text></View>
                ))}
              </View>
            </View>
          </View>

          {/* Infos adversaire */}
          <View style={s.infoSection}>
            <InfoRow icon="⚖️" label="Catégorie" value={match.categoriePoids} />
            <InfoRow icon="🏟️" label="Club adversaire" value={match.adversaireClub} />
          </View>

          {/* Bouton demande */}
          <TouchableOpacity
            style={s.demandeBtn}
            activeOpacity={0.85}
            onPress={() => { close(); setTimeout(() => onDemandePress(match), 350); }}
          >
            <LinearGradient colors={['#EF5350', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.demandeBtnGradient}>
              <Text style={s.demandeBtnTxt}>Envoyer une demande de combat</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// FORMULAIRE DEMANDE DE COMBAT
// ─────────────────────────────────────────────
function FormulaireDemande({ visible, match, boxer, onClose }) {
  const [typeCombat, setTypeCombat] = useState('Gala');
  const [dateSouhaitee, setDateSouhaitee] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [adresse, setAdresse] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const uid = auth.currentUser.uid;

      const db = getFirestore();
      const coachDoc = await getDoc(doc(db, 'coaches', uid));
      const coachData = coachDoc.data();

      const nomParts = boxer.nom.trim().split(' ');
      const prenomBoxeur = nomParts[0] || '';
      const nomBoxeur = nomParts.slice(1).join(' ') || '';

      const adversaireParts = (match.adversaireNom || '').trim().split(' ');
      const prenomAdversaire = adversaireParts[0] || '';
      const nomAdversaire = adversaireParts.slice(1).join(' ') || '';

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/addDemandeMatch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({
            nomBoxeur,
            prenomBoxeur,
            nomAdversaire,
            prenomAdversaire,
            affichageCombat: match.affichageCombat || `${boxer.nom} VS ${match.adversaireNom}`,
            dateSouhaitee: dateSouhaitee.toISOString(),
            adresse,
            message,
            emailCoach1: coachData.email,
            clubBoxeur: coachData.clubName || '',
            clubAdversaire: match.adversaireClub || '',
            categorieDemandeur: boxer.poids || '',
            categorieAdversaire: match.categoriePoids || '',
            typeCombat,
          }),
        }
      );

      if (!response.ok) throw new Error('Erreur serveur');

      Alert.alert('✅ Demande envoyée', 'Votre demande de combat a bien été envoyée.');
      onClose();
    } catch (error) {
      console.error('Erreur demande combat:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !match) return null;

  const nomParts = boxer.nom.trim().split(' ');
  const prenomBoxeur = nomParts[0] || '';
  const adversaireParts = (match.adversaireNom || '').trim().split(' ');
  const prenomAdversaire = adversaireParts[0] || '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={f.header}>
          <TouchableOpacity onPress={onClose}><Text style={f.cancelTxt}>Annuler</Text></TouchableOpacity>
          <Text style={f.headerTitle}>Demande de combat</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#E53935" /> : <Text style={f.sendTxt}>Envoyer</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">

          {/* VS mini header */}
          <View style={f.vsRow}>
            <Image source={{ uri: boxer.avatar }} style={f.vsAvatar} />
            <View style={f.vsBadge}><Text style={f.vsBadgeTxt}>VS</Text></View>
            {match.adversairePhoto ? (
              <Image source={{ uri: match.adversairePhoto }} style={f.vsAvatar} />
            ) : (
              <View style={[f.vsAvatar, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 20 }}>🥊</Text>
              </View>
            )}
          </View>
          <Text style={f.vsNames}>{boxer.nom}  VS  {match.adversaireNom}</Text>

          {/* CLUBS */}
          <Text style={f.sectionLabel}>CLUBS</Text>
          <Text style={f.fieldLabel}>Mon club</Text>
          <View style={f.inputReadOnly}><Text style={f.inputReadOnlyTxt}>{match.adversaireClub ? 'Mon club' : '—'}</Text></View>
          <Text style={f.fieldLabel}>Club adversaire</Text>
          <View style={f.inputReadOnly}><Text style={f.inputReadOnlyTxt}>{match.adversaireClub || '—'}</Text></View>

          {/* DÉTAIL DU COMBAT */}
          <Text style={f.sectionLabel}>DÉTAIL DU COMBAT</Text>

          <Text style={f.fieldLabel}>Type de combat</Text>
          <View style={f.toggleRow}>
            {['Gala', 'Sparring', 'Combat'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[f.toggleBtn, typeCombat === t && f.toggleBtnActive]}
                onPress={() => setTypeCombat(t)}
              >
                <Text style={[f.toggleTxt, typeCombat === t && f.toggleTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={f.dateRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={f.fieldLabel}>Date souhaitée</Text>
              <TouchableOpacity style={f.inputDate} onPress={() => setShowDatePicker(true)}>
                <Text style={f.inputDateTxt}>
                  {dateSouhaitee.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateSouhaitee}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => { setShowDatePicker(false); if (d) setDateSouhaitee(d); }}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={f.fieldLabel}>Date de demande</Text>
              <View style={f.inputReadOnly}>
                <Text style={f.inputReadOnlyTxt}>
                  {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>

          <Text style={f.fieldLabel}>Adresse du combat</Text>
          <TextInput
            style={f.input}
            placeholder="Ex: 89 rue du landy"
            placeholderTextColor="#C0C0C0"
            value={adresse}
            onChangeText={setAdresse}
          />

          <Text style={f.fieldLabel}>Message</Text>
          <TextInput
            style={[f.input, f.textArea]}
            placeholder="Ajouter un message pour le coach adverse"
            placeholderTextColor="#C0C0C0"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Bouton envoyer */}
          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={f.submitBtn} activeOpacity={0.85}>
            <LinearGradient colors={['#EF5350', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={f.submitGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={f.submitTxt}>Envoyer la demande</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={s.infoTexts}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export { AdversaireSheet, FormulaireDemande };

// ─── Styles Sheet ─────────────────────────────
const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  vsBoxeur: { alignItems: 'center', flex: 1 },
  vsAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E0E0E0', marginBottom: 8, resizeMode: 'cover' },
  vsName: { fontSize: 13, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  vsStats: { flexDirection: 'row', gap: 8 },
  vsStat: { alignItems: 'center' },
  vsStatVal: { fontSize: 14, fontWeight: '900', color: '#111' },
  vsStatLbl: { fontSize: 8, fontWeight: '600', color: '#AAA', letterSpacing: 0.5 },
  vsBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  vsBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  infoSection: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 16, marginBottom: 20, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#999' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 1 },
  demandeBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  demandeBtnGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  demandeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

// ─── Styles Formulaire ────────────────────────
const f = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', backgroundColor: '#fff' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  cancelTxt: { fontSize: 15, color: '#999' },
  sendTxt: { fontSize: 15, color: '#E53935', fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingTop: 20, backgroundColor: '#F5F0EB' },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  vsAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0E0E0', resizeMode: 'cover' },
  vsBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  vsBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  vsNames: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 14, fontSize: 15, color: '#111', marginBottom: 16 },
  textArea: { height: 100, paddingTop: 12, paddingBottom: 12 },
  inputReadOnly: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 14, justifyContent: 'center', marginBottom: 16, opacity: 0.7 },
  inputReadOnlyTxt: { fontSize: 15, color: '#888' },
  inputDate: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  inputDateTxt: { fontSize: 15, color: '#111' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: { paddingHorizontal: 20, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  toggleTxt: { fontSize: 14, fontWeight: '600', color: '#555' },
  toggleTxtActive: { color: '#fff' },
  dateRow: { flexDirection: 'row' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  submitGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});