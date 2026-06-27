import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';

const PLANS = [
  {
    id: 'mensuel',
    label: 'Mensuel',
    badge: 'Populaire',
    price: '12,50€',
    priceLabel: 'Payer 12,50€',
    description: 'Accès complet, sans engagement.',
    color: {
      background: '#F2D5D5',
      title: '#8B1A1A',
      description: '#8B1A1A',
      button: '#8B1A1A',
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

export default function OffresScreen({ navigation }) {
  const handlePayment = (plan) => {
    Alert.alert(
      'Abonnement',
      `Vous allez souscrire à l'offre ${plan.label} à ${plan.price}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => navigation.navigate('Dashboard') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nos formules</Text>

        {/* Cards */}
        {PLANS.map((plan) => (
          <View
            key={plan.id}
            style={[styles.card, { backgroundColor: plan.color.background }]}
          >
            {/* Label + Badge */}
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

            {/* Price */}
            <Text style={[styles.price, { color: plan.color.title }]}>
              {plan.price}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: plan.color.description }]}>
              {plan.description}
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: plan.color.button }]}
              onPress={() => handlePayment(plan)}
              activeOpacity={0.85}
            >
              <Text style={[styles.buttonText, { color: plan.color.buttonText }]}>
                {plan.priceLabel}
              </Text>
            </TouchableOpacity>

            {/* Features */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EDE9E3',
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 8,
    width: 36,
  },
  backArrow: {
    fontSize: 24,
    color: '#1a1a1a',
    fontWeight: '400',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 4,
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