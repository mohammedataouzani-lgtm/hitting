import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function CguAcceptancePopup({ visible, onAccept, onRefuse, navigation }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Avant de continuer</Text>
          <Text style={styles.body}>
            Pour créer un compte Hitting, tu dois accepter nos{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('CGU')}>
              Conditions générales d'utilisation
            </Text>{' '}
            et notre{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('PolitiqueConfidentialite')}>
              Politique de confidentialité
            </Text>.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.refuseBtn} onPress={onRefuse} activeOpacity={0.8}>
              <Text style={styles.refuseBtnText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
              <Text style={styles.acceptBtnText}>J'accepte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, color: '#333', lineHeight: 21, marginBottom: 22, textAlign: 'center' },
  link: { color: '#d32f2f', fontWeight: '700', textDecorationLine: 'underline' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  refuseBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  refuseBtnText: { color: '#666', fontSize: 15, fontWeight: '700' },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#d32f2f',
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});