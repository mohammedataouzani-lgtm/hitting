import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getCoachProfile } from '../firebase';
import BottomTabBar from './components/BottomTabBar';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function ProfilScreen({ navigation }) {
  const [avatar, setAvatar] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const { logout, user, loadingAuth } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: () => logout()
        }
      ]
    );
  };

  const handleNavigateToOffres = () => {
    navigation.navigate('Offres');
  };

  const handleChangePhoto = () => {
    Alert.alert(
      "Modifier la photo de profil",
      "Sélectionnez une option :",
      [
        { text: "Prendre une photo 📷", onPress: handleTakePhoto },
        { text: "Choisir depuis la bibliothèque 🖼️", onPress: handlePickImage },
        { text: "Utiliser un modèle prédéfini ✨", onPress: handleShowPresets },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission requise", "Vous devez autoriser l'accès à vos photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) setAvatar(result.assets[0].uri);
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue lors de la sélection de l'image.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission requise", "Vous devez autoriser l'accès à l'appareil photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) setAvatar(result.assets[0].uri);
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue lors de l'accès à l'appareil photo.");
    }
  };

  const handleShowPresets = () => {
    Alert.alert(
      "Modèles de profil",
      "Sélectionnez un modèle :",
      [
        {
          text: "Profil Sportive 👩",
          onPress: () => setAvatar('https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=150&h=150&fit=crop&crop=face')
        },
        {
          text: "Profil Sportif 👨",
          onPress: () => setAvatar('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face')
        },
        {
          text: "Profil Classique ✨",
          onPress: () => setAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face')
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  React.useEffect(() => {
    if (!user) {
      console.log('❌ Pas de user dans useEffect');
      return;
    }
    console.log('✅ User trouvé:', user.uid, user.email);

    const fetchProfile = async () => {
      try {
        console.log('🔄 Appel getCoachProfile...');
        const data = await getCoachProfile();
        console.log('📦 Réponse complète:', JSON.stringify(data));
        if (data.success) {
          setProfile(data.profile);
        } else {
          console.log('❌ Erreur data:', data.error);
        }
      } catch (error) {
        console.error('❌ Erreur fetchProfile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loadingAuth) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Compte</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangePhoto}
              style={styles.avatarEditBadge}
            >
              <Text style={styles.avatarEditIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coachName}>
            {profile ? `${profile.prenom} ${profile.nom}` : 'Chargement...'}
          </Text>
          <Text style={styles.clubName}>
            {profile?.nomClub || ''}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{profile?.telephone || '—'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fonction</Text>
            <Text style={styles.infoValue}>Entraîneur Principal</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MON CLUB</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nom du Club</Text>
            <Text style={styles.infoValue}>{profile?.nomClub || '—'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Adresse de la salle</Text>
            <Text style={styles.infoValue}>{profile?.adresse || '—'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Affiliation</Text>
            <Text style={styles.infoValue}>{profile?.affiliation || '—'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABONNEMENT & SÉCURITÉ</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNavigateToOffres}
            style={[styles.infoItem, styles.clickableItem]}
          >
            <View>
              <Text style={styles.infoLabel}>Mon Offre</Text>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeTxt}>COMPTE PREMIUM 👑</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.infoItem, styles.clickableItem]}
          >
            <Text style={styles.infoLabel}>Changer de mot de passe</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnTxt}>Se déconnecter</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomTabBar activeTab="profil" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 100 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  avatarContainer: { position: 'relative', width: 90, height: 90, marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarEditIcon: { fontSize: 12, color: '#FFFFFF' },
  coachName: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
  clubName: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 12 },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F7',
  },
  clickableItem: { borderBottomWidth: 0.5 },
  infoLabel: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  infoValue: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  chevron: { fontSize: 18, color: '#C7C7CC', fontWeight: '600' },
  premiumBadge: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD54F',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  premiumBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#FF8F00' },
  logoutBtn: {
    backgroundColor: '#FF3B30',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutBtnTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});