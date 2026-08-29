import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';

const SECTIONS = [
  {
    heading: '1. Qui sommes-nous',
    body:
      "Hitting est une application mobile destinée aux coachs de boxe pour organiser des combats interclubs (mise en relation de boxeurs, suivi des demandes de combat, gestion d'événements).\n\nResponsable du traitement des données :\nSTREAM & CO (association loi 1901), représentée par Karina BENAMAOUCHE, Présidente\n7 Bâtiment A, 16 B boulevard Aristide Briand, 93100 Montreuil\nContact : hitting.contact@gmail.com",
  },
  {
    heading: '2. Données que nous collectons',
    body:
      "Données de compte (coach) : prénom, nom, adresse email, mot de passe (chiffré), numéro de téléphone, nom du club, numéro d'affiliation FFBoxe, photo de profil (optionnelle).\n\nDonnées relatives aux boxeurs enregistrés : identité (nom, prénom, date de naissance, sexe), poids, catégorie, niveau, palmarès, photo (optionnelle).\n\nDonnées d'utilisation de l'app : demandes de combat envoyées/reçues, événements créés, résultats de combats saisis.\n\nDonnées techniques : identifiant de l'appareil / notifications push (si activées).\n\nNous ne collectons pas plus de données que nécessaire au fonctionnement de l'app, et aucune donnée sur les boxeurs mineurs au-delà de ce qui est strictement nécessaire à l'organisation des combats.",
  },
  {
    heading: '3. Pourquoi nous utilisons ces données',
    body:
      "• Créer et gérer ton compte coach\n• Te permettre d'enregistrer tes boxeurs et de trouver des adversaires compatibles\n• Faciliter l'organisation et le suivi des combats et événements\n• T'envoyer les notifications liées à tes demandes de combat\n• Vérifier ton identité par email (code de vérification à 6 chiffres)",
  },
  {
    heading: '4. Base légale',
    body:
      "Le traitement de tes données repose sur l'exécution du contrat (fourniture du service Hitting, actuellement proposé gratuitement jusqu'à la rentrée 2027) et sur ton consentement (ex. accès à la caméra/photothèque, notifications).",
  },
  {
    heading: '5. Avec qui les données sont-elles partagées',
    body:
      "Tes données sont hébergées et traitées uniquement par les prestataires suivants, pour le fonctionnement technique de l'app :\n\n• Firebase (Google) — authentification, stockage des données, envoi des emails de vérification\n• Airtable — gestion de la base des boxeurs\n\nCette liste sera mise à jour avec le prestataire de paiement retenu lors de la bascule vers l'abonnement payant, prévue à la rentrée 2027.\n\nNous ne vendons ni ne partageons tes données à des fins publicitaires ou avec des tiers non listés ici.",
  },
  {
    heading: '6. Durée de conservation',
    body:
      "Tes données sont conservées tant que ton compte est actif. Tu peux demander la suppression de ton compte et de tes données à tout moment via le bouton \"Supprimer mon compte\" dans Mon Compte, ou en nous écrivant à hitting.contact@gmail.com.",
  },
  {
    heading: '7. Tes droits (RGPD)',
    body:
      "Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de tes données. Pour exercer ces droits, contacte-nous à hitting.contact@gmail.com.\n\nTu peux également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
  },
  {
    heading: '8. Sécurité',
    body:
      "Nous mettons en œuvre des mesures techniques raisonnables (chiffrement des mots de passe, accès restreint aux bases de données) pour protéger tes données contre tout accès non autorisé.",
  },
  {
    heading: '9. Autorisations demandées par l\'app',
    body:
      "Caméra / photothèque : pour ajouter une photo de profil ou une photo de boxeur.\nNotifications : pour t'informer des nouvelles demandes de combat et mises à jour.\n\nCes autorisations sont optionnelles et peuvent être refusées ; certaines fonctionnalités seront alors limitées.",
  },
  {
    heading: '10. Modifications de cette politique',
    body:
      "Cette politique peut être mise à jour. Toute modification substantielle te sera notifiée dans l'app.",
  },
  {
    heading: '11. Contact',
    body: 'Pour toute question relative à cette politique de confidentialité : hitting.contact@gmail.com',
  },
];

export default function PolitiqueConfidentialiteScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confidentialité</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Politique de confidentialité — Hitting</Text>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 28, color: '#1C1C1E', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  mainTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  sectionBody: { fontSize: 14, color: '#3C3C43', lineHeight: 21 },
});