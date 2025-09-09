// /libs/firebase/auth.ts
import { type User, GoogleAuthProvider, signInWithPopup, onAuthStateChanged as _onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { firebaseAuth, firebaseFirestore } from "./config";

export function onAuthStateChanged(callback: (authUser: User | null) => void) {
  return _onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(firebaseAuth, provider);
    if (!result?.user) throw new Error("Google sign in failed");

    const user = result.user;
    const uid = user.uid;

    const userDocRef = doc(firebaseFirestore, "users", uid);
    const snapshot = await getDoc(userDocRef);

    const payload = {
      uid,
      email: user.email ?? null,
      username: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      provider: "google",
      lastLoginAt: serverTimestamp(),
    };

    if (snapshot.exists()) {
      await setDoc(userDocRef, payload, { merge: true });
    } else {
      await setDoc(userDocRef, { ...payload, roles: null, createdAt: serverTimestamp() }, { merge: true });
    }

    return uid;
  } catch (error: any) {
    console.error("Error signing in with Google:", error?.code, error?.message);
    throw error; // biar UI bisa menampilkan error code
  }
}

export async function signOutWithGoogle() {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    console.error("Error signing out with Google", error);
    throw error;
  }
}

export async function getUserRoles(uid: string) {
  try {
    const snap = await getDoc(doc(firebaseFirestore, "users", uid));
    return snap.exists() ? snap.data()?.roles ?? null : null;
  } catch (error) {
    console.error("Error getting user roles", error);
    return null;
  }
}
