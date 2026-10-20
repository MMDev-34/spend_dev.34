import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  auth,
  signInWithGoogle,
  handleRedirectAuthResult,
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  resendVerificationEmail,
  checkEmailVerified,
  signOutUser,
  testConnection,
  syncUserProfileDocument,
} from "@/lib/firebase";
import { subscribeToUserCloudData, syncSettingsToCloud } from "@/lib/firebaseSync";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_BUDGETS,
  DEFAULT_RECURRING,
  DEFAULT_PLANNED_EXPENSES,
  DEFAULT_SETTINGS,
} from "@/lib/constants";
import {
  deduplicateCategoryList,
  analyzeAndCleanupDuplicateCategories,
} from "@/utils/categoryDeduplication";

export type CloudSyncStatus = "synced" | "syncing" | "offline";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isEmailVerified: boolean;
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: Date | null;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isEmailVerified: false,
  cloudSyncStatus: "synced",
  lastSyncedAt: null,
  signInWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  sendPasswordReset: async () => {},
  resendVerification: async () => {},
  refreshVerificationStatus: async () => false,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>("synced");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const setUserName = useUIStore((s) => s.setUserName);
  const showToast = useUIStore((s) => s.showToast);

  // Validate Firestore connection & capture any mobile redirect sign-in results on boot
  useEffect(() => {
    testConnection();

    handleRedirectAuthResult()
      .then((redirectedUser) => {
        if (redirectedUser) {
          setUser(redirectedUser);
          setIsEmailVerified(redirectedUser.emailVerified);
          showToast(`Welcome back, ${redirectedUser.displayName || "User"}!`, "success");
        }
      })
      .catch((err) => {
        if (err?.code === "auth/unauthorized-domain") {
          showToast("Google Sign-In: Preview domain not yet authorized in Firebase Console.", "error");
        } else if (err?.code !== "auth/popup-closed-by-user") {
          showToast(err?.message || "Sign-in error after redirect", "error");
        }
      });
  }, [showToast]);

  useEffect(() => {
    let unsubscribeCloud: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (unsubscribeCloud) {
        unsubscribeCloud();
        unsubscribeCloud = null;
      }

      if (currentUser) {
        const verified = currentUser.emailVerified;
        setIsEmailVerified(verified);

        const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
        setUserName(displayName);

        // Only activate cloud database and sync if the user's email is verified!
        if (verified) {
          setCloudSyncStatus("syncing");
          // Ensure profile document is registered in Firestore
          syncUserProfileDocument(currentUser);
          // 1. Immediately switch the app store scope strictly to this user
          useAppStore.getState().loadUserScope(currentUser.uid);

          try {
            // 2. Subscribe to real-time cloud data strictly for currentUser.uid
            unsubscribeCloud = subscribeToUserCloudData(currentUser.uid, {
              onTransactionsUpdate: (cloudTxs) => {
                useAppStore.setState({ transactions: cloudTxs });
                setCloudSyncStatus("synced");
                setLastSyncedAt(new Date());
              },
              onCategoriesUpdate: (cloudCats) => {
                const defaults = DEFAULT_CATEGORIES.filter((c) => c.isDefault);
                const { uniqueList, duplicates } = deduplicateCategoryList([
                  ...defaults,
                  ...cloudCats,
                ]);
                useAppStore.setState({ categories: uniqueList });

                // If duplicates are detected in cloud categories, trigger background cleanup
                if (duplicates.length > 0 && currentUser?.uid) {
                  analyzeAndCleanupDuplicateCategories(currentUser.uid).catch((err) =>
                    console.warn("Background category cleanup:", err)
                  );
                }
              },
              onPeopleUpdate: (cloudPeople) => {
                useAppStore.setState({ people: cloudPeople });
              },
              onLoansUpdate: (cloudLoans) => {
                useAppStore.setState({ loans: cloudLoans });
              },
              onBudgetsUpdate: (cloudBudgets) => {
                useAppStore.setState({ categoryBudgets: cloudBudgets });
              },
              onRecurringUpdate: (cloudRec) => {
                useAppStore.setState({ recurringExpenses: cloudRec });
              },
              onPlannedUpdate: (cloudPlans) => {
                useAppStore.setState({ plannedExpenses: cloudPlans });
              },
              onSettingsUpdate: (cloudSettings) => {
                useAppStore.setState((current) => ({
                  settings: {
                    ...DEFAULT_SETTINGS,
                    ...current.settings,
                    ...(cloudSettings || {}),
                  },
                }));
              },
            });

            setCloudSyncStatus("synced");
            setLastSyncedAt(new Date());
          } catch (err) {
            console.error("Cloud synchronization error:", err);
            setCloudSyncStatus("offline");
          }
        } else {
          // Unverified user - isolate and prevent access
          useAppStore.getState().loadUserScope(null);
        }
      } else {
        // No authenticated user
        setIsEmailVerified(false);
        setUserName("");
        useAppStore.getState().loadUserScope(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCloud) {
        unsubscribeCloud();
      }
    };
  }, [setUserName]);

  const handleGoogleSignIn = async () => {
    try {
      setCloudSyncStatus("syncing");
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        setIsEmailVerified(loggedInUser.emailVerified);
        showToast(`Welcome back, ${loggedInUser.displayName || "User"}!`, "success");
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        showToast(err.message || "Sign-in failed. Please try again.", "error");
      }
      throw err;
    }
  };

  const handleEmailSignUp = async (email: string, pass: string, displayName: string) => {
    try {
      useAppStore.getState().loadUserScope(null);
      const newUser = await signUpWithEmail(email, pass, displayName);
      setIsEmailVerified(newUser.emailVerified);
      showToast("Account created! Please verify your email.", "info");
    } catch (err: any) {
      throw err;
    }
  };

  const handleEmailSignIn = async (email: string, pass: string) => {
    try {
      useAppStore.getState().loadUserScope(null);
      const loggedInUser = await signInWithEmail(email, pass);
      setIsEmailVerified(loggedInUser.emailVerified);
      if (loggedInUser.emailVerified) {
        showToast(`Welcome back, ${loggedInUser.displayName || "User"}!`, "success");
      } else {
        showToast("Please verify your email before continuing.", "info");
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await sendPasswordReset(email);
      showToast("Password reset link sent to your email", "info");
    } catch (err: any) {
      throw err;
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) throw new Error("No user is signed in.");
    try {
      await resendVerificationEmail(auth.currentUser);
      showToast("Verification email sent! Check your inbox and spam folder.", "success");
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        showToast("Too many requests. Please wait a moment before trying again.", "error");
      } else {
        showToast(err.message || "Failed to resend verification email.", "error");
      }
      throw err;
    }
  };

  const handleRefreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const verified = await checkEmailVerified(auth.currentUser);
    setIsEmailVerified(verified);
    if (verified) {
      showToast("Email verified successfully! Welcome to Spend.", "success");
      // Trigger user data loading
      useAppStore.getState().loadUserScope(auth.currentUser.uid);
    } else {
      showToast("Email not yet verified. Please click the link in your inbox.", "info");
    }
    return verified;
  }, [showToast]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setIsEmailVerified(false);
      useAppStore.getState().loadUserScope(null);
      showToast("Signed out successfully", "info");
    } catch (err) {
      showToast("Failed to sign out", "error");
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isEmailVerified,
      cloudSyncStatus,
      lastSyncedAt,
      signInWithGoogle: handleGoogleSignIn,
      signUpWithEmail: handleEmailSignUp,
      signInWithEmail: handleEmailSignIn,
      sendPasswordReset: handlePasswordReset,
      resendVerification: handleResendVerification,
      refreshVerificationStatus: handleRefreshVerificationStatus,
      signOut: handleSignOut,
    }),
    [user, loading, isEmailVerified, cloudSyncStatus, lastSyncedAt, handleRefreshVerificationStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
