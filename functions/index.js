const util = require('util');
global.util = util;

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// ===== CLOUD FUNCTION: getClubs =====
exports.getClubs = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    const response = await axios.get(
      `https://api.airtable.com/v0/${baseId}/Club`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    const clubs = response.data.records.map(record => ({
      id: record.id,
      name: record.fields['Nom du club'],
      ville: record.fields['Ville'],
      codePostal: record.fields['Code postal'],
      region: record.fields['Région']
    }));
    
    res.json({ success: true, clubs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CLOUD FUNCTION: syncCoachToAirtableV2 =====
exports.syncCoachToAirtableV2 = functions.firestore
  .document('coaches/{coachId}')
  .onCreate(async (snap, context) => {
    try {
      const apiKey = process.env.AIRTABLE_API_KEY;
      const baseId = process.env.AIRTABLE_BASE_ID;
      const coachData = snap.data();
      const coachId = context.params.coachId;
      
      const response = await axios.post(
        `https://api.airtable.com/v0/${baseId}/Coach`,
        {
          fields: {
            'Email': coachData.email,
            'Nom': coachData.firstName,
            'Prénom': coachData.lastName,
            'Club': coachData.clubId,
            'Firebase UID': coachId
          }
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      console.log(`✅ Coach synced: ${response.data.id}`);
    } catch (error) {
      console.error('❌ Error syncing:', error.message);
    }
  });