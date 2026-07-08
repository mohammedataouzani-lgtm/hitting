import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const SAFE_AREA_TOP = Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16;

const SLIDES = [
  {
    id: '1',
    emoji: '🥊',
    title: 'Gérez votre effectif',
    description: "Ajoutez vos boxeurs, suivez leur palmarès et leurs licences en un seul endroit.",
    colors: ['#2B5BB8', '#5AA3E8'],
  },
  {
    id: '2',
    emoji: '🤝',
    title: 'Trouvez des adversaires',
    description: "Recherchez des boxeurs compatibles et envoyez vos demandes de combat en quelques clics.",
    colors: ['#3949AB', '#5C6BC0'],
  },
  {
    id: '3',
    emoji: '📅',
    title: 'Suivez vos événements',
    description: "Galas, sparrings et calendrier : ne manquez plus jamais une échéance.",
    colors: ['#E53935', '#EF5350'],
  },
];

export default function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('❌ Erreur sauvegarde onboarding:', error);
    }
    navigation.replace('Login');
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const handleScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  const isLastSlide = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <TouchableOpacity style={styles.skipBtn} activeOpacity={0.7} onPress={finishOnboarding}>
        <Text style={styles.skipTxt}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <LinearGradient colors={item.colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.slide}>
            <View style={styles.emojiCircle}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </LinearGradient>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} activeOpacity={0.85} onPress={handleNext}>
          <Text style={styles.nextBtnTxt}>{isLastSlide ? 'Commencer' : 'Suivant'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  skipBtn: {
    position: 'absolute',
    top: SAFE_AREA_TOP,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  skipTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emojiCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 22 },
  nextBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnTxt: { fontSize: 16, fontWeight: '800', color: '#111' },
});