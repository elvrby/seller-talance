// libs/firebase/admin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readAdminCred() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // 1) Prefer BASE64 jika ada (paling kebal masalah newline)
  const b64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (b64) {
    let json: any;
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      json = JSON.parse(decoded);
    } catch (e: any) {
      throw new Error(`FIREBASE_PRIVATE_KEY_BASE64 invalid: ${e.message}`);
    }
    const pk = String(json.private_key || "").trim();
    if (!json.project_id || !json.client_email || !pk) {
      throw new Error(
        "Decoded service account JSON missing project_id/client_email/private_key"
      );
    }
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: pk,
    };
  }

  // 2) Fallback: triple env + \n-escaped
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

  if (!projectId || !clientEmail || !privateKey) {
    const miss = [
      !projectId ? "FIREBASE_PROJECT_ID" : null,
      !clientEmail ? "FIREBASE_CLIENT_EMAIL" : null,
      !privateKey
        ? "FIREBASE_PRIVATE_KEY (atau FIREBASE_PRIVATE_KEY_BASE64)"
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Missing ENV: ${miss}`);
  }

  // normalize: buang kutip luar & ubah literal \\n -> newline
  privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim();

  if (process.env.NODE_ENV !== "production") {
    if (
      !privateKey.includes("BEGIN PRIVATE KEY") ||
      !privateKey.includes("END PRIVATE KEY")
    ) {
      const start = privateKey.slice(0, 30).replace(/\n/g, "\\n");
      const end = privateKey.slice(-30).replace(/\n/g, "\\n");
      throw new Error(
        `Invalid FIREBASE_PRIVATE_KEY format. Got: "${start} ... ${end}". ` +
          `Pastikan multiline diganti \\n atau gunakan FIREBASE_PRIVATE_KEY_BASE64.`
      );
    }
  }

  return { projectId, clientEmail, privateKey };
}

const cred = readAdminCred();

const app =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({
        credential: cert({
          projectId: cred.projectId,
          clientEmail: cred.clientEmail,
          privateKey: cred.privateKey,
        }),
      });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
