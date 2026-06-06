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
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    
    const response = await axios.get(
      `https://api.airtable.com/v0/${baseId}/Club`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    const records = response.data.records || [];
    
    const clubs = records.map(record => {
      const f = record.fields || {};
      let regionRaw = f['Région'] || '';
      let regionClean = Array.isArray(regionRaw) ? (regionRaw[0] || '') : regionRaw;
      return {
        id: record.id,
        name: f['Nom du club'] ? String(f['Nom du club']) : 'Sans nom',
        ville: f['Ville'] ? String(f['Ville']) : '',
        codePostal: f['Code postal'] ? String(f['Code postal']) : '',
        region: String(regionClean)
      };
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
    console.log('👉 DONNÉES REÇUES DE FIRESTORE :', JSON.stringify(coachData));
    console.log(`📝 Syncing coach ${coachId} to Airtable...`);
    
    const clubArray = coachData.clubId ? [String(coachData.clubId)] : [];
    const finalFirstName = coachData.prenom || coachData.firstName || '';
    const finalLastName = coachData.nom || coachData.lastName || '';
    const finalTelephone = coachData.telephone || coachData.phone || '';
    const finalLicence = coachData.numeroLicence || '';
    
    const response = await axios.post(
      `https://api.airtable.com/v0/${baseId}/Coach`,
      {
        fields: {
          'Email': coachData.email || '',
          'Nom': finalLastName,
          'Prénom': finalFirstName,
          'Téléphone': String(finalTelephone),
          'Numéro d\'affiliation': String(finalLicence),
          'Club': clubArray,
          'Firebase UID': coachId
        }
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    console.log(`✅ Coach synced successfully: ${response.data.id}`);

    await admin.firestore().doc(`coaches/${coachId}`).update({
      airtableRecordId: response.data.id
    });
    console.log(`✅ airtableRecordId sauvegardé dans Firestore: ${response.data.id}`);
    
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
    const decodedToken = await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);
    const firebaseUID = decodedToken.uid;

    const { nom, prenom, dateNaissance, sexe, categoriePoids,
        poids, niveau, numeroLicence, clubId, photoLicenceBase64, photoBoxeurBase64 } = req.body;

    // Récupération du airtableRecordId du coach depuis Firestore
    const coachDoc = await admin.firestore().doc(`coaches/${firebaseUID}`).get();
    const airtableCoachId = coachDoc.exists ? coachDoc.data()?.airtableRecordId : null;
    console.log(`👤 airtableCoachId: ${airtableCoachId}`);

    // Upload photo vers Firebase Storage
    let photoUrl = null;
    if (photoLicenceBase64) {
      try {
        const bucket = admin.storage().bucket();
        const fileName = `licences/${firebaseUID}_${Date.now()}.jpg`;
        const file = bucket.file(fileName);
        await file.save(Buffer.from(photoLicenceBase64, 'base64'), {
          metadata: { contentType: 'image/jpeg' },
        });
        await file.makePublic();
        photoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log(`📸 Photo uploadée: ${photoUrl}`);
      } catch (photoError) {
        console.error('❌ Erreur upload photo:', photoError.message);
      }
    }

    let photoBoxeurUrl = null;
    if (photoBoxeurBase64) {
      try {
        const bucket = admin.storage().bucket();
        const fileName = `boxeurs/${firebaseUID}_${Date.now()}.jpg`;
        const file = bucket.file(fileName);
        await file.save(Buffer.from(photoBoxeurBase64, 'base64'), {
          metadata: { contentType: 'image/jpeg' },
        });
        await file.makePublic();
        photoBoxeurUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log(`📸 Photo du boxeur uploadée: ${photoBoxeurUrl}`);
      } catch (photoError) {
        console.error('❌ Erreur upload photo du boxeur:', photoError.message);
      }
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    const record = await base("Boxeurs en attente").create({
      "Nom": nom || "",
      "Prénom": prenom || "",
      "Date de naissance": dateNaissance ? (() => {
        const parts = dateNaissance.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateNaissance;
      })() : "",
      "Sexe": sexe || "",
      "Catégorie de poids": categoriePoids || "",
      "Poids": poids ? parseFloat(poids) : null,
      "Niveau": niveau || "",
      "Numéro de licence": numeroLicence ? parseInt(numeroLicence) : null,
      "Liaison vers Club": clubId ? [clubId] : [],
      "Liaison vers Coach": airtableCoachId ? [airtableCoachId] : [],
      "Photo de la licence": photoUrl ? [{ url: photoUrl }] : [],
      "Photo du boxeur": photoBoxeurUrl ? [{ url: photoBoxeurUrl }] : [],
    });

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

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Extraction plus robuste du token
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    console.log('📥 Auth header reçu:', authHeader ? `${authHeader.substring(0, 20)}...` : 'VIDE');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Header Authorization manquant ou mal formé');
      return res.status(401).json({ success: false, error: 'Token manquant' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    console.log('🔑 Token extrait, longueur:', token.length);

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    console.log('✅ UID décodé:', uid);

    // Récupération du airtableRecordId depuis Firestore
    const coachDoc = await admin.firestore().doc(`coaches/${uid}`).get();
    if (!coachDoc.exists) {
      return res.status(404).json({ success: false, error: 'Coach non trouvé dans Firestore' });
    }

    const airtableRecordId = coachDoc.data().airtableRecordId;
    console.log('📋 airtableRecordId:', airtableRecordId);
    
    if (!airtableRecordId) {
      return res.status(404).json({ success: false, error: 'airtableRecordId manquant' });
    }

   const apiKey = process.env.AIRTABLE_SECRET_KEY;        // ✅
const baseId = process.env.AIRTABLE_BASE_ID_SECURE;  

    const response = await axios.get(
      `https://api.airtable.com/v0/${baseId}/Coach/${airtableRecordId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const f = response.data.fields || {};

    const profile = {
      nom: f['Nom'] || '',
      prenom: f['Prénom'] || '',
      telephone: f['Téléphone'] || '',
      nomClub: f['Nom du club (from Club 2)'] ? f['Nom du club (from Club 2)'][0] : '',
      adresse: f['Adresse (from Club 2)'] ? f['Adresse (from Club 2)'][0] : '',
      affiliation: f['Numéro d\'affiliation'] || '',
    };

    console.log('✅ Profil récupéré:', JSON.stringify(profile));
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

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token manquant' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    console.log('🗑️ Suppression compte pour UID:', uid);

    // 1. Récupérer les IDs Airtable depuis Firestore
    const coachDoc = await admin.firestore().doc(`coaches/${uid}`).get();
    if (!coachDoc.exists) {
      return res.status(404).json({ success: false, error: 'Coach introuvable' });
    }

    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    const airtableCoachId = coachDoc.data().airtableRecordId;

    // 2. Supprimer les boxeurs liés dans Airtable
    if (airtableCoachId) {
      try {
        // Chercher les boxeurs liés à ce coach
        const boxeursResponse = await axios.get(
          `https://api.airtable.com/v0/${baseId}/Boxeurs en attente`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
              filterByFormula: `FIND("${airtableCoachId}", ARRAYJOIN({Liaison vers Coach}))`
            }
          }
        );

        const boxeurs = boxeursResponse.data.records || [];
        console.log(`🥊 ${boxeurs.length} boxeurs à supprimer`);

        // Supprimer chaque boxeur
        for (const boxeur of boxeurs) {
          await axios.delete(
            `https://api.airtable.com/v0/${baseId}/Boxeurs en attente/${boxeur.id}`,
            { headers: { Authorization: `Bearer ${apiKey}` } }
          );
        }

        // 3. Supprimer le coach dans Airtable
        await axios.delete(
          `https://api.airtable.com/v0/${baseId}/Coach/${airtableCoachId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        console.log('✅ Coach supprimé dans Airtable');
      } catch (airtableError) {
        console.error('❌ Erreur suppression Airtable:', airtableError.message);
      }
    }

    // 4. Supprimer le document Firestore
    await admin.firestore().doc(`coaches/${uid}`).delete();
    console.log('✅ Document Firestore supprimé');

    // 5. Supprimer le compte Firebase Auth
    await admin.auth().deleteUser(uid);
    console.log('✅ Compte Firebase Auth supprimé');

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Erreur deleteCoachAccount:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});
