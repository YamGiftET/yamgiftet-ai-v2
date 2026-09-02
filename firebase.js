const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

let serviceAccount;

if (process.env.YAM_FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.YAM_FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  const serviceAccountPath = path.join(
    __dirname,
    "firebase-service-account.json"
  );
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
}

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount)
      })
    : getApps()[0];

const db = getFirestore(firebaseApp);

module.exports = {
  firebaseApp,
  db
};
