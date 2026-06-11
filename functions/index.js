const util = require('util');
global.util = util;

const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const axios = require("axios");
const Airtable = require("airtable");

admin.initializeApp();

setGlobalOptions({ region: "europe-west9" });

// ===== CLOUD FUNCTION v2: getClubs =====
exports.getClubs = onRequest({
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    const response = await axios.get(`https://api.airtable.com/v0/${baseId}/Club`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const records = response.data.records || [];
    const clubs = records.map(record => {
      const f = record.fields || {};
      let regionRaw = f['Région'] || '';
      let regionClean = Array.isArray(regionRaw) ? (regionRaw[0] || '') : regionRaw;
      return { id: record.id, name: f['Nom du club'] ? String(f['Nom du club']) : 'Sans nom', ville: f['Ville'] ? String(f['Ville']) : '', codePostal: f['Code postal'] ? String(f['Code postal']) : '', region: String(regionClean) };
    });
    console.log(`✅ ${clubs.length} clubs prêts.`);
    return res.status(200).json({ clubs });
  } catch (error) {
    console.error('❌ Erreur getClubs :', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: "Erreur lors de la récupération des clubs" });
  }
});

// ===== CLOUD FUNCTION v2: syncCoachToAirtableV2 =====
exports.syncCoachToAirtableV2 = onDocumentCreated({
  document: 'coaches/{coachId}',
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (event) => {
  try {
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    const coachData = event.data.data();
    const coachId = event.params.coachId;
    const clubArray = coachData.clubId ? [String(coachData.clubId)] : [];
    const finalFirstName = coachData.prenom || coachData.firstName || '';
    const finalLastName = coachData.nom || coachData.lastName || '';
    const finalTelephone = coachData.telephone || coachData.phone || '';
    const finalLicence = coachData.numeroLicence || '';
    const response = await axios.post(`https://api.airtable.com/v0/${baseId}/Coach`, { fields: { 'Email': coachData.email || '', 'Nom': finalLastName, 'Prénom': finalFirstName, 'Téléphone': String(finalTelephone), 'Numéro d\'affiliation': String(finalLicence), 'Club': clubArray, 'Firebase UID': coachId } }, { headers: { Authorization: `Bearer ${apiKey}` } });
    await admin.firestore().doc(`coaches/${coachId}`).update({ airtableRecordId: response.data.id });
  } catch (error) {
    console.error('❌ Error syncing to Airtable:', error.response ? error.response.data : error.message);
  }
});

// ===== CLOUD FUNCTION v2: addBoxeurEnAttente =====
exports.addBoxeurEnAttente = onRequest({
  region: "europe-west9",
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.set("Access-Control-Allow-Methods", "POST"); res.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); return res.status(204).send(""); }
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé" });
  try {
    const decodedToken = await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);
    const firebaseUID = decodedToken.uid;
    const { nom, prenom, dateNaissance, sexe, categoriePoids, poids, niveau, numeroLicence, clubId, photoLicenceBase64, photoBoxeurBase64, victoires, defaites, nuls, ko } = req.body;
    const coachDoc = await admin.firestore().doc(`coaches/${firebaseUID}`).get();
    const airtableCoachId = coachDoc.exists ? coachDoc.data()?.airtableRecordId : null;
    let photoUrl = null;
    if (photoLicenceBase64) { try { const bucket = admin.storage().bucket(); const fileName = `licences/${firebaseUID}_${Date.now()}.jpg`; const file = bucket.file(fileName); await file.save(Buffer.from(photoLicenceBase64, 'base64'), { metadata: { contentType: 'image/jpeg' } }); await file.makePublic(); photoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`; } catch (photoError) { console.error('❌ Erreur upload photo:', photoError.message); } }
    let photoBoxeurUrl = null;
    if (photoBoxeurBase64) { try { const bucket = admin.storage().bucket(); const fileName = `boxeurs/${firebaseUID}_${Date.now()}.jpg`; const file = bucket.file(fileName); await file.save(Buffer.from(photoBoxeurBase64, 'base64'), { metadata: { contentType: 'image/jpeg' } }); await file.makePublic(); photoBoxeurUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`; } catch (photoError) { console.error('❌ Erreur upload photo du boxeur:', photoError.message); } }
    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY }).base(process.env.AIRTABLE_BASE_ID_SECURE);
    const record = await base("Boxeurs en attente").create({ "Nom": nom || "", "Prénom": prenom || "", "Date de naissance": dateNaissance ? (() => { const parts = dateNaissance.split('/'); if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`; return dateNaissance; })() : "", "Sexe": sexe || "", "Catégorie de poids": categoriePoids || "", "Poids": poids ? parseFloat(poids) : null, "Niveau": niveau || "", "Numéro de licence": numeroLicence ? parseInt(numeroLicence) : null, "Liaison vers Club": clubId ? [clubId] : [], "Liaison vers Coach": airtableCoachId ? [airtableCoachId] : [], "Photo de la licence": photoUrl ? [{ url: photoUrl }] : [], "Photo du boxeur": photoBoxeurUrl ? [{ url: photoBoxeurUrl }] : [], "Victoires": victoires || 0, "Défaites": defaites || 0, "Nuls": nuls || 0, "K.O": ko || 0 });
    return res.status(200).json({ success: true, id: record.id });
  } catch (error) {
    console.error("Erreur addBoxeurEnAttente:", error.response ? error.response.data : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: getCoachProfile =====
exports.getCoachProfile = onRequest({
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Token manquant' });
    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const coachDoc = await admin.firestore().doc(`coaches/${uid}`).get();
    if (!coachDoc.exists) return res.status(404).json({ success: false, error: 'Coach non trouvé dans Firestore' });
    const airtableRecordId = coachDoc.data().airtableRecordId;
    if (!airtableRecordId) return res.status(404).json({ success: false, error: 'airtableRecordId manquant' });
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    const response = await axios.get(`https://api.airtable.com/v0/${baseId}/Coach/${airtableRecordId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const f = response.data.fields || {};
    const profile = { nom: f['Nom'] || '', prenom: f['Prénom'] || '', telephone: f['Téléphone'] || '', nomClub: f['Nom du club (from Club 2)'] ? f['Nom du club (from Club 2)'][0] : '', adresse: f['Adresse (from Club 2)'] ? f['Adresse (from Club 2)'][0] : '', affiliation: f['Numéro d\'affiliation'] || '' };
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('❌ Erreur getCoachProfile:', error.response ? error.response.data : error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CLOUD FUNCTION v2: deleteCoachAccount =====
exports.deleteCoachAccount = onRequest({
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Token manquant' });
    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const coachDoc = await admin.firestore().doc(`coaches/${uid}`).get();
    if (!coachDoc.exists) return res.status(404).json({ success: false, error: 'Coach introuvable' });
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    const airtableCoachId = coachDoc.data().airtableRecordId;
    if (airtableCoachId) {
      try {
        const boxeursResponse = await axios.get(`https://api.airtable.com/v0/${baseId}/Boxeurs%20en%20attente`, { headers: { Authorization: `Bearer ${apiKey}` }, params: { filterByFormula: `FIND("${airtableCoachId}", ARRAYJOIN({Liaison vers Coach}))` } });
        const boxeurs = boxeursResponse.data.records || [];
        for (const boxeur of boxeurs) { await axios.delete(`https://api.airtable.com/v0/${baseId}/Boxeurs%20en%20attente/${boxeur.id}`, { headers: { Authorization: `Bearer ${apiKey}` } }); }
        await axios.delete(`https://api.airtable.com/v0/${baseId}/Coach/${airtableCoachId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      } catch (airtableError) { console.error('❌ Erreur suppression Airtable:', airtableError.message); }
    }
    await admin.firestore().doc(`coaches/${uid}`).delete();
    await admin.auth().deleteUser(uid);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Erreur deleteCoachAccount:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CLOUD FUNCTION v2: getBoxeurs =====
exports.getBoxeurs = onRequest({
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Token manquant' });
    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const coachDoc = await admin.firestore().doc(`coaches/${uid}`).get();
    if (!coachDoc.exists) return res.status(404).json({ success: false, error: 'Coach introuvable' });
    const coachEmail = coachDoc.data().email;
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    await axios.get(`https://api.airtable.com/v0/${baseId}/Boxeurs`, { headers: { Authorization: `Bearer ${apiKey}` }, params: { maxRecords: 3 } });
    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY }).base(process.env.AIRTABLE_BASE_ID_SECURE);
    const records = await base('Boxeurs').select({ filterByFormula: `FIND("${coachEmail}", ARRAYJOIN({Coach}))` }).all();
    const boxeurs = records.map(record => {
      const f = record.fields || {};
      console.log('📋 Fields bruts:', JSON.stringify(f));
      return { id: record.id, nom: f['Nom du boxeur'] || '', prenom: f['Prénom'] || '', sexe: f['Sexe'] || '', poids: f['Poids'] || 0, categoriePoids: f['Catégorie de poids'] || '', categorie: f['Catégorie'] || '', dateNaissance: f['Date de naissance'] || '', vic: f['Victoires '] || 0, def: f['Défaites '] || 0, nuls: f['Nuls '] || 0, ko: f['KO '] || 0, photo: f['Photo du boxeur'] ? f['Photo du boxeur'][0]?.url : null };
    });
    return res.status(200).json({ success: true, boxeurs });
  } catch (error) {
    console.error('❌ Erreur getBoxeurs:', error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CLOUD FUNCTION v2: updateBoxeur =====
exports.updateBoxeur = onRequest({
  region: "europe-west9",
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.set("Access-Control-Allow-Methods", "POST"); res.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); return res.status(204).send(""); }
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé" });
  try {
    const decodedToken = await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);
    const firebaseUID = decodedToken.uid;
    const { boxeurId, nom, prenom, victoires, defaites, nuls, ko, photoBoxeurBase64 } = req.body;
    if (!boxeurId) return res.status(400).json({ error: "boxeurId manquant" });
    let photoBoxeurUrl = null;
    if (photoBoxeurBase64) { try { const bucket = admin.storage().bucket(); const fileName = `boxeurs/${firebaseUID}_${Date.now()}.jpg`; const file = bucket.file(fileName); await file.save(Buffer.from(photoBoxeurBase64, 'base64'), { metadata: { contentType: 'image/jpeg' } }); await file.makePublic(); photoBoxeurUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`; } catch (photoError) { console.error('❌ Erreur upload photo boxeur:', photoError.message); } }
    const fields = {};
    if (nom !== undefined) fields["Nom du boxeur"] = nom;
    if (prenom !== undefined) fields["Prénom"] = prenom;
    if (victoires !== undefined) fields["Victoires "] = parseInt(victoires) || 0;
    if (defaites !== undefined) fields["Défaites "] = parseInt(defaites) || 0;
    if (nuls !== undefined) fields["Nuls "] = parseInt(nuls) || 0;
    if (ko !== undefined) fields["KO "] = parseInt(ko) || 0;
    if (photoBoxeurUrl) fields["Photo du boxeur"] = [{ url: photoBoxeurUrl }];
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    await axios.patch(`https://api.airtable.com/v0/${baseId}/Boxeurs/${boxeurId}`, { fields }, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur updateBoxeur:", error.response ? error.response.data : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});


// ===== CLOUD FUNCTION v2: addEvenement =====
exports.addEvenement = onRequest({
  region: "europe-west9",
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { 
    res.set("Access-Control-Allow-Methods", "POST"); 
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); 
    return res.status(204).send(""); 
  }

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé" });
  
  try {
    const decoded = await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);
    const firebaseUID = decoded.uid;

  
    const data = req.body.fields || req.body;

    // On récupère les valeurs avec un fallback (au cas où les clés varient)
    const titre = data["Nom événement"] || data.titre;
    const dateHeure = data["Date et heure"] || data.dateHeure;
    const adresse = data["Adresse"] || data.adresse || data.salle;
    const prix = data["Prix d'entrée"] || data.prix;
   const contact = data["Contact"] || data.contact;
    const photoUrl = data["Photo du gala"] || data.photoUrl;

    if (!titre) return res.status(400).json({ error: "Le titre est obligatoire" });

    const coachDoc = await admin.firestore().doc(`coaches/${firebaseUID}`).get();
    const clubId = coachDoc.exists ? coachDoc.data()?.clubId : null;

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY }).base(process.env.AIRTABLE_BASE_ID_SECURE);

    const fields = {
      "Nom événement": titre,
      "Adresse": adresse || "",
      "Contact": contact || "",
      "Statut": "A venir",
    };

    if (dateHeure) {
      const d = new Date(dateHeure);
      if (!isNaN(d.getTime())) {
        fields["Date et heure"] = d.toISOString();
      }
    }

    if (clubId) fields["Club organisateur"] = [clubId];
    if (prix && !isNaN(parseFloat(prix))) fields["Prix d'entrée"] = parseFloat(prix);
    if (photoUrl) fields["Photo du gala"] = [{ url: photoUrl }];

    const record = await base("Événements").create(fields);
    return res.status(200).json({ success: true, id: record.id });

  } catch (error) {
    console.error("❌ Erreur addEvenement:", error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: getMatchsPossibles =====
exports.getMatchsPossibles = onRequest({
  region: "europe-west9",
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {

  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).send("");

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);
    const uid = decoded.uid;

    const coachDoc = await admin.firestore().doc(`coaches/${uid}`).get();
    if (!coachDoc.exists) return res.status(404).json({ success: false, error: "Coach introuvable" });
    const coachEmail = coachDoc.data().email;

    const boxeurId = req.query.boxeurId;
    if (!boxeurId) return res.status(400).json({ error: "boxeurId manquant" });

    console.log('🔍 Recherche matchs pour boxeurId:', boxeurId, '| coachEmail:', coachEmail);

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    // Récupérer TOUS les records et filtrer manuellement
    // car FIND sur un champ lien Airtable est peu fiable
    const allRecords = await base("Matchs possibles").select().all();

    console.log('📦 Total records Matchs possibles:', allRecords.length);

    const matchs = [];

    for (const record of allRecords) {
      const f = record.fields || {};

      const emailCoach1 = Array.isArray(f["Email coach 1"]) ? f["Email coach 1"][0] : f["Email coach 1"] || "";
      const emailCoach2 = Array.isArray(f["Email coach 2"]) ? f["Email coach 2"][0] : f["Email coach 2"] || "";
      const boxeur1Ids = Array.isArray(f["Boxeur 1"]) ? f["Boxeur 1"] : [];
      const boxeur2Ids = Array.isArray(f["Boxeur 2"]) ? f["Boxeur 2"] : [];

      const isCoach1Match = emailCoach1.toLowerCase() === coachEmail.toLowerCase() && boxeur1Ids.includes(boxeurId);
      const isCoach2Match = emailCoach2.toLowerCase() === coachEmail.toLowerCase() && boxeur2Ids.includes(boxeurId);

      if (!isCoach1Match && !isCoach2Match) continue;

      const isCoach1 = isCoach1Match;

      // Adversaire = l'autre boxeur
      const adversaireNom = isCoach1
        ? (f["Nom et prénom boxeur 2"] || "")
        : (f["Nom et prénom boxeur 1"] || "");

      const adversaireClubRaw = isCoach1 ? f["club Boxeur 2"] : f["club Boxeur 1"];
      let adversaireClub = "";
      if (Array.isArray(adversaireClubRaw)) {
        adversaireClub = adversaireClubRaw[0] || "";
      } else if (typeof adversaireClubRaw === 'string') {
        adversaireClub = adversaireClubRaw;
      }

      const adversairePhoto = isCoach1
        ? (f["Photo boxeur 2"] ? f["Photo boxeur 2"][0]?.url : null)
        : (f["Photo du boxeur"] ? f["Photo du boxeur"][0]?.url : null);

      // Palmarès adversaire (string ou array)
      const palmaresRaw = isCoach1 ? f["Palmares boxeur 2"] : f["Palmares (from Boxeurs)"];
      let palmares = null;
      if (palmaresRaw) {
        if (typeof palmaresRaw === 'string') {
          try { palmares = JSON.parse(palmaresRaw); } catch { palmares = null; }
        } else {
          palmares = palmaresRaw;
        }
      }

      console.log('✅ Match trouvé:', record.id, '| adversaire:', adversaireNom);

      matchs.push({
        id: record.id,
        affichageCombat: f["Affichage combat"] || "",
        adversaireNom,
        adversaireClub,
        adversairePhoto,
        sexe: f["Sexe"] || "",
        categoriePoids: f["Catégorie de poids"] || "",
        palmares,
      });
    }

    console.log('🎯 Matchs trouvés:', matchs.length);

    return res.status(200).json({ success: true, matchs });

  } catch (error) {
    console.error("❌ Erreur getMatchsPossibles:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});