import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appnvOK10GCDTjU";
const AIRTABLE_TABLE_NAME = "Coach";
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

/**
 * Cloud Function triggered when a new coach is created in Firestore
 * Syncs the coach data to Airtable
 */
export const syncCoachToAirtable = functions.firestore
  .document("coaches/{coachId}")
  .onCreate(async (snap, context) => {
    const coachId = context.params.coachId;
    const coachData = snap.data();

    console.log(`📝 New coach created: ${coachId}`, coachData);

    try {
      // Validate required fields
      if (!coachData.email) {
        console.error("❌ Coach missing email - cannot sync to Airtable");
        return;
      }

      if (!AIRTABLE_API_KEY) {
        console.error("❌ AIRTABLE_API_KEY not configured");
        return;
      }

      // Check if coach already exists in Airtable by email
      const existingRecord = await findCoachByEmail(coachData.email);

      if (existingRecord) {
        // Update existing record
        await updateCoachInAirtable(existingRecord.id, coachData);
        console.log(`✏️ Updated existing coach in Airtable: ${existingRecord.id}`);
      } else {
        // Create new record
        const newRecordId = await createCoachInAirtable(coachData);
        console.log(`✨ Created new coach in Airtable: ${newRecordId}`);
      }
    } catch (error) {
      console.error("❌ Error syncing coach to Airtable:", error.message);
      throw error;
    }
  });

/**
 * Cloud Function triggered when a coach is updated in Firestore
 * Syncs the updated coach data to Airtable
 */
export const updateCoachInAirtableOnUpdate = functions.firestore
  .document("coaches/{coachId}")
  .onUpdate(async (change, context) => {
    const coachData = change.after.data();
    const email = coachData.email;

    console.log(`📝 Coach updated: ${context.params.coachId}`, coachData);

    try {
      if (!email) {
        console.error("❌ Coach missing email - cannot sync to Airtable");
        return;
      }

      if (!AIRTABLE_API_KEY) {
        console.error("❌ AIRTABLE_API_KEY not configured");
        return;
      }

      const existingRecord = await findCoachByEmail(email);

      if (existingRecord) {
        await updateCoachInAirtable(existingRecord.id, coachData);
        console.log(`✏️ Updated coach in Airtable: ${existingRecord.id}`);
      }
    } catch (error) {
      console.error("❌ Error updating coach in Airtable:", error.message);
      throw error;
    }
  });

/**
 * Find a coach in Airtable by email
 */
async function findCoachByEmail(email) {
  try {
    const response = await axios.get(AIRTABLE_API_URL, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      params: {
        filterByFormula: `{Email} = "${email}"`,
      },
    });

    if (response.data.records && response.data.records.length > 0) {
      return response.data.records[0];
    }
    return null;
  } catch (error) {
    console.error("❌ Error finding coach in Airtable:", error.message);
    throw error;
  }
}

/**
 * Create a new coach record in Airtable
 */
async function createCoachInAirtable(coachData) {
  try {
    const fields = mapCoachDataToAirtableFields(coachData);

    const response = await axios.post(
      AIRTABLE_API_URL,
      {
        records: [{ fields }],
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.records && response.data.records.length > 0) {
      return response.data.records[0].id;
    }
    throw new Error("No record returned from Airtable");
  } catch (error) {
    console.error("❌ Error creating coach in Airtable:", error.message);
    throw error;
  }
}

/**
 * Update an existing coach record in Airtable
 */
async function updateCoachInAirtable(recordId, coachData) {
  try {
    const fields = mapCoachDataToAirtableFields(coachData);

    await axios.patch(
      `${AIRTABLE_API_URL}/${recordId}`,
      { fields },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✏️ Coach ${recordId} updated in Airtable`);
  } catch (error) {
    console.error("❌ Error updating coach in Airtable:", error.message);
    throw error;
  }
}

/**
 * Map Firestore coach data to Airtable fields
 */
function mapCoachDataToAirtableFields(coachData) {
  const fields = {
    Email: coachData.email || "",
    Prénom: coachData.prenom || "",
    Téléphone: coachData.telephone || "",
    "Numéro d'affiliation": coachData.numeroLicence || "",
    "Firebase UID": coachData.firebaseUID || "",
  };

  // Handle Club field (it's a linked record in Airtable)
  if (coachData.clubId) {
    fields.Club = [coachData.clubId];
  }

  return fields;
}