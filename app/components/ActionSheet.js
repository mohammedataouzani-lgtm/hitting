import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ActionSheet({ visible, onClose, onAddBoxeur, onAddEvenement }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />
        <Text style={s.title}>Que voulez-vous ajouter ?</Text>

        <TouchableOpacity style={s.option} activeOpacity={0.7} onPress={onAddBoxeur}>
          <LinearGradient colors={['#3949AB', '#5C6BC0']} style={s.optionIcon}>
            <Text style={s.optionEmoji}>👥</Text>
          </LinearGradient>
          <View style={s.optionTexts}>
            <Text style={s.optionTitle}>Ajouter un boxeur</Text>
            <Text style={s.optionSub}>Enregistrer un nouveau boxeur dans votre club</Text>
          </View>
          <Text style={s.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.option} activeOpacity={0.7} onPress={onAddEvenement}>
          <LinearGradient colors={['#E53935', '#EF5350']} style={s.optionIcon}>
            <Text style={s.optionEmoji}>🥊</Text>
          </LinearGradient>
          <View style={s.optionTexts}>
            <Text style={s.optionTitle}>Ajouter un événement</Text>
            <Text style={s.optionSub}>Créer un gala, sparring ou combat</Text>
          </View>
          <Text style={s.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
          <Text style={s.cancelTxt}>Annuler</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 20, textAlign: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  optionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionEmoji: { fontSize: 22 },
  optionTexts: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 3 },
  optionSub: { fontSize: 12, color: '#999', fontWeight: '400' },
  optionArrow: { fontSize: 22, color: '#CCC', fontWeight: '300' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 14 },
  cancelTxt: { fontSize: 15, color: '#999', fontWeight: '600' },
});