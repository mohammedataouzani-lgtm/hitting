import React, { useState, useRef } from 'react';
import BottomTabBar, { TAB_BAR_HEIGHT } from './components/BottomTabBar';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Image,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const NIVEAUX = ['Débutant', 'Espoir', 'Elite'];
const SEXES = ['Homme', 'Femme'];

function BoxerCard({ boxer, onEdit, onPress }) {
  const borderColor = boxer.sexe === 'F' ? '#E91E63' : '#2196F3';
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress && onPress(boxer)} style={[s.card, { borderLeftColor: borderColor }]}>
      <Image source={{ uri: boxer.avatar }} style={s.avatar} />
      <View style={s.cardInfo}>
        <Text style={s.cardName}>{boxer.nom}</Text>
        <Text style={s.cardMeta}>{boxer.categorie} · {boxer.poids} · {boxer.kg}</Text>
        <View style={s.statsRow}>
          {[{ label: 'VIC.', value: boxer.vic }, { label: 'DEF.', value: boxer.def }, { label: 'NULS', value: boxer.nuls }, { label: 'K.O', value: boxer.ko }].map(({ label, value }) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statVal}>{value}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity style={[s.editBtn, { backgroundColor: borderColor + '18' }]} onPress={(e) => { e.stopPropagation(); onEdit && onEdit(boxer); }}>
        <Text style={[s.editIcon, { color: borderColor }]}>✏️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function AddBoxeurSheet({ visible, onClose, onAdd }) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [photoLicence, setPhotoLicence] = useState(null);
  const [photoBoxeur, setPhotoBoxeur] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [sexe, setSexe] = useState(null);
  const [niveau, setNiveau] = useState(null);
  const [poids, setPoids] = useState('');
  const [categoriePoids, setCategoriePoids] = useState(null);
  const [numeroLicence, setNumeroLicence] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [victoires, setVictoires] = useState('');
  const [defaites, setDefaites] = useState('');
  const [nuls, setNuls] = useState('');
  const [ko, setKo] = useState('');

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

  const resetForm = () => {
    setNom(''); setPrenom(''); setDateNaissance('');
    setSexe(null); setNiveau(null); setPoids('');
    setCategoriePoids(null); setNumeroLicence(''); setErrors({});
    setPhotoLicence(null); setPhotoBoxeur(null);
    setVictoires(''); setDefaites(''); setNuls(''); setKo('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const validate = () => {
    const e = {};
    if (!nom.trim()) e.nom = true;
    if (!prenom.trim()) e.prenom = true;
    if (!sexe) e.sexe = true;
    if (!niveau) e.niveau = true;
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const db = getFirestore();
      const coachDoc = await getDoc(doc(db, 'coaches', auth.currentUser.uid));
      const coachData = coachDoc.data();
      const clubId = coachData.clubId;
      const clubName = coachData.clubName;
      const coachEmail = coachData.email;

      const response = await fetch(
        "https://europe-west9-hitting-23de9.cloudfunctions.net/addBoxeurEnAttente",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            nom,
            prenom,
            dateNaissance,
            sexe,
            categorie: sexe === 'Homme' ? 'Seniors H' : 'Seniors F',
            categoriePoids: categoriePoids || '',
            poids,
            niveau,
            numeroLicence,
            coachEmail,
            clubName,
            clubId,
            victoires: victoires ? parseInt(victoires) : 0,
            defaites: defaites ? parseInt(defaites) : 0,
            nuls: nuls ? parseInt(nuls) : 0,
            ko: ko ? parseInt(ko) : 0,
            photoLicenceBase64: photoLicence ? photoLicence.base64 : null,
            photoBoxeurBase64: photoBoxeur ? photoBoxeur.base64 : null,
          })
        }
      );

      if (!response.ok) throw new Error("Erreur serveur");

      Alert.alert("✅ Demande envoyée", "Le boxeur a été envoyé en validation. Un administrateur va examiner la demande.");

      onAdd({
        id: Date.now().toString(),
        nom: `${prenom} ${nom}`,
        sexe: sexe === 'Homme' ? 'H' : 'F',
        categorie: sexe === 'Homme' ? 'Seniors H' : 'Seniors F',
        poids: categoriePoids || 'Non défini',
        kg: poids ? `${poids} kg` : '—',
        vic: victoires ? parseInt(victoires) : 0,
        def: defaites ? parseInt(defaites) : 0,
        nuls: nuls ? parseInt(nuls) : 0,
        ko: ko ? parseInt(ko) : 0,
        avatar: photoBoxeur ? photoBoxeur.uri : (sexe === 'Femme'
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
          : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'),
      });

      handleClose();

    } catch (error) {
      console.error("Erreur ajout boxeur:", error);
      Alert.alert("Erreur", "Impossible d'ajouter le boxeur. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handleBar} />

          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>Ajouter un boxeur</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">

            {/* Photo du boxeur */}
            <TouchableOpacity style={s.photoBtn} activeOpacity={0.7} onPress={async () => {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) { Alert.alert('Permission requise', "Autorisez l'accès à vos photos."); return; }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
              });
              if (!result.canceled) setPhotoBoxeur(result.assets[0]);
            }}>
              <LinearGradient colors={['#5C6BC0', '#3949AB']} style={s.photoBtnInner}>
                {photoBoxeur ? (
                  <Image source={{ uri: photoBoxeur.uri }} style={{ width: 72, height: 72, borderRadius: 36 }} />
                ) : (
                  <><Text style={s.photoIcon}>⬆</Text><Text style={s.photoLabel}>Photo</Text></>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* IDENTITÉ */}
            <Text style={s.sectionLabel}>IDENTITÉ</Text>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Nom *</Text>
                <TextInput style={[s.input, errors.nom && s.inputError]} placeholder="Dupont" placeholderTextColor="#C0C0C0" value={nom} onChangeText={(v) => { setNom(v); setErrors(p => ({ ...p, nom: false })); }} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Prénom *</Text>
                <TextInput style={[s.input, errors.prenom && s.inputError]} placeholder="Jean" placeholderTextColor="#C0C0C0" value={prenom} onChangeText={(v) => { setPrenom(v); setErrors(p => ({ ...p, prenom: false })); }} />
              </View>
            </View>

            <Text style={s.fieldLabel}>Date de naissance</Text>
            <View style={s.dateRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="jj/mm/aaaa"
                placeholderTextColor="#C0C0C0"
                value={dateNaissance}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  let formatted = cleaned;
                  if (cleaned.length >= 3 && cleaned.length <= 4) formatted = `${cleaned.slice(0,2)}/${cleaned.slice(2)}`;
                  else if (cleaned.length >= 5) formatted = `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
                  setDateNaissance(formatted);
                }}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity style={s.calendarBtn}><Text style={s.calendarIcon}>📅</Text></TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Sexe *</Text>
            <View style={[s.row, { marginBottom: 20 }]}>
              {SEXES.map((s_) => (
                <TouchableOpacity key={s_} style={[s.toggleBtn, { flex: 1, marginHorizontal: 4 }, sexe === s_ && s.toggleBtnActive, errors.sexe && s.toggleBtnError]} onPress={() => { setSexe(s_); setErrors(p => ({ ...p, sexe: false })); }}>
                  <Text style={[s.toggleTxt, sexe === s_ && s.toggleTxtActive]}>{s_}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Numéro de licence FFBoxe</Text>
            <TextInput style={[s.input, { marginBottom: 16 }]} placeholder="ex : 651289" placeholderTextColor="#C0C0C0" value={numeroLicence} onChangeText={setNumeroLicence} keyboardType="numeric" />

            <Text style={s.fieldLabel}>Photo de la licence</Text>
            <TouchableOpacity
              style={[s.input, { height: 80, justifyContent: 'center', alignItems: 'center' }]}
              onPress={async () => {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) { Alert.alert('Permission requise', "Autorisez l'accès à vos photos."); return; }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true, quality: 0.7, base64: true,
                });
                if (!result.canceled) setPhotoLicence(result.assets[0]);
              }}
            >
              {photoLicence ? (
                <Image source={{ uri: photoLicence.uri }} style={{ width: 60, height: 60, borderRadius: 8 }} />
              ) : (
                <Text style={{ color: '#C0C0C0', fontSize: 15 }}>📷 Importer la photo de licence</Text>
              )}
            </TouchableOpacity>

            {/* COMPÉTITION */}
            <Text style={s.sectionLabel}>COMPÉTITION</Text>

            <Text style={s.fieldLabel}>Niveau *</Text>
            <View style={[s.row, { marginBottom: 20 }]}>
              {NIVEAUX.map((n) => (
                <TouchableOpacity key={n} style={[s.toggleBtn, { flex: 1, marginHorizontal: 3 }, niveau === n && s.toggleBtnActive, errors.niveau && s.toggleBtnError]} onPress={() => { setNiveau(n); setErrors(p => ({ ...p, niveau: false })); }}>
                  <Text style={[s.toggleTxt, niveau === n && s.toggleTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Poids (kg)</Text>
            <TextInput style={[s.input, { marginBottom: 16 }]} placeholder="ex : 75" placeholderTextColor="#C0C0C0" value={poids} onChangeText={setPoids} keyboardType="numeric" />

            {/* PALMARÈS */}
            <Text style={s.sectionLabel}>PALMARÈS</Text>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Victoires</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor="#C0C0C0" value={victoires} onChangeText={setVictoires} keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Défaites</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor="#C0C0C0" value={defaites} onChangeText={setDefaites} keyboardType="numeric" />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Nuls</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor="#C0C0C0" value={nuls} onChangeText={setNuls} keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>K.O</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor="#C0C0C0" value={ko} onChangeText={setKo} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85} style={s.submitBtn} disabled={loading}>
              <LinearGradient colors={['#EF5350', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Enregistrer le boxeur</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MesBoxeursScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [boxeurs, setBoxeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [boxeurToEdit, setBoxeurToEdit] = useState(null);

  React.useEffect(() => {
    fetchBoxeurs();
  }, []);

  const fetchBoxeurs = async () => {
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/getBoxeurs',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();
      console.log('📦 Boxeurs:', JSON.stringify(data));

      if (data.success) {
        const mapped = data.boxeurs.map(b => ({
          id: b.id,
          nom: `${b.prenom} ${b.nom}`,
          sexe: b.sexe === 'Femme' ? 'F' : 'H',
          categorie: b.categorie || '',
          poids: b.categoriePoids || '',
          kg: b.poids ? `${b.poids} kg` : '—',
          vic: b.vic || 0,
          def: b.def || 0,
          nuls: b.nuls || 0,
          ko: b.ko || 0,
          avatar: b.photo || (b.sexe === 'Femme'
            ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
            : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'),
        }));
        setBoxeurs(mapped);
      }
    } catch (error) {
      console.error('❌ Erreur fetchBoxeurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBoxeurs = boxeurs.filter((b) => b.nom.toLowerCase().includes(search.toLowerCase()));
  const handleAddBoxeur = (newBoxeur) => {
    setBoxeurs((prev) => [newBoxeur, ...prev]);
  };
  const handleEditBoxeur = (boxer) => { setBoxeurToEdit(boxer); setEditSheetVisible(true); };
  const handleSaveBoxeur = (updatedBoxeur) => { setBoxeurs((prev) => prev.map((b) => (b.id === updatedBoxeur.id ? updatedBoxeur : b))); };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }


  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={s.heroWrap}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=400&fit=crop' }} style={s.heroImage} />
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)']} style={s.heroOverlay} />
      </View>
      <View style={s.body}>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <TextInput style={s.searchInput} placeholder="Rechercher un boxeur" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
            <TouchableOpacity style={s.searchIconBtn}><Text style={s.searchIconTxt}>🔍</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={s.filterBtn}><Text style={s.filterIcon}>☰</Text></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {filteredBoxeurs.map((boxer) => (
            <BoxerCard key={boxer.id} boxer={boxer} onEdit={handleEditBoxeur} onPress={(b) => navigation.navigate('FicheBoxeur', { boxer: b })} />
          ))}
          {filteredBoxeurs.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🥊</Text>
              <Text style={s.emptyTxt}>Aucun boxeur trouvé</Text>
            </View>
          )}
          <View style={{ height: 90 }} />
        </ScrollView>
      </View>
      <BottomTabBar activeTab="boxeurs" navigation={navigation} onPlusPress={() => setSheetVisible(true)} />
      <AddBoxeurSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onAdd={handleAddBoxeur} />
    </View>
  );
}

const HEADER_HEIGHT = 220;
const SHEET_HEIGHT = height * 0.9;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heroWrap: { width: '100%', height: HEADER_HEIGHT },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  body: { flex: 1, marginTop: -10, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10, gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#ECECEC' },
  searchInput: { flex: 1, fontSize: 15, color: '#222', fontWeight: '400' },
  searchIconBtn: { padding: 4 },
  searchIconTxt: { fontSize: 16 },
  filterBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  filterIcon: { fontSize: 20, color: '#555' },
  listContent: { paddingHorizontal: 18, paddingTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 0.5, borderColor: '#F0F0F0' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#888', fontWeight: '500', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 17, fontWeight: '900', color: '#111', lineHeight: 20 },
  statLbl: { fontSize: 9, fontWeight: '600', color: '#AAA', letterSpacing: 0.5, marginTop: 1 },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  editIcon: { fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#999', fontWeight: '600' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  closeBtnTxt: { fontSize: 14, color: '#555', fontWeight: '700' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111', letterSpacing: 0.2 },
  sheetBody: { paddingHorizontal: 20, paddingTop: 20 },
  photoBtn: { alignSelf: 'center', marginBottom: 24, shadowColor: '#3949AB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  photoBtnInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  photoIcon: { fontSize: 22, color: '#fff' },
  photoLabel: { fontSize: 11, color: '#fff', fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1.2, marginBottom: 12, marginTop: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#ECECEC', backgroundColor: '#FAFAFA', paddingHorizontal: 14, fontSize: 15, color: '#111', marginBottom: 16 },
  inputError: { borderColor: '#EF5350', backgroundColor: '#FFF5F5' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  calendarBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ECECEC' },
  calendarIcon: { fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  toggleBtn: { height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#ECECEC', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  toggleBtnActive: { backgroundColor: '#3949AB', borderColor: '#3949AB' },
  toggleBtnError: { borderColor: '#EF5350' },
  toggleTxt: { fontSize: 14, fontWeight: '600', color: '#555' },
  toggleTxtActive: { color: '#fff' },
  chipBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#ECECEC', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  chipBtnActive: { backgroundColor: '#3949AB', borderColor: '#3949AB' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTxtActive: { color: '#fff' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  submitGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});