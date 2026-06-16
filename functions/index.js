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


// ===== CLOUD FUNCTION v2: getEvenements =====
exports.getEvenements = onRequest({
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
    await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    const records = await base("Événements").select({
      sort: [{ field: "Date et heure", direction: "asc" }],
      filterByFormula: `OR({Statut} = "A venir", {Statut} = "En cours")`,
    }).all();

    const evenements = records.map(record => {
      const f = record.fields || {};
      return {
        id: record.id,
        titre: f["Nom événement"] || "",
        dateFormatee: f["Date formatée"] || "",
        adresse: f["Adresse"] || "",
        club: f["Nom club organisateur"] || 
              (Array.isArray(f["Nom du club (from Club organisateur)"]) ? f["Nom du club (from Club organisateur)"][0] : "") ||
              "",
        statut: f["Statut"] || "",
        contact: f["Contact"] || "",
        prix: f["Prix d'entrée"] ? `${f["Prix d'entrée"]} €` : "Gratuit",
        photo: f["Photo du gala"] ? f["Photo du gala"][0]?.url : null,
      };
    });

    return res.status(200).json({ success: true, evenements });

  } catch (error) {
    console.error("❌ Erreur getEvenements:", error.response ? JSON.stringify(error.response.data) : error.message);
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

    const allRecords = await base("Matchs possibles").select({
      fields: [
        "Email coach 1",
        "Email coach 2",
        "Boxeur 1",
        "Boxeur 2",
        "Nom et prénom boxeur 1",
        "Nom et prénom boxeur 2 ",
        "Photo du  boxeur",
        "Photo boxeur 2 ",
        "Palmares (from Boxeurs)",
        "Palmares (from Palmares boxeur 2)",
        "club Boxeur demandeur",
        "club Boxeur 1",
        "Affichage combat",
        "Catégorie de poids",
        "Sexe"
      ]
    }).all();
    console.log('📦 Total records:', allRecords.length);

    const matchs = [];
    const seenAdversaireIds = new Set();

    for (const record of allRecords) {
      const f = record.fields || {};

      const emailCoach1 = Array.isArray(f["Email coach 1"]) ? f["Email coach 1"][0] : f["Email coach 1"] || "";
      const emailCoach2 = Array.isArray(f["Email coach 2"]) ? f["Email coach 2"][0] : f["Email coach 2"] || "";
      const boxeur1Ids = Array.isArray(f["Boxeur 1"]) ? f["Boxeur 1"].map(b => b.id || b) : [];
      const boxeur2Ids = Array.isArray(f["Boxeur 2"]) ? f["Boxeur 2"].map(b => b.id || b) : [];
      console.log('🔬 boxeur1Ids:', boxeur1Ids, '| boxeur2Ids:', boxeur2Ids, '| f["Boxeur 1"]:', JSON.stringify(f["Boxeur 1"]));

      const isCoach1Match = emailCoach1.toLowerCase() === coachEmail.toLowerCase() && boxeur1Ids.includes(boxeurId);
      const isCoach2Match = emailCoach2.toLowerCase() === coachEmail.toLowerCase() && boxeur2Ids.includes(boxeurId);

      if (!isCoach1Match && !isCoach2Match) continue;
console.log('🎯 Record passé le filtre | isCoach1:', isCoach1Match, '| isCoach2:', isCoach2Match, '| adversaireId:', f["Boxeur 2"]?.[0]?.id, f["Boxeur 1"]?.[0]?.id);
      const isCoach1 = isCoach1Match;

      const adversaireNom = isCoach1
        ? (f["Nom et prénom boxeur 2 "] || "")
        : (f["Nom et prénom boxeur 1"] || "");

   const adversaireId = isCoach1
  ? (boxeur2Ids[0] || null)
  : (boxeur1Ids[0] || null);

if (!adversaireNom || adversaireNom.trim() === '') continue;
const pairKey = [boxeurId, adversaireId].sort().join('-');
if (!adversaireId || seenAdversaireIds.has(pairKey)) continue;
seenAdversaireIds.add(pairKey);

      let adversaireClub = "";
    
adversaireClub = Array.isArray(f["club Boxeur demandeur"]) ? f["club Boxeur demandeur"][0] : f["club Boxeur demandeur"] || "";

      const adversairePhoto = isCoach1
        ? (f["Photo boxeur 2 "] ? f["Photo boxeur 2 "][0]?.url : null)
        : (f["Photo du  boxeur"] ? f["Photo du  boxeur"][0]?.url : null);

      const palmaresStr = isCoach1
        ? (Array.isArray(f["Palmares (from Palmares boxeur 2)"]) ? f["Palmares (from Palmares boxeur 2)"][0] : f["Palmares (from Palmares boxeur 2)"] || "")
        : (Array.isArray(f["Palmares (from Boxeurs)"]) ? f["Palmares (from Boxeurs)"][0] : f["Palmares (from Boxeurs)"] || "");

      let palmares = { vic: '—', def: '—', nuls: '—', ko: '—' };
      if (palmaresStr) {
        const m = palmaresStr.match(/(\d+)V-(\d+)D-(\d+)N\s*\((\d+)KO\)/i);
        if (m) palmares = { vic: m[1], def: m[2], nuls: m[3], ko: m[4] };
      }

     console.log('✅ Match:', adversaireNom, '| club:', adversaireClub);

      matchs.push({
        id: record.id,
        affichageCombat: f["Affichage combat"] || "",
        adversaireNom,
        adversaireClub,
        adversairePhoto,
        sexe: f["Sexe"] || "",
        categoriePoids: f["Catégorie de poids"] || "",
        emailCoach2: isCoach1 ? emailCoach2 : emailCoach1,
        palmares,
      });

      console.log('📧 emailCoach2 calculé:', isCoach1 ? emailCoach2 : emailCoach1, '| emailCoach1 brut:', emailCoach1, '| emailCoach2 brut:', emailCoach2);
    }

    console.log('🎯 Matchs uniques trouvés:', matchs.length);
    return res.status(200).json({ success: true, matchs });

  } catch (error) {
    console.error("❌ Erreur getMatchsPossibles:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: addDemandeMatch =====
exports.addDemandeMatch = onRequest({
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
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);

const {
  nomBoxeur, prenomBoxeur,
  nomAdversaire, prenomAdversaire,
  affichageCombat, dateSouhaitee,
  adresse, message,
  emailCoach1, emailCoach2,
  clubBoxeur, clubAdversaire,
  categorieDemandeur, categorieAdversaire,
  typeCombat, // <--- Ici
} = req.body;

   const apiKey = process.env.AIRTABLE_SECRET_KEY;
const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
const cleanType = (typeof typeCombat === 'string') ? typeCombat.replace(/['"]+/g, '') : "Gala";

// Juste avant de construire les fields, loggeons ce qu'on a reçu
console.log("DEBUG: typeCombat reçu du front-end =", JSON.stringify(typeCombat));

const fields = {
    "Nom de mon boxeur": nomBoxeur || "",
  "Prénom de mon boxeur": prenomBoxeur || "",
  "Nom du boxeur adversaire": nomAdversaire || "",
  "Prénom du boxeur adversaire": prenomAdversaire || "",
  "Message": message || "",
  "Adresse du combat": adresse || "",
  "Email Coach 1": emailCoach1 || "",
  "Club du boxeur": clubBoxeur || "",
  "Club boxeur adversaire": clubAdversaire || "",
  "Catégorie de poids demandeur": Array.isArray(categorieDemandeur) ? categorieDemandeur[0] : categorieDemandeur || "",
  "Catégorie de poids adversaire": Array.isArray(categorieAdversaire) ? categorieAdversaire[0] : categorieAdversaire || "",
  "Type combat": typeCombat || "Gala",
  "Statut": "En attente",
  "Date demande": new Date().toISOString().split('T')[0],
};
if (dateSouhaitee) {
  const d = new Date(dateSouhaitee);
  if (!isNaN(d.getTime())) fields["Date souhaitée"] = d.toISOString().split('T')[0];
}
if (emailCoach2) fields["Email coach 2"] = emailCoach2;

console.log('📤 Fields envoyés à Airtable:', JSON.stringify(fields));

const response = await axios.post(
  `https://api.airtable.com/v0/${baseId}/Demandedematch`,
  { fields },
  { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
);

const record = response.data;

    return res.status(200).json({ success: true, id: record.id });

 } catch (error) {
 console.error("❌ Erreur addDemandeMatch:", 
  error.response ? JSON.stringify(error.response.data) : error.message
);
  return res.status(500).json({ error: "Erreur interne du serveur" });
}
 
});
// ===== CLOUD FUNCTION v2: getDemandesMatch =====
exports.getDemandesMatch = onRequest({
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

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    const allRecords = await base("Demandedematch").select().all();

    const envoyees = [];
    const recues = [];

    for (const record of allRecords) {
      const f = record.fields || {};

      const emailCoach1 = f["Email Coach 1"] || "";
      const emailCoach2 = f["Email coach 2"] || "";

      const demande = {
        id: record.id,
        idDemande: f["ID Demande"] || "",
        nomBoxeur: f["Nom de mon boxeur"] || "",
        prenomBoxeur: f["Prénom de mon boxeur"] || "",
        nomAdversaire: f["Nom du boxeur adversaire"] || "",
        prenomAdversaire: f["Prénom du boxeur adversaire"] || "",
        dateSouhaitee: f["Date souhaitée"] || "",
        dateDemande: f["Date demande"] || "",
        adresse: f["Adresse du combat"] || "",
        message: f["Message "] || f["Message"] || "",
        statut: f["Statut"] || "En attente",
        typeCombat: Array.isArray(f["Type combat"]) ? f["Type combat"][0] : f["Type combat"] || "",
        clubBoxeur: f["Club du boxeur"] || "",
        clubAdversaire: f["Club boxeur adversaire"] || "",
        categorieDemandeur: f["Catégorie de poids demandeur"] || "",
        categorieAdversaire: f["Catégorie de poids adversaire"] || "",
        commentaireRefus: f["Commentaire du refus"] || "",
      };

      if (emailCoach1.toLowerCase() === coachEmail.toLowerCase()) {
        envoyees.push(demande);
      } else if (emailCoach2.toLowerCase() === coachEmail.toLowerCase()) {
        recues.push(demande);
      }
    }

    return res.status(200).json({ success: true, envoyees, recues });

  } catch (error) {
    console.error("❌ Erreur getDemandesMatch:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: updateDemandeMatch =====
exports.updateDemandeMatch = onRequest({
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
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);

    const { demandeId, statut, commentaireRefus } = req.body;

    if (!demandeId) return res.status(400).json({ error: "demandeId manquant" });
    if (!statut || !["Accepté", "Refusé"].includes(statut)) {
      return res.status(400).json({ error: "statut invalide (Accepté ou Refusé attendu)" });
    }

    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;

    const fields = {
      "Statut": statut,
    };

    if (statut === "Refusé" && commentaireRefus) {
      fields["Commentaire du refus"] = commentaireRefus;
    }

    console.log('📤 Update demande:', demandeId, '| fields:', JSON.stringify(fields));

    await axios.patch(
      `https://api.airtable.com/v0/${baseId}/Demandedematch/${demandeId}`,
      { fields },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Erreur updateDemandeMatch:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: getNotifications =====
exports.getNotifications = onRequest({
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
    const coachData = coachDoc.data();
    const coachEmail = coachData.email;
    const airtableCoachId = coachData.airtableRecordId;

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    // ── Demandes reçues en attente ──
  // ── Demandes en attente (envoyées + reçues) ──
    const demandesRecords = await base("Demandedematch").select().all();
    const demandesEnAttente = demandesRecords
      .map((record) => {
        const f = record.fields || {};
        return {
          id: record.id,
          emailCoach1: f["Email Coach 1"] || "",
          emailCoach2: f["Email coach 2"] || "",
          statut: f["Statut"] || "En attente",
          nomBoxeur: f["Nom de mon boxeur"] || "",
          prenomBoxeur: f["Prénom de mon boxeur"] || "",
          nomAdversaire: f["Nom du boxeur adversaire"] || "",
          prenomAdversaire: f["Prénom du boxeur adversaire"] || "",
          dateDemande: f["Date demande"] || "",
        };
      })
      .filter((d) => d.statut === "En attente")
      .filter((d) =>
        d.emailCoach1.toLowerCase() === coachEmail.toLowerCase() ||
        d.emailCoach2.toLowerCase() === coachEmail.toLowerCase()
      )
      .map((d) => ({
        ...d,
        type: d.emailCoach2.toLowerCase() === coachEmail.toLowerCase() ? 'recue' : 'envoyee',
      }));

    // ── Boxeurs validés ──
    let boxeursValides = [];
    if (airtableCoachId) {
      const boxeursRecords = await base("Boxeurs en attente").select({
        filterByFormula: `AND(FIND("${airtableCoachId}", ARRAYJOIN({Liaison vers Coach})), {Statut de validation} = "Validé")`
      }).all();

      boxeursValides = boxeursRecords.map((record) => {
        const f = record.fields || {};
        return {
          id: record.id,
          nom: f["Nom"] || "",
          prenom: f["Prénom"] || "",
          dateValidation: f["Date de naissance"] || "",
        };
      });
    }

    return res.status(200).json({
      success: true,
      demandesEnAttente,
      boxeursValides,
    });

  } catch (error) {
    console.error("❌ Erreur getNotifications:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: getCombatsATraiter =====
exports.getCombatsATraiter = onRequest({
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

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    const now = new Date();

    const records = await base("Résultats").select().all();

    const combatsATraiter = records
      .map((record) => {
        const f = record.fields || {};
        return {
          id: record.id,
          combattants: f["Combattants + date"] || "",
          dateCombat: f["Date du combat"] || "",
          typeCombat: f["Type de combat"] || "",
          statut: f["Statut"] || "",
          emailCoachA: Array.isArray(f["Email coach A"]) ? (f["Email coach A"][0] || "") : (f["Email coach A"] || ""),
emailCoachB: Array.isArray(f["Email coach B"]) ? (f["Email coach B"][0] || "") : (f["Email coach B"] || ""),
        boxeurA: Array.isArray(f["Boxeur A"]) ? (f["Boxeur A"][0]?.name || f["Boxeur A"][0] || "") : (f["Boxeur A"] || ""),
boxeurB: Array.isArray(f["Boxeur B"]) ? (f["Boxeur B"][0]?.name || f["Boxeur B"][0] || "") : (f["Boxeur B"] || ""),
          scoreSaisiCoachA: f["Score saisi par Coach A"] || null,
          scoreSaisiCoachB: f["Score saisi par Coach B"] || null,
        };
      })
      .filter((c) => {
        const isCoachA = c.emailCoachA.toLowerCase() === coachEmail.toLowerCase();
        const isCoachB = c.emailCoachB.toLowerCase() === coachEmail.toLowerCase();
        if (!isCoachA && !isCoachB) return false;

        // Déjà saisi par ce coach ?
        if (isCoachA && c.scoreSaisiCoachA) return false;
        if (isCoachB && c.scoreSaisiCoachB) return false;

        // Date du combat + 8h doit être passée
        if (!c.dateCombat) return false;
        const dateLimite = new Date(c.dateCombat);
        dateLimite.setHours(dateLimite.getHours() + 8);
        return dateLimite <= now;
      })
      .map((c) => ({
        ...c,
        role: c.emailCoachA.toLowerCase() === coachEmail.toLowerCase() ? 'A' : 'B',
      }));

    return res.status(200).json({ success: true, combatsATraiter });

  } catch (error) {
    console.error("❌ Erreur getCombatsATraiter:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ===== CLOUD FUNCTION v2: submitResultatCombat =====
exports.submitResultatCombat = onRequest({
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
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);

    const { resultatId, role, scoreBoxeur, round, typeVictoire, commentaire } = req.body;

    if (!resultatId) return res.status(400).json({ error: "resultatId manquant" });
    if (!role || !["A", "B"].includes(role)) return res.status(400).json({ error: "role invalide" });

    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;

    const fields = {};
    const todayStr = new Date().toISOString().split('T')[0];

    if (role === "A") {
      fields["Score Boxeur A"] = scoreBoxeur != null ? parseInt(scoreBoxeur) : null;
      fields["Round Coach A"] = round != null ? parseInt(round) : null;
      fields["Type de victoire Coach A"] = typeVictoire || "";
      fields["Commentaire Coach A"] = commentaire || "";
      fields["Score saisi par Coach A"] = todayStr;
    } else {
      fields["Score Boxeur B"] = scoreBoxeur != null ? parseInt(scoreBoxeur) : null;
      fields["Round Coach B"] = round != null ? parseInt(round) : null;
      fields["Type de victoire Coach B"] = typeVictoire || "";
      fields["Commentaire Coach B"] = commentaire || "";
      fields["Score saisi par Coach B"] = todayStr;
    }

    console.log('📤 Submit résultat:', resultatId, '| fields:', JSON.stringify(fields));

    await axios.patch(
      `https://api.airtable.com/v0/${baseId}/Résultats/${resultatId}`,
      { fields },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Erreur submitResultatCombat:", error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});