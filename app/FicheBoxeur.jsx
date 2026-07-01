import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  StatusBar, Dimensions, Modal, Animated, Platform, Pressable,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.85;

// ─────────────────────────────────────────────
// EDIT SHEET
// ─────────────────────────────────────────────
function EditBoxeurSheet({ visible, onClose, boxer, onSave }) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [photoBoxeur, setPhotoBoxeur] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [victoires, setVictoires] = useState('');
  const [defaites, setDefaites] = useState('');
  const [nuls, setNuls] = useState('');
  const [ko, setKo] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (boxer && visible) {
      const parts = boxer.nom.split(' ');
      setPrenom(parts[0] || '');
      setNom(parts.slice(1).join(' ') || '');
      setVictoires(String(boxer.vic ?? ''));
      setDefaites(String(boxer.def ?? ''));
      setNuls(String(boxer.nuls ?? ''));
      setKo(String(boxer.ko ?? ''));
      setPhotoBoxeur(null);
      setErrors({});
    }
  }, [boxer, visible]);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => { setErrors({}); onClose(); };

  const validate = () => {
    const e = {};
    if (!nom.trim()) e.nom = true;
    if (!prenom.trim()) e.prenom = true;
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('https://europe-west9-hitting-23de9.cloudfunctions.net/updateBoxeur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          boxeurId: boxer.id, nom, prenom,
          victoires: victoires ? parseInt(victoires) : 0,
          defaites: defaites ? parseInt(defaites) : 0,
          nuls: nuls ? parseInt(nuls) : 0,
          ko: ko ? parseInt(ko) : 0,
          photoBoxeurBase64: photoBoxeur ? photoBoxeur.base64 : null,
        }),
      });
      if (!response.ok) throw new Error('Erreur serveur');
      onSave({
        ...boxer,
        nom: `${prenom} ${nom}`,
        vic: victoires ? parseInt(victoires) : boxer.vic,
        def: defaites ? parseInt(defaites) : boxer.def,
        nuls: nuls ? parseInt(nuls) : boxer.nuls,
        ko: ko ? parseInt(ko) : boxer.ko,
        avatar: photoBoxeur ? photoBoxeur.uri : boxer.avatar,
      });
      Alert.alert('✅ Modifié', 'Les informations du boxeur ont été mises à jour.');
      handleClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le boxeur. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[es.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[es.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={es.handleBar} />
          <View style={es.sheetHeader}>
            <TouchableOpacity onPress={handleClose} style={es.closeBtn}>
              <Text style={es.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={es.sheetTitle}>Modifier le boxeur</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={es.sheetBody} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={es.photoBtn} activeOpacity={0.7} onPress={async () => {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) { Alert.alert('Permission requise', "Autorisez l'accès à vos photos."); return; }
              const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
              if (!result.canceled) setPhotoBoxeur(result.assets[0]);
            }}>
              <LinearGradient colors={['#5C6BC0', '#3949AB']} style={es.photoBtnInner}>
                {photoBoxeur ? (
                  <Image source={{ uri: photoBoxeur.uri }} style={{ width: 72, height: 72, borderRadius: 36 }} />
                ) : boxer?.avatar ? (
                  <Image source={{ uri: boxer.avatar }} style={{ width: 72, height: 72, borderRadius: 36 }} />
                ) : (
                  <><Text style={es.photoIcon}>⬆</Text><Text style={es.photoLabel}>Photo</Text></>
                )}
              </LinearGradient>
              <Text style={es.photoHint}>Appuyer pour changer la photo</Text>
            </TouchableOpacity>

            <Text style={es.sectionLabel}>IDENTITÉ</Text>
            <View style={es.row}>
              <View style={{ flex: 1 }}>
                <Text style={es.fieldLabel}>Nom *</Text>
                <TextInput style={[es.input, errors.nom && es.inputError]} placeholder="Dupont" placeholderTextColor="#C0C0C0" value={nom} onChangeText={(v) => { setNom(v); setErrors(p => ({ ...p, nom: false })); }} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={es.fieldLabel}>Prénom *</Text>
                <TextInput style={[es.input, errors.prenom && es.inputError]} placeholder="Jean" placeholderTextColor="#C0C0C0" value={prenom} onChangeText={(v) => { setPrenom(v); setErrors(p => ({ ...p, prenom: false })); }} />
              </View>
            </View>

            <Text style={es.sectionLabel}>PALMARÈS</Text>
            <View style={es.row}>
              <View style={{ flex: 1 }}>
                <Text style={es.fieldLabel}>Victoires</Text>
                <TextInput style={es.input} placeholder="0" placeholderTextColor="#C0C0C0" value={victoires} onChangeText={setVictoires} keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={es.fieldLabel}>Défaites</Text>
                <TextInput style={es.input} placeholder="0" placeholderTextColor="#C0C0C0" value={defaites} onChangeText={setDefaites} keyboardType="numeric" />
              </View>
            </View>
            <View style={es.row}>
              <View style={{ flex: 1 }}>
                <Text style={es.fieldLabel}>Nuls</Text>
                <TextInput style={es.input} placeholder="0" placeholderTextColor="#C0C0C0" value={nuls} onChangeText={setNuls} keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={es.fieldLabel}>K.O</Text>
                <TextInput style={es.input} placeholder="0" placeholderTextColor="#C0C0C0" value={ko} onChangeText={setKo} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85} style={es.submitBtn} disabled={loading}>
              <LinearGradient colors={['#EF5350', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={es.submitGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={es.submitTxt}>Enregistrer les modifications</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// FICHE BOXEUR
// ─────────────────────────────────────────────
export default function FicheBoxeurScreen({ navigation, route }) {
  const [boxer, setBoxer] = useState(route.params.boxer);
  const [editVisible, setEditVisible] = useState(false);

  const isFemme = boxer.sexe === 'F';
  const accentColor = isFemme ? '#E91E63' : '#2196F3';
  const totalCombats = (boxer.vic || 0) + (boxer.def || 0) + (boxer.nuls || 0);
  const winRate = totalCombats > 0 ? Math.round(((boxer.vic || 0) / totalCombats) * 100) : 0;

const stats = [
  { label: 'Victoires', value: boxer.vic ?? 0, color: '#43A047' },
  { label: 'Défaites', value: boxer.def ?? 0, color: '#EF5350' },
  { label: 'Nuls', value: boxer.nuls ?? 0, color: '#FF9800' },
  { label: 'K.O', value: boxer.ko ?? 0, color: '#42A5F5' },
];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HERO */}
        <View style={s.hero}>
          <Image source={{ uri: boxer.avatar }} style={s.heroBg} blurRadius={8} />
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditVisible(true)}>
            <Text style={s.editIcon}>✏️</Text>
          </TouchableOpacity>
          <View style={s.heroContent}>
            <View style={[s.avatarWrapper, { borderColor: accentColor }]}>
              <Image source={{ uri: boxer.avatar }} style={s.avatar} />
            </View>
            <Text style={s.name}>{boxer.nom}</Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: accentColor }]}>
                <Text style={s.badgeTxt}>{boxer.sexe === 'F' ? 'Femme' : 'Homme'}</Text>
              </View>
              {boxer.categorie ? (
                <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={s.badgeTxt}>{boxer.categorie}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* INFOS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>INFORMATIONS</Text>
          <View style={s.infoGrid}>
            <InfoRow icon="⚖️" label="Catégorie de poids" value={boxer.poids || '—'} />
            <InfoRow icon="🏋️" label="Poids" value={boxer.kg || '—'} />
            <InfoRow icon="🥊" label="Total combats" value={String(totalCombats)} />
            <InfoRow icon="📊" label="Taux de victoire" value={`${winRate} %`} />
          </View>
        </View>

        {/* PALMARÈS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PALMARÈS</Text>
          <View style={s.statsGrid}>
            {stats.map(({ label, value, color }) => (
              <View key={label} style={s.statCard}>
                <Text style={[s.statValue, { color }]}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
                <View style={[s.statBar, { backgroundColor: color + '22' }]}>
                  <View style={[s.statBarFill, {
                    backgroundColor: color,
                    width: totalCombats > 0 ? `${Math.round((value / totalCombats) * 100)}%` : '0%',
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* BOUTON TROUVER UN ADVERSAIRE */}
        <TouchableOpacity
          style={s.adversaireBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AdversairesPotentiels', { boxer })}
        >
          <LinearGradient colors={['#EF5350', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.adversaireBtnGradient}>
            <Text style={s.adversaireBtnTxt}>🥊  Trouver un adversaire</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      <EditBoxeurSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        boxer={boxer}
        onSave={(updated) => setBoxer(updated)}
      />
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={s.infoTexts}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  hero: { height: 300, position: 'relative', justifyContent: 'flex-end' },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  backBtn: { position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#fff', fontWeight: '700' },
  editBtn: { position: 'absolute', top: 56, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  editIcon: { fontSize: 18 },
  heroContent: { alignItems: 'center', paddingBottom: 28 },
  avatarWrapper: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, marginBottom: 12, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  name: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 10, letterSpacing: 0.3 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1.2, marginBottom: 16 },
  infoGrid: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#999', fontWeight: '500' },
  infoValue: { fontSize: 15, color: '#111', fontWeight: '700', marginTop: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: (width - 32 - 40 - 12) / 2, backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F0F0F0' },
  statValue: { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 2, marginBottom: 8 },
  statBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },

  // Bouton adversaire
  adversaireBtn: { marginHorizontal: 16, marginTop: 24, borderRadius: 14, overflow: 'hidden', shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  adversaireBtnGradient: { height: 56, alignItems: 'center', justifyContent: 'center' },
  adversaireBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});

const es = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  closeBtnTxt: { fontSize: 14, color: '#555', fontWeight: '700' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111', letterSpacing: 0.2 },
  sheetBody: { paddingHorizontal: 20, paddingTop: 20 },
  photoBtn: { alignSelf: 'center', marginBottom: 8, alignItems: 'center' },
  photoBtnInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  photoIcon: { fontSize: 22, color: '#fff' },
  photoLabel: { fontSize: 11, color: '#fff', fontWeight: '700', marginTop: 2 },
  photoHint: { fontSize: 12, color: '#999', marginTop: 6, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1.2, marginBottom: 12, marginTop: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#ECECEC', backgroundColor: '#FAFAFA', paddingHorizontal: 14, fontSize: 15, color: '#111', marginBottom: 16 },
  inputError: { borderColor: '#EF5350', backgroundColor: '#FFF5F5' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  submitGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});
