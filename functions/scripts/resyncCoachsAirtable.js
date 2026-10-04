/*
 * Resynchronise vers Airtable (table Coach) les coachs présents dans Firestore
 * (collection coaches) mais absents d'Airtable — cas des échecs silencieux de
 * syncCoachToAirtableV2.
 *
 * PAR DÉFAUT : ESSAI À BLANC. Le script lit tout et affiche ce qu'il ferait,
 * sans rien écrire. Ajouter --apply pour exécuter réellement.
 *
 * Pour chaque coach Firestore, dans l'ordre :
 *   1. airtableRecordId présent et la fiche Airtable existe      → OK, rien à faire
 *   2. fiche Airtable trouvée par Firebase UID ou par email       → RELIER : écrit
 *      airtableRecordId dans Firestore (+ Firebase UID dans Airtable s'il manque).
 *      Aucune fiche n'est créée, le club n'est pas modifié.
 *   Dans les cas 1 et 2, si le club Firestore (clubId) diffère du club lié à la
 *   fiche Airtable → CLUB DIFFÉRENT : avertissement, rien n'est écrit (ni relié).
 *   3. aucune fiche Airtable :
 *      - club inconnu dans Airtable                               → À TRAITER (rien n'est écrit)
 *      - club revendiqué par plusieurs coachs Firestore, ou déjà
 *        lié à un autre coach dans Airtable                       → CONFLIT (rien n'est écrit)
 *        Règle « un club = un coach » : c'est à un humain de choisir qui garde le club.
 *      - sinon                                                    → CRÉER la fiche Coach,
 *        avec les mêmes champs que syncCoachToAirtableV2, puis écrit airtableRecordId.
 *   Tout coach synchronisé reçoit airtableSyncStatus = "ok".
 *
 * Prérequis (depuis le dossier functions/) :
 *   - Accès Firestore admin, au choix :
 *       gcloud auth application-default login
 *     ou GOOGLE_APPLICATION_CREDENTIALS=<chemin vers une clé de compte de service>
 *   - Secrets Airtable dans l'environnement :
 *       export AIRTABLE_SECRET_KEY="$(firebase functions:secrets:access AIRTABLE_SECRET_KEY)"
 *       export AIRTABLE_BASE_ID_SECURE="$(firebase functions:secrets:access AIRTABLE_BASE_ID_SECURE)"
 *
 * Utilisation :
 *   node scripts/resyncCoachsAirtable.js            # essai à blanc
 *   node scripts/resyncCoachsAirtable.js --apply    # exécution réelle
 */

const admin = require("firebase-admin");
const Airtable = require("airtable");

const APPLY = process.argv.includes("--apply");
const PROJECT_ID = "hitting-23de9";

// Airtable limite à 5 requêtes/s par base
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PAUSE_AIRTABLE_MS = 250;

function champsCoachAirtable(coachId, coachData, avecClub) {
  // Même mapping que syncCoachToAirtableV2 (functions/index.js)
  return {
    "Email": coachData.email || "",
    "Nom": coachData.nom || coachData.lastName || "",
    "Prénom": coachData.prenom || coachData.firstName || "",
    "Téléphone": String(coachData.telephone || coachData.phone || ""),
    "Numéro d'affiliation": String(coachData.numeroLicence || ""),
    "Club": avecClub && coachData.clubId ? [String(coachData.clubId)] : [],
    "Firebase UID": coachId,
  };
}

async function main() {
  const apiKey = process.env.AIRTABLE_SECRET_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
  if (!apiKey || !baseId) {
    console.error("AIRTABLE_SECRET_KEY et AIRTABLE_BASE_ID_SECURE doivent être définis (voir l'en-tête du script).");
    process.exit(1);
  }

  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();
  const base = new Airtable({ apiKey, requestTimeout: 15000 }).base(baseId);

  console.log(APPLY ? "=== EXÉCUTION RÉELLE (--apply) ===\n" : "=== ESSAI À BLANC : rien ne sera écrit ===\n");

  // ── Lecture ──
  const [coachesSnap, coachRecords, clubRecords] = await Promise.all([
    db.collection("coaches").get(),
    base("Coach").select({ fields: ["Email", "Firebase UID", "Club"] }).all(),
    base("Club").select({ fields: ["Nom du club", "Coach"] }).all(),
  ]);

  const airtableParId = new Map(coachRecords.map((r) => [r.id, r]));
  const airtableParUid = new Map();
  const airtableParEmail = new Map();
  for (const r of coachRecords) {
    const uid = r.get("Firebase UID");
    const email = (r.get("Email") || "").trim().toLowerCase();
    if (uid) airtableParUid.set(uid, r);
    if (email) airtableParEmail.set(email, r);
  }
  const clubs = new Map(clubRecords.map((r) => [r.id, r]));

  // Nombre de coachs Firestore par club
  const coachsFirestoreParClub = new Map();
  coachesSnap.forEach((d) => {
    const clubId = d.get("clubId");
    if (!clubId) return;
    if (!coachsFirestoreParClub.has(clubId)) coachsFirestoreParClub.set(clubId, []);
    coachsFirestoreParClub.get(clubId).push(`${d.get("email") || "?"} (${d.id})`);
  });

  const nomClub = (clubId) => clubs.get(clubId)?.get("Nom du club") || clubId;

  // Le club Firestore du coach est-il celui lié à sa fiche Airtable ?
  // Retourne un message d'écart, ou null si les deux concordent.
  const ecartDeClub = (data, record) => {
    const clubFirestore = data.clubId || "";
    const clubsAirtable = record.get("Club") || [];
    if (!clubFirestore && clubsAirtable.length === 0) return null;
    if (clubFirestore && clubsAirtable.includes(clubFirestore)) return null;
    const cote = (ids) => (ids.length ? ids.map(nomClub).join(", ") : "aucun");
    return `Firestore : ${clubFirestore ? nomClub(clubFirestore) : "aucun"} — Airtable (${record.id}) : ${cote(clubsAirtable)}`;
  };

  // ── Diagnostic ──
  const plan = { ok: [], relier: [], creer: [], conflit: [], clubDifferent: [], aTraiter: [] };

  coachesSnap.forEach((doc) => {
    const coachId = doc.id;
    const data = doc.data();
    const email = (data.email || "").trim().toLowerCase();
    const libelle = `${data.email || "(sans email)"} — ${data.clubName || "(sans club)"} — uid ${coachId}`;

    const dejaLie = data.airtableRecordId && airtableParId.get(data.airtableRecordId);
    const existant = dejaLie || airtableParUid.get(coachId) || (email && airtableParEmail.get(email));

    if (existant) {
      const ecart = ecartDeClub(data, existant);
      if (ecart) {
        plan.clubDifferent.push(`${libelle}${dejaLie ? " (déjà relié)" : " (non relié)"}\n      ${ecart}`);
        return;
      }
      if (dejaLie) {
        plan.ok.push(libelle);
      } else {
        plan.relier.push({ coachId, libelle, record: existant, uidManquant: !existant.get("Firebase UID") });
      }
      return;
    }

    const clubId = data.clubId;
    if (clubId && !clubs.has(clubId)) {
      plan.aTraiter.push(`${libelle} : clubId ${clubId} introuvable dans Airtable`);
      return;
    }

    if (clubId) {
      const autresFirestore = (coachsFirestoreParClub.get(clubId) || []).filter((c) => !c.endsWith(`(${coachId})`));
      const liensAirtable = clubs.get(clubId).get("Coach") || [];
      if (autresFirestore.length > 0 || liensAirtable.length > 0) {
        plan.conflit.push(
          `${libelle}\n      autres coachs Firestore sur ce club : ${autresFirestore.join(", ") || "aucun"}` +
          `\n      coachs déjà liés dans Airtable : ${liensAirtable.length ? liensAirtable.map((id) => airtableParId.get(id)?.get("Email") || id).join(", ") : "aucun"}`
        );
        return;
      }
    }

    plan.creer.push({ coachId, libelle, data });
  });

  // ── Rapport ──
  console.log(`Coachs Firestore : ${coachesSnap.size} — fiches Coach Airtable : ${coachRecords.length}\n`);
  console.log(`✅ Déjà synchronisés : ${plan.ok.length}`);
  console.log(`\n🔗 À RELIER à une fiche Airtable existante (${plan.relier.length}) :`);
  plan.relier.forEach((p) => console.log(`   - ${p.libelle} → ${p.record.id}${p.uidManquant ? " (+ Firebase UID ajouté dans Airtable)" : ""}`));
  console.log(`\n➕ À CRÉER dans Airtable (${plan.creer.length}) :`);
  plan.creer.forEach((p) => console.log(`   - ${p.libelle}`));
  console.log(`\n⚠️  CONFLIT de club, non traités — décision manuelle (${plan.conflit.length}) :`);
  plan.conflit.forEach((l) => console.log(`   - ${l}`));
  console.log(`\n⚠️  CLUB DIFFÉRENT entre Firestore et Airtable, non traités — décision manuelle (${plan.clubDifferent.length}) :`);
  plan.clubDifferent.forEach((l) => console.log(`   - ${l}`));
  console.log(`\n❓ À traiter à la main (${plan.aTraiter.length}) :`);
  plan.aTraiter.forEach((l) => console.log(`   - ${l}`));

  if (!APPLY) {
    console.log("\nEssai à blanc terminé. Relancer avec --apply pour exécuter RELIER et CRÉER.");
    return;
  }

  // ── Écritures ──
  console.log("\n=== Écritures ===");
  let erreurs = 0;

  for (const p of plan.relier) {
    try {
      if (p.uidManquant) {
        await base("Coach").update(p.record.id, { "Firebase UID": p.coachId });
        await pause(PAUSE_AIRTABLE_MS);
      }
      await db.doc(`coaches/${p.coachId}`).update({ airtableRecordId: p.record.id, airtableSyncStatus: "ok" });
      console.log(`   🔗 relié : ${p.libelle} → ${p.record.id}`);
    } catch (e) {
      erreurs++;
      console.error(`   ❌ échec relier ${p.libelle} : ${e.message}`);
    }
  }

  for (const p of plan.creer) {
    try {
      const record = await base("Coach").create(champsCoachAirtable(p.coachId, p.data, true));
      await pause(PAUSE_AIRTABLE_MS);
      await db.doc(`coaches/${p.coachId}`).update({ airtableRecordId: record.id, airtableSyncStatus: "ok" });
      console.log(`   ➕ créé : ${p.libelle} → ${record.id}`);
    } catch (e) {
      erreurs++;
      console.error(`   ❌ échec création ${p.libelle} : ${e.message}`);
    }
  }

  console.log(`\nTerminé : ${plan.relier.length + plan.creer.length - erreurs} réussite(s), ${erreurs} échec(s).`);
  if (erreurs) process.exitCode = 1;
}

main().catch((e) => {
  console.error("❌ Erreur fatale :", e.message);
  process.exit(1);
});
