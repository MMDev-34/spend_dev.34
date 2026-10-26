import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer, setDoc, getDoc } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import firebaseConfig from "../../firebase-applet-config.json";
import { useUIStore } from "@/stores/uiStore";

// Initialize Firebase with fallback to env key if config has placeholder
const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
const effectiveApiKey =
  envApiKey && !envApiKey.includes("Dummy")
    ? envApiKey
    : firebaseConfig.apiKey;

export const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: effectiveApiKey,
};

export const app = initializeApp(resolvedFirebaseConfig);

// Database initialization
// If firestoreDatabaseId is set and is NOT "(default)", pass it, otherwise connect to default database in spend-d4b10
export const db =
  (resolvedFirebaseConfig as any).firestoreDatabaseId &&
  (resolvedFirebaseConfig as any).firestoreDatabaseId !== "(default)" &&
  !(resolvedFirebaseConfig as any).firestoreDatabaseId.startsWith("ai-studio-")
    ? getFirestore(app, (resolvedFirebaseConfig as any).firestoreDatabaseId)
    : getFirestore(app);

// Realtime Database connection for spend-d4b10
export const rtdb = (resolvedFirebaseConfig as any).databaseURL
  ? getDatabase(app, (resolvedFirebaseConfig as any).databaseURL)
  : getDatabase(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Infrastructure
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function logFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isPermissionIssue =
    errMsg.toLowerCase().includes("permission") || (error as any)?.code === "permission-denied";
  if (isPermissionIssue) {
    try {
      useUIStore.getState().setFirestorePermissionError(true);
    } catch {}
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Error: ", JSON.stringify(errInfo));
  return errInfo;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = logFirestoreError(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection check: Client establishing connection in background.");
    }
  }
}

// Save or update user profile document in Firestore
export async function syncUserProfileDocument(user: FirebaseUser, displayNameOverride?: string) {
  try {
    const userRef = doc(db, "users", user.uid);
    const now = new Date().toISOString();
    const resolvedName =
      displayNameOverride || user.displayName || user.email?.split("@")[0] || "User";

    await setDoc(
      userRef,
      {
        id: user.uid,
        email: user.email || "",
        displayName: resolvedName,
        photoURL: user.photoURL || "",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Could not save profile in Firestore:", e);
  }
}

// Auth actions: Google Sign-In with robust mobile and popup fallback
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  const isMobile =
    typeof window !== "undefined" &&
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768);

  try {
    // Attempt popup first (standard for desktop, clean if permitted)
    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user) {
      await syncUserProfileDocument(result.user);
      return result.user;
    }
    return null;
  } catch (error: any) {
    // If popup was blocked or failed due to mobile browser limitations, fall back seamlessly to redirect
    if (
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/cancelled-popup-request" ||
      (isMobile && (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/internal-error"))
    ) {
      console.info("Mobile popup blocked or closed. Falling back to signInWithRedirect...");
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("spend_google_redirect_active", "true");
        }
        await signInWithRedirect(auth, googleProvider);
        return null; // Browser is navigating away
      } catch (redirectErr) {
        console.error("Redirect fallback error:", redirectErr);
        throw redirectErr;
      }
    }

    if (error?.code === "auth/unauthorized-domain") {
      console.warn("Google Sign-In: Unauthorized domain in Firebase project settings.", error.message);
    } else if (error?.code !== "auth/popup-closed-by-user") {
      console.error("Google Sign-In Error:", error);
    }
    throw error;
  }
}

// Check and handle redirect results when page reloads after signInWithRedirect
export async function handleRedirectAuthResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("spend_google_redirect_active");
    }
    if (result && result.user) {
      await syncUserProfileDocument(result.user);
      return result.user;
    }
  } catch (error: any) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("spend_google_redirect_active");
    }
    console.warn("getRedirectResult warning/error:", error);
    throw error;
  }
  return null;
}

// Auth actions: Email & Password Sign-Up (Sends email verification automatically)
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<FirebaseUser> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = credential.user;

    // Update Firebase Auth profile
    if (displayName.trim()) {
      await updateProfile(user, { displayName: displayName.trim() });
    }

    // Immediately send email verification
    try {
      await sendEmailVerification(user);
    } catch (verErr) {
      console.warn("Failed to send verification email automatically:", verErr);
    }

    // Save profile to Firestore
    await syncUserProfileDocument(user, displayName.trim());
    return user;
  } catch (error) {
    console.error("Email Sign-Up Error:", error);
    throw error;
  }
}

// Resend verification email
export async function resendVerificationEmail(user: FirebaseUser): Promise<void> {
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Resend Verification Error:", error);
    throw error;
  }
}

// Reload current user to check if email was verified
export async function checkEmailVerified(user: FirebaseUser): Promise<boolean> {
  try {
    await user.reload();
    return auth.currentUser?.emailVerified ?? false;
  } catch (error) {
    console.error("Check email verified reload error:", error);
    return false;
  }
}

// Auth actions: Email & Password Log-In
export async function signInWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await syncUserProfileDocument(credential.user);
    return credential.user;
  } catch (error) {
    console.error("Email Sign-In Error:", error);
    throw error;
  }
}

// Auth actions: Password Reset
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    console.error("Password Reset Error:", error);
    throw error;
  }
}

// Sign-Out
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out Error:", error);
    throw error;
  }
}
