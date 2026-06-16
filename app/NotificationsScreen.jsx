import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { getAuth } from 'firebase/auth';

const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

const TYPES_VICTOIRE = ['Aux points', 'KO', 'TKO', 'Abandon', 'Disqualification'];

// ─────────────────────────────────────────────
// CARTE NOTIFICATION - DEMANDE
// ─────────────────────────────────────────────
function DemandeNotifCard({ demande, onPress }) {
  const isRecue = demande.type === 'recue';
  return (
    <TouchableOpacity style={s.notifCard} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.notifIconWrap, { backgroundColor: isRecue ? '#FFF8E1' : '#E3F2FD' }]}>
        <Text style={s.notifIcon}>{isRecue ? '🥊' : '📤'}</Text>
      </View>
      <View style={s.notifTextWrap}>
        <Text style={s.notifTitle}>
          {isRecue ? 'Demande reçue' : 'Demande envoyée'} <Text style={s.notifStatutTag}>· En attente</Text>
        </Text>
        <Text style={s.notifSubtitle} numberOfLines={1}>
          {demande.prenomBoxeur} {demande.nomBoxeur} <Text style={s.notifVs}>vs</Text> {demande.prenomAdversaire} {demande.nomAdversaire}
        </Text>
      </View>
      <Text style={s.notifChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// CARTE NOTIFICATION - BOXEUR VALIDÉ
// ─────────────────────────────────────────────
function BoxeurValideCard({ boxeur }) {
  return (
    <View style={s.notifCard}>
      <View style={[s.notifIconWrap, { backgroundColor: '#E8F5E9' }]}>
        <Text style={s.notifIcon}>✅</Text>
      </View>
      <View style={s.notifTextWrap}>
        <Text style={s.notifTitle}>Boxeur validé</Text>
        <Text style={s.notifSubtitle} numberOfLines={1}>
          {boxeur.prenom} {boxeur.nom} a été ajouté à votre effectif
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// CARTE NOTIFICATION - RÉSULTAT À SAISIR
// ─────────────────────────────────────────────
function ResultatNotifCard({ combat, onPress }) {
  return (
    <TouchableOpacity style={s.notifCard} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.notifIconWrap, { backgroundColor: '#F3E5F5' }]}>
        <Text style={s.notifIcon}>🏆</Text>
      </View>
      <View style={s.notifTextWrap}>
        <Text style={s.notifTitle}>Résultat à saisir</Text>
        <Text style={s.notifSubtitle} numberOfLines={1}>
          {combat.combattants || `${combat.boxeurA} vs ${combat.boxeurB}`}
        </Text>
      </View>
      <Text style={s.notifChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// MODAL FORMULAIRE RÉSULTAT
// ─────────────────────────────────────────────
function ResultatForm({ visible, combat, onClose, onSubmit, loading }) {
  const [gagnant, setGagnant] = useState(null); // 'monBoxeur' | 'adversaire' | 'nul'
  const [round, setRound] = useState('');
  const [typeVictoire, setTypeVictoire] = useState(null);
  const [scoreBoxeur, setScoreBoxeur] = useState('');
  const [commentaire, setCommentaire] = useState('');

  const resetForm = () => {
    setGagnant(null); setRound(''); setTypeVictoire(null);
    setScoreBoxeur(''); setCommentaire('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = () => {
    if (!gagnant) { Alert.alert('Champ manquant', 'Sélectionnez le résultat du combat.'); return; }
    onSubmit({ gagnant, round, typeVictoire, scoreBoxeur, commentaire });
  };

  if (!combat) return null;

  const monNom = combat.role === 'A' ? combat.boxeurA : combat.boxeurB;
  const adversaireNom = combat.role === 'A' ? combat.boxeurB : combat.boxeurA;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={f.header}>
          <TouchableOpacity onPress={handleClose}><Text style={f.cancelTxt}>Annuler</Text></TouchableOpacity>
          <Text style={f.headerTitle}>Résultat du combat</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#E53935" /> : <Text style={f.sendTxt}>Valider</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
          <Text style={f.vsNames}>{monNom}  vs  {adversaireNom}</Text>

          <Text style={f.sectionLabel}>RÉSULTAT</Text>
          <View style={f.toggleRow}>
            <TouchableOpacity
              style={[f.toggleBtn, gagnant === 'monBoxeur' && f.toggleBtnWin]}
              onPress={() => setGagnant('monBoxeur')}
            >
              <Text style={[f.toggleTxt, gagnant === 'monBoxeur' && f.toggleTxtActive]}>Mon boxeur gagne</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[f.toggleBtn, gagnant === 'nul' && f.toggleBtnActive]}
              onPress={() => setGagnant('nul')}
            >
              <Text style={[f.toggleTxt, gagnant === 'nul' && f.toggleTxtActive]}>Nul</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[f.toggleBtn, gagnant === 'adversaire' && f.toggleBtnLose]}
              onPress={() => setGagnant('adversaire')}
            >
              <Text style={[f.toggleTxt, gagnant === 'adversaire' && f.toggleTxtActive]}>Adversaire gagne</Text>
            </TouchableOpacity>
          </View>

          <Text style={f.sectionLabel}>DÉTAIL</Text>

          <Text style={f.fieldLabel}>Type de victoire</Text>
          <View style={f.chipsWrap}>
            {TYPES_VICTOIRE.map((type) => (
              <TouchableOpacity
                key={type}
                style={[f.chip, typeVictoire === type && f.chipActive]}
                onPress={() => setTypeVictoire(type)}
              >
                <Text style={[f.chipTxt, typeVictoire === type && f.chipTxtActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={f.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={f.fieldLabel}>Round</Text>
              <TextInput
                style={f.input}
                placeholder="Ex: 3"
                placeholderTextColor="#C0C0C0"
                value={round}
                onChangeText={setRound}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={f.fieldLabel}>Score (points)</Text>
              <TextInput
                style={f.input}
                placeholder="Ex: 30"
                placeholderTextColor="#C0C0C0"
                value={scoreBoxeur}
                onChangeText={setScoreBoxeur}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={f.fieldLabel}>Commentaire</Text>
          <TextInput
            style={[f.input, f.textArea]}
            placeholder="Détails sur le déroulement du combat..."
            placeholderTextColor="#C0C0C0"
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={f.submitBtn} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={f.submitTxt}>Valider le résultat</Text>}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// SCREEN PRINCIPAL
// ─────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [demandes, setDemandes] = useState([]);
  const [boxeursValides, setBoxeursValides] = useState([]);
  const [combatsATraiter, setCombatsATraiter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [resultatFormVisible, setResultatFormVisible] = useState(false);
  const [selectedCombat, setSelectedCombat] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);

      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' };

      const [notifRes, combatsRes] = await Promise.all([
        fetch('https://europe-west9-hitting-23de9.cloudfunctions.net/getNotifications', { method: 'GET', headers }),
        fetch('https://europe-west9-hitting-23de9.cloudfunctions.net/getCombatsATraiter', { method: 'GET', headers }),
      ]);

      const notifData = await notifRes.json();
      const combatsData = await combatsRes.json();

      if (notifData.success) {
        setDemandes(notifData.demandesEnAttente || []);
        setBoxeursValides(notifData.boxeursValides || []);
      }
      if (combatsData.success) {
        setCombatsATraiter(combatsData.combatsATraiter || []);
      }
    } catch (error) {
      console.error('❌ Erreur fetchAll:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openResultatForm = (combat) => {
    setSelectedCombat(combat);
    setResultatFormVisible(true);
  };

  const closeResultatForm = () => {
    setResultatFormVisible(false);
    setSelectedCombat(null);
  };

  const handleSubmitResultat = async ({ gagnant, round, typeVictoire, scoreBoxeur, commentaire }) => {
    if (!selectedCombat) return;
    setSubmitLoading(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/submitResultatCombat',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resultatId: selectedCombat.id,
            role: selectedCombat.role,
            scoreBoxeur,
            round,
            typeVictoire,
            commentaire,
            gagnant,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setCombatsATraiter((prev) => prev.filter((c) => c.id !== selectedCombat.id));
        Alert.alert('✅ Résultat enregistré', 'Votre saisie a bien été prise en compte.');
        closeResultatForm();
      } else {
        Alert.alert('Erreur', "Le résultat n'a pas pu être enregistré. Réessayez.");
      }
    } catch (error) {
      console.error('❌ Erreur submitResultat:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const isEmpty = demandes.length === 0 && boxeursValides.length === 0 && combatsATraiter.length === 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backTxt}>Retour</Text>
        </TouchableOpacity>
      </View>

      <View style={s.titleRow}>
        <Text style={s.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={s.loadingTxt}>Chargement...</Text>
        </View>
      ) : isEmpty ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyEmoji}>🔔</Text>
          <Text style={s.emptyTxt}>Aucune notification</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor="#E53935" />
          }
        >
          {combatsATraiter.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>RÉSULTATS À SAISIR ({combatsATraiter.length})</Text>
              {combatsATraiter.map((combat) => (
                <ResultatNotifCard key={combat.id} combat={combat} onPress={() => openResultatForm(combat)} />
              ))}
            </View>
          )}

          {demandes.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>DEMANDES ({demandes.length})</Text>
              {demandes.map((demande) => (
                <DemandeNotifCard
                  key={demande.id}
                  demande={demande}
                  onPress={() => navigation.navigate('DemandesMatch')}
                />
              ))}
            </View>
          )}

          {boxeursValides.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>BOXEURS VALIDÉS ({boxeursValides.length})</Text>
              {boxeursValides.map((boxeur) => (
                <BoxeurValideCard key={boxeur.id} boxeur={boxeur} />
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <ResultatForm
        visible={resultatFormVisible}
        combat={selectedCombat}
        onClose={closeResultatForm}
        onSubmit={handleSubmitResultat}
        loading={submitLoading}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },

  header: { paddingTop: SAFE_AREA_TOP + 8, paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 20, color: '#111', fontWeight: '600' },
  backTxt: { fontSize: 16, color: '#111', fontWeight: '600' },

  titleRow: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#111' },

  scrollContent: { paddingHorizontal: 16 },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9E9E9E',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifIcon: { fontSize: 20 },
  notifTextWrap: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 2 },
  notifStatutTag: { fontSize: 12, fontWeight: '600', color: '#F9A825' },
  notifSubtitle: { fontSize: 13, color: '#888', fontWeight: '500' },
  notifVs: { color: '#bbb', fontWeight: '600' },
  notifChevron: { fontSize: 24, color: '#C7C7CC', fontWeight: '300', marginLeft: 8 },

  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingTxt: { color: '#888', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#999', fontWeight: '600' },
});

// ─── Styles Formulaire Résultat ────────────────────────
const f = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', backgroundColor: '#fff' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  cancelTxt: { fontSize: 15, color: '#999' },
  sendTxt: { fontSize: 15, color: '#E53935', fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingTop: 20, backgroundColor: '#F5F0EB' },
  vsNames: { textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  toggleBtn: { flex: 1, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  toggleBtnWin: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  toggleBtnLose: { backgroundColor: '#C62828', borderColor: '#C62828' },
  toggleBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  toggleTxt: { fontSize: 12, fontWeight: '700', color: '#555', textAlign: 'center' },
  toggleTxtActive: { color: '#fff' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTxtActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  input: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 14, fontSize: 15, color: '#111', marginBottom: 16 },
  textArea: { height: 100, paddingTop: 12, paddingBottom: 12 },
  submitBtn: { height: 54, borderRadius: 14, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});