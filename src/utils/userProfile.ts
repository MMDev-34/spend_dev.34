import { auth, db } from "@/lib/firebase";
import { 
  updateProfile, 
  sendPasswordResetEmail, 
  deleteUser, 
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfileData, ConnectedDeviceInfo } from "@/types/user";
import { useUIStore } from "@/stores/uiStore";

const DEFAULT_PROFILE_KEY = "spend_user_profile";

export function getProfileStorageKey(userId?: string): string {
  if (userId) return `${DEFAULT_PROFILE_KEY}_${userId}`;
  const currentUid = auth.currentUser?.uid;
  if (currentUid) return `${DEFAULT_PROFILE_KEY}_${currentUid}`;
  return DEFAULT_PROFILE_KEY;
}

export function getLocalUserProfile(userId?: string): UserProfileData {
  const currentUser = auth.currentUser;
  const fallbackName = typeof window !== "undefined" ? localStorage.getItem("spend_user_name") || "User" : "User";
  const defaultData: UserProfileData = {
    displayName: currentUser?.displayName || fallbackName,
    email: currentUser?.email || "user@example.com",
    phone: "",
    dateOfBirth: "",
    gender: "",
    photoURL: currentUser?.photoURL || "",
  };

  if (typeof window === "undefined") return defaultData;

  try {
    const key = getProfileStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultData,
        ...parsed,
        // Always prefer live Firebase user info if present
        email: currentUser?.email || parsed.email || defaultData.email,
        displayName: parsed.displayName || currentUser?.displayName || fallbackName,
        photoURL: parsed.photoURL || currentUser?.photoURL || "",
      };
    }
  } catch (e) {
    console.warn("Error reading local user profile:", e);
  }

  return defaultData;
}

export async function fetchRemoteUserProfile(user: FirebaseUser): Promise<UserProfileData> {
  const local = getLocalUserProfile(user.uid);
  try {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const merged: UserProfileData = {
        ...local,
        displayName: data.displayName || local.displayName,
        email: data.email || user.email || local.email,
        photoURL: data.photoURL || local.photoURL || "",
        phone: data.phone || local.phone || "",
        dateOfBirth: data.dateOfBirth || local.dateOfBirth || "",
        gender: data.gender || local.gender || "",
        updatedAt: data.updatedAt || local.updatedAt,
      };
      // Cache locally
      localStorage.setItem(getProfileStorageKey(user.uid), JSON.stringify(merged));
      return merged;
    }
  } catch (e) {
    console.warn("Could not fetch remote user profile, using local:", e);
  }
  return local;
}

export async function saveUserProfile(
  updates: Partial<UserProfileData>,
  userId?: string
): Promise<UserProfileData> {
  const current = getLocalUserProfile(userId);
  const now = new Date().toISOString();
  const updated: UserProfileData = {
    ...current,
    ...updates,
    updatedAt: now,
  };

  const key = getProfileStorageKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
    if (updated.displayName) {
      localStorage.setItem("spend_user_name", updated.displayName);
      useUIStore.getState().setUserName(updated.displayName);
    }
  } catch (e) {
    console.warn("Failed to write profile to localStorage:", e);
  }

  // Sync to Firebase Auth if logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
    if (updates.displayName !== undefined) authProfileUpdates.displayName = updates.displayName.trim();
    if (updates.photoURL !== undefined) authProfileUpdates.photoURL = updates.photoURL;

    if (Object.keys(authProfileUpdates).length > 0) {
      try {
        await updateProfile(currentUser, authProfileUpdates);
      } catch (authErr) {
        console.warn("Could not update Firebase Auth profile:", authErr);
      }
    }

    // Try syncing to Firestore users collection
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userDocRef,
        {
          id: currentUser.uid,
          email: currentUser.email || updated.email,
          displayName: updated.displayName,
          photoURL: updated.photoURL || "",
          phone: updated.phone || "",
          dateOfBirth: updated.dateOfBirth || "",
          gender: updated.gender || "",
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn("Could not save profile in Firestore (stored locally):", fsErr);
    }
  }

  return updated;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email || !email.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user account found.");
  }
  if (!currentPassword) {
    throw new Error("Please enter your current password.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long.");
  }

  // 1. Re-authenticate with current credentials
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (error: any) {
    if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential" || error?.code === "auth/invalid-login-credentials") {
      throw new Error("Incorrect current password. If you don't remember it, please use the 'Forgot Password?' option below.");
    }
    if (error?.code === "auth/too-many-requests") {
      throw new Error("Too many unsuccessful attempts. Please try again later or reset your password via email.");
    }
    throw new Error(error?.message || "Failed to verify current password.");
  }

  // 2. Set new password
  await updatePassword(user, newPassword);
}

export async function deleteCurrentUserAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No active user session to delete.");
  }

  // Clear local profile & store
  try {
    localStorage.removeItem(getProfileStorageKey(user.uid));
    localStorage.removeItem("spend_user_name");
  } catch {}

  await deleteUser(user);
}

export function getConnectedDeviceInfo(): ConnectedDeviceInfo {
  if (typeof window === "undefined") {
    return {
      id: "device-current",
      deviceType: "desktop",
      browser: "Chrome",
      os: "Web",
      lastActive: "Just now",
      isCurrent: true,
    };
  }

  const ua = navigator.userAgent;
  let deviceType: "mobile" | "desktop" | "tablet" = "desktop";
  if (/iPad|Tablet/i.test(ua)) deviceType = "tablet";
  else if (/Mobi|Android|iPhone/i.test(ua)) deviceType = "mobile";

  let browser = "Web Browser";
  if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";

  let os = "Desktop";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";

  return {
    id: "device-current",
    deviceType,
    browser,
    os,
    lastActive: "Active now",
    isCurrent: true,
  };
}
