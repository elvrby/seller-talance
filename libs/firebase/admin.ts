// libs/firebase/admin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
privateKey = privateKey.replace(/\\n/g, "\n").trim();

if (process.env.NODE_ENV !== "production") {
  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new Error("Invalid FIREBASE_PRIVATE_KEY format.");
  }
}

const app =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
