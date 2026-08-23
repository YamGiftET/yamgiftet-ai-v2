const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

const serviceAccountPath = path.join(
    __dirname,
    "firebase-service-account.json"
);

const serviceAccount = require(serviceAccountPath);

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
