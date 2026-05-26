import React, { useState, useRef } from 'react';
import BottomTabBar, { TAB_BAR_HEIGHT } from './components/BottomTabBar';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ─── Données mock boxeurs ────────────────────────────────────────────────────
const BOXEURS_INIT = [
  {
    id: '1',
    nom: 'Lucas Voisin',
    sexe: 'H',
    categorie: 'Seniors H',
    poids: 'Super-welter',
    kg: '75 kg',
    vic: 19,
    def: 4,
    nuls: 2,
    ko: 19,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '2',
    nom: 'Mounia Chelbi',
    sexe: 'F',
    categorie: 'Seniors F',
    poids: 'Super-welter',
    kg: '75 kg',
    vic: 19,
    def: 4,
    nuls: 2,
    ko: 19,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '3',
    nom: 'Mounia Chelbi',
    sexe: 'F',
    categorie: 'Seniors F',
    poids: 'Super-welter',
    kg: '75 kg',
    vic: 19,
    def: 4,
    nuls: 2,
    ko: 19,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '4',
    nom: 'Lucas Voisin',
    sexe: 'H',
    categorie: 'Seniors H',
    poids: 'Super-welter',
    kg: '75 kg',
    vic: 19,
    def: 4,
    nuls: 2,
    ko: 19,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  },
];

// ─── Constantes formulaire ───────────────────────────────────────────────────
const NIVEAUX = ['Débutant', 'Espoir', 'Elite'];
const SEXES = ['Homme', 'Femme'];
const CATEGORIES_POIDS = [
  'Mini-mouche', 'Mouche', 'Super-mouche', 'Coq', 'Super-coq',
  'Léger', 'Super-léger', 'Welter', 'Super-welter',
  'Moyen', 'Super-moyen', 'Mi-lourd', 'Lourd', 'Super-lourd',
];

// ─── Composant carte boxeur ──────────────────────────────────────────────────
function BoxerCard({ boxer, onEdit, onPress }) {
  const borderColor = boxer.sexe === 'F' ? '#E91E63' : '#2196F3';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(boxer)}
      style={[s.card, { borderLeftColor: borderColor }]}
    >
      <Image source={{ uri: boxer.avatar }} style={s.avatar} />

      <View style={s.cardInfo}>
        <Text style={s.cardName}>{boxer.nom}</Text>
        <Text style={s.cardMeta}>
          {boxer.categorie} · {boxer.poids} · {boxer.kg}
        </Text>

        <View style={s.statsRow}>
          {[
            { label: 'VIC.', value: boxer.vic },
            { label: 'DEF.', value: boxer.def },
            { label: 'NULS', value: boxer.nuls },
            { label: 'K.O', value: boxer.ko },
          ].map(({ label, value }) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statVal}>{value}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[s.editBtn, { backgroundColor: borderColor + '18' }]}
        onPress={(e) => { e.stopPropagation(); onEdit && onEdit(boxer); }}
      >
        <Text style={[s.editIcon, { color: borderColor }]}>✏️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Composant BottomSheet Ajout Boxeur ──────────────────────────────────────
function AddBoxeurSheet({ visible, onClose, onAdd }) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Champs du formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [sexe, setSexe] = useState(null);
  const [niveau, setNiveau] = useState(null);
  const [poids, setPoids] = useState('');
  const [categoriePoids, setCategoriePoids] = useState(null);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const resetForm = () => {
    setNom(''); setPrenom(''); setDateNaissance('');
    setSexe(null); setNiveau(null); setPoids('');
    setCategoriePoids(null); setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const e = {};
    if (!nom.trim()) e.nom = true;
    if (!prenom.trim()) e.prenom = true;
    if (!sexe) e.sexe = true;
    if (!niveau) e.niveau = true;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const newBoxeur = {
      id: Date.now().toString(),
      nom: `${prenom} ${nom}`,
      sexe: sexe === 'Homme' ? 'H' : 'F',
      categorie: sexe === 'Homme' ? 'Seniors H' : 'Seniors F',
      poids: categoriePoids || 'Non défini',
      kg: poids ? `${poids} kg` : '—',
      vic: 0,
      def: 0,
      nuls: 0,
      ko: 0,
      avatar: sexe === 'Femme'
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
        : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    };

    onAdd(newBoxeur);
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Animated.View
          style={[s.backdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={s.handleBar} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>Ajouter un boxeur</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo */}
            <TouchableOpacity style={s.photoBtn} activeOpacity={0.7}>
              <LinearGradient
                colors={['#5C6BC0', '#3949AB']}
                style={s.photoBtnInner}
              >
                <Text style={s.photoIcon}>⬆</Text>
                <Text style={s.photoLabel}>Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Section IDENTITÉ ── */}
            <Text style={s.sectionLabel}>IDENTITÉ</Text>

            {/* Nom / Prénom */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Nom</Text>
                <TextInput
                  style={[s.input, errors.nom && s.inputError]}
                  placeholder="Dupont"
                  placeholderTextColor="#C0C0C0"
                  value={nom}
                  onChangeText={(v) => { setNom(v); setErrors(p => ({ ...p, nom: false })); }}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Prénom</Text>
                <TextInput
                  style={[s.input, errors.prenom && s.inputError]}
                  placeholder="Jean"
                  placeholderTextColor="#C0C0C0"
                  value={prenom}
                  onChangeText={(v) => { setPrenom(v); setErrors(p => ({ ...p, prenom: false })); }}
                />
              </View>
            </View>

            {/* Date de naissance */}
            <Text style={s.fieldLabel}>Date de naissance</Text>
            <View style={s.dateRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="jj/mm/aaaa"
                placeholderTextColor="#C0C0C0"
                value={dateNaissance}
                onChangeText={setDateNaissance}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity style={s.calendarBtn}>
                <Text style={s.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Sexe */}
            <Text style={s.fieldLabel}>Sexe</Text>
            <View style={[s.row, { marginBottom: 20 }]}>
              {SEXES.map((s_) => (
                <TouchableOpacity
                  key={s_}
                  style={[
                    s.toggleBtn,
                    { flex: 1, marginHorizontal: 4 },
                    sexe === s_ && s.toggleBtnActive,
                    errors.sexe && s.toggleBtnError,
                  ]}
                  onPress={() => { setSexe(s_); setErrors(p => ({ ...p, sexe: false })); }}
                >
                  <Text style={[s.toggleTxt, sexe === s_ && s.toggleTxtActive]}>{s_}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Section COMPÉTITION ── */}
            <Text style={s.sectionLabel}>COMPÉTITION</Text>

            {/* Niveau */}
            <Text style={s.fieldLabel}>Niveau</Text>
            <View style={[s.row, { marginBottom: 20 }]}>
              {NIVEAUX.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    s.toggleBtn,
                    { flex: 1, marginHorizontal: 3 },
                    niveau === n && s.toggleBtnActive,
                    errors.niveau && s.toggleBtnError,
                  ]}
                  onPress={() => { setNiveau(n); setErrors(p => ({ ...p, niveau: false })); }}
                >
                  <Text style={[s.toggleTxt, niveau === n && s.toggleTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Poids */}
            <Text style={s.fieldLabel}>Poids (kg)</Text>
            <TextInput
              style={[s.input, { marginBottom: 16 }]}
              placeholder="ex : 75"
              placeholderTextColor="#C0C0C0"
              value={poids}
              onChangeText={setPoids}
              keyboardType="numeric"
            />

            {/* Catégorie de poids */}
            <Text style={s.fieldLabel}>Catégorie de poids</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 28 }}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {CATEGORIES_POIDS.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.chipBtn,
                    categoriePoids === cat && s.chipBtnActive,
                  ]}
                  onPress={() => setCategoriePoids(cat)}
                >
                  <Text style={[s.chipTxt, categoriePoids === cat && s.chipTxtActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Bouton Enregistrer */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              style={s.submitBtn}
            >
              <LinearGradient
                colors={['#EF5350', '#E53935']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.submitGradient}
              >
                <Text style={s.submitTxt}>Enregistrer le boxeur</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Composant BottomSheet Modification Boxeur ───────────────────────────────
function EditBoxeurSheet({ visible, onClose, onSave, boxer }) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Champs du formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [sexe, setSexe] = useState(null);
  const [niveau, setNiveau] = useState(null);
  const [poids, setPoids] = useState('');
  const [categoriePoids, setCategoriePoids] = useState(null);
  const [errors, setErrors] = useState({});

  // Pré-remplir les champs quand un boxeur est sélectionné
  React.useEffect(() => {
    if (visible && boxer) {
      // Séparer le nom complet en prénom et nom
      const parts = boxer.nom.split(' ');
      if (parts.length >= 2) {
        setPrenom(parts[0]);
        setNom(parts.slice(1).join(' '));
      } else {
        setPrenom(boxer.nom);
        setNom('');
      }
      setSexe(boxer.sexe === 'H' ? 'Homme' : 'Femme');
      setCategoriePoids(boxer.poids !== 'Non défini' ? boxer.poids : null);
      setPoids(boxer.kg ? boxer.kg.replace(' kg', '') : '');
      setDateNaissance(boxer.dateNaissance || '');
      setNiveau(boxer.niveau || null);
      setErrors({});
    }
  }, [visible, boxer]);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const validate = () => {
    const e = {};
    if (!nom.trim()) e.nom = true;
    if (!prenom.trim()) e.prenom = true;
    if (!sexe) e.sexe = true;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const updatedBoxeur = {
      ...boxer,
      nom: `${prenom} ${nom}`,
      sexe: sexe === 'Homme' ? 'H' : 'F',
      categorie: sexe === 'Homme' ? 'Seniors H' : 'Seniors F',
      poids: categoriePoids || 'Non défini',
      kg: poids ? `${poids} kg` : '—',
      dateNaissance: dateNaissance,
      niveau: niveau,
    };

    onSave(updatedBoxeur);
    handleClose();
  };

  if (!visible || !boxer) return null;

  // Initiales pour l'avatar
  const initials = (prenom ? prenom[0] : '') + (nom ? nom[0] : '');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Animated.View
          style={[s.backdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={s.handleBar} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>Modifier un boxeur</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar avec initiales */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={s.editAvatarWrap}>
                <LinearGradient
                  colors={['#5C6BC0', '#3949AB']}
                  style={s.editAvatarCircle}
                >
                  <Text style={s.editAvatarInitials}>{initials.toUpperCase()}</Text>
                </LinearGradient>
                <View style={s.editAvatarBadge}>
                  <Text style={{ fontSize: 12, color: '#fff' }}>✏️</Text>
                </View>
              </View>
              <Text style={s.editAvatarLabel}>Changer la photo</Text>
            </View>

            {/* ── Section IDENTITÉ ── */}
            <Text style={s.sectionLabel}>IDENTITE</Text>

            {/* Nom / Prénom */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Nom</Text>
                <TextInput
                  style={[s.input, errors.nom && s.inputError]}
                  placeholder="Dupont"
                  placeholderTextColor="#C0C0C0"
                  value={nom}
                  onChangeText={(v) => { setNom(v); setErrors(p => ({ ...p, nom: false })); }}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Prénom</Text>
                <TextInput
                  style={[s.input, errors.prenom && s.inputError]}
                  placeholder="Jean"
                  placeholderTextColor="#C0C0C0"
                  value={prenom}
                  onChangeText={(v) => { setPrenom(v); setErrors(p => ({ ...p, prenom: false })); }}
                />
              </View>
            </View>

            {/* Date de naissance */}
            <Text style={s.fieldLabel}>Date de naissance</Text>
            <View style={s.dateRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="jj/mm/aaaa"
                placeholderTextColor="#C0C0C0"
                value={dateNaissance}
                onChangeText={setDateNaissance}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity style={s.calendarBtn}>
                <Text style={s.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Sexe */}
            <Text style={s.fieldLabel}>Sexe</Text>
            <View style={[s.row, { marginBottom: 20 }]}>
              {SEXES.map((s_) => (
                <TouchableOpacity
                  key={s_}
                  style={[
                    s.toggleBtn,
                    { flex: 1, marginHorizontal: 4 },
                    sexe === s_ && s.toggleBtnActive,
                    errors.sexe && s.toggleBtnError,
                  ]}
                  onPress={() => { setSexe(s_); setErrors(p => ({ ...p, sexe: false })); }}
                >
                  <Text style={[s.toggleTxt, sexe === s_ && s.toggleTxtActive]}>{s_}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Section DOCUMENT ── */}
            <Text style={s.sectionLabel}>DOCUMENT</Text>

            {/* Photo de la licence */}
            <Text style={s.fieldLabel}>Photo de la licence</Text>
            <TouchableOpacity style={[s.input, { justifyContent: 'center', marginBottom: 20 }]}>
              <Text style={{ color: '#222', fontSize: 15 }}>Importer un fichier</Text>
            </TouchableOpacity>

            {/* ── Section COMPÉTITION ── */}
            <Text style={s.sectionLabel}>COMPETITION</Text>

            {/* Poids */}
            <Text style={s.fieldLabel}>Poids (kg)</Text>
            <TextInput
              style={[s.input, { marginBottom: 16 }]}
              placeholder="ex : 75"
              placeholderTextColor="#C0C0C0"
              value={poids}
              onChangeText={setPoids}
              keyboardType="numeric"
            />

            {/* Catégorie de poids */}
            <Text style={s.fieldLabel}>Catégorie de poids</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {CATEGORIES_POIDS.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.chipBtn,
                    categoriePoids === cat && s.chipBtnActive,
                  ]}
                  onPress={() => setCategoriePoids(cat)}
                >
                  <Text style={[s.chipTxt, categoriePoids === cat && s.chipTxtActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Niveau */}
            <Text style={s.fieldLabel}>Niveau</Text>
            <View style={[s.row, { marginBottom: 28 }]}>
              {NIVEAUX.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    s.toggleBtn,
                    { flex: 1, marginHorizontal: 3 },
                    niveau === n && s.toggleBtnActive,
                  ]}
                  onPress={() => setNiveau(n)}
                >
                  <Text style={[s.toggleTxt, niveau === n && s.toggleTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bouton Enregistrer */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              style={s.submitBtn}
            >
              <LinearGradient
                colors={['#EF5350', '#E53935']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.submitGradient}
              >
                <Text style={s.submitTxt}>Enregistrer les modifications</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function MesBoxeursScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [boxeurs, setBoxeurs] = useState(BOXEURS_INIT);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [boxeurToEdit, setBoxeurToEdit] = useState(null);

  const filteredBoxeurs = boxeurs.filter((b) =>
    b.nom.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddBoxeur = (newBoxeur) => {
    setBoxeurs((prev) => [newBoxeur, ...prev]);
  };

  const handleEditBoxeur = (boxer) => {
    setBoxeurToEdit(boxer);
    setEditSheetVisible(true);
  };

  const handleSaveBoxeur = (updatedBoxeur) => {
    setBoxeurs((prev) =>
      prev.map((b) => (b.id === updatedBoxeur.id ? updatedBoxeur : b))
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HERO HEADER ─────────────────────────────────────────────── */}
      <View style={s.heroWrap}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=400&fit=crop' }}
          style={s.heroImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)']}
          style={s.heroOverlay}
        />
      </View>

      {/* ── CONTENU ─────────────────────────────────────────────────── */}
      <View style={s.body}>
        {/* Barre de recherche + filtre */}
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher un boxeur"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity style={s.searchIconBtn}>
              <Text style={s.searchIconTxt}>🔍</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.filterBtn}>
            <Text style={s.filterIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Liste des boxeurs */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        >
          {filteredBoxeurs.map((boxer) => (
            <BoxerCard
              key={boxer.id}
              boxer={boxer}
              onEdit={handleEditBoxeur}
              onPress={(b) => navigation.navigate('FicheBoxeur', { boxer: b })}
            />
          ))}

          {filteredBoxeurs.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🥊</Text>
              <Text style={s.emptyTxt}>Aucun boxeur trouvé</Text>
            </View>
          )}

          {/* Espace pour le FAB */}
          <View style={{ height: 90 }} />
        </ScrollView>
      </View>

      {/* ── FAB (Floating Action Button) ────────────────────────────── */}
      {/*
      <TouchableOpacity
        style={s.fab}
        activeOpacity={0.8}
        onPress={() => setSheetVisible(true)}
      >
        <LinearGradient
          colors={['#EF5350', '#E53935']}
          style={s.fabGradient}
        >
          <Text style={s.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
      */}

      {/* ── BOTTOM TAB BAR ──────────────────────────────────────────── */}
      <BottomTabBar
        activeTab="boxeurs"
        navigation={navigation}
        onPlusPress={() => setSheetVisible(true)}
      />

      {/* ── BOTTOM SHEET AJOUT ───────────────────────────────────────── */}
      <AddBoxeurSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAdd={handleAddBoxeur}
      />

      {/* ── BOTTOM SHEET MODIFICATION ────────────────────────────────── */}
      <EditBoxeurSheet
        visible={editSheetVisible}
        onClose={() => { setEditSheetVisible(false); setBoxeurToEdit(null); }}
        onSave={handleSaveBoxeur}
        boxer={boxeurToEdit}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const HEADER_HEIGHT = 220;
const SHEET_HEIGHT = height * 0.9;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // HERO
  heroWrap: {
    width: '100%',
    height: HEADER_HEIGHT,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // BODY
  body: {
    flex: 1,
    marginTop: -10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },

  // SEARCH
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    fontWeight: '400',
  },
  searchIconBtn: {
    padding: 4,
  },
  searchIconTxt: {
    fontSize: 16,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  filterIcon: {
    fontSize: 20,
    color: '#555',
  },

  // LISTE
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },

  // CARD
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginBottom: 8,
  },

  // STATS ROW
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111',
    lineHeight: 20,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: '#AAA',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // EDIT
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editIcon: {
    fontSize: 14,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTxt: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 10,
    alignSelf: 'center',
    zIndex: 10,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -1,
  },

  // TAB BAR → géré par le composant BottomTabBar

  // ── BOTTOM SHEET ──────────────────────────────────────────────────

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnTxt: {
    fontSize: 14,
    color: '#555',
    fontWeight: '700',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    letterSpacing: 0.2,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Photo
  photoBtn: {
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#3949AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  photoBtnInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 22,
    color: '#fff',
  },
  photoLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9E9E9E',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 4,
  },

  // Field label
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  // Input
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111',
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#EF5350',
    backgroundColor: '#FFF5F5',
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  calendarBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ECECEC',
  },
  calendarIcon: {
    fontSize: 20,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Toggle buttons (Sexe / Niveau)
  toggleBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#3949AB',
    borderColor: '#3949AB',
  },
  toggleBtnError: {
    borderColor: '#EF5350',
  },
  toggleTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  toggleTxtActive: {
    color: '#fff',
  },

  // Chips catégorie de poids
  chipBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipBtnActive: {
    backgroundColor: '#3949AB',
    borderColor: '#3949AB',
  },
  chipTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  chipTxtActive: {
    color: '#fff',
  },

  // Submit
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Edit Avatar (formulaire modification)
  editAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  editAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editAvatarLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginTop: 4,
  },
});