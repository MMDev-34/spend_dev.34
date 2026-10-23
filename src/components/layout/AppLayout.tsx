import React from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingAddButton } from "@/components/navigation/FloatingAddButton";
import { TopBar } from "@/components/navigation/TopBar";
import { Toast } from "@/components/common/Toast";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { FirestoreRulesBanner } from "@/components/common/FirestoreRulesBanner";
import { AddPaymentModal } from "@/components/transaction/AddPaymentModal";
import { WebhookInboxModal } from "@/components/inbox/WebhookInboxModal";
import { ProfileModal } from "@/components/navigation/ProfileModal";
import { HelpModal } from "@/components/navigation/HelpModal";
import { LogoutModal } from "@/components/navigation/LogoutModal";
import { useInboxPolling } from "@/hooks/useInboxPolling";
import { useUIStore } from "@/stores/uiStore";
import { useRouter } from "@/app/router";
import { useAuth } from "@/context/AuthContext";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useInboxPolling();
  const { navigate } = useRouter();
  const { user, signOut } = useAuth();

  const userName = useUIStore((s) => s.userName);
  const setUserName = useUIStore((s) => s.setUserName);
  const isProfileModalOpen = useUIStore((s) => s.isProfileModalOpen);
  const closeProfileModal = useUIStore((s) => s.closeProfileModal);
  const isHelpModalOpen = useUIStore((s) => s.isHelpModalOpen);
  const closeHelpModal = useUIStore((s) => s.closeHelpModal);
  const isLogoutModalOpen = useUIStore((s) => s.isLogoutModalOpen);
  const closeLogoutModal = useUIStore((s) => s.closeLogoutModal);
  const hasFirestorePermissionError = useUIStore((s) => s.hasFirestorePermissionError);
  const dismissFirestorePermissionError = useUIStore((s) => s.dismissFirestorePermissionError);

  const userEmail = user?.email || "Guest Mode (Local)";

  const handleConfirmLogout = async () => {
    closeLogoutModal();
    if (user) {
      await signOut();
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col md:flex-row antialiased selection:bg-neutral-800">
      {/* Offline Status Bar */}
      <OfflineIndicator />

      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <TopBar />
        
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          {hasFirestorePermissionError && (
            <div className="mb-4">
              <FirestoreRulesBanner onDismiss={dismissFirestorePermissionError} />
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile Floating Add Button */}
      <FloatingAddButton />

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* New Payment / Transaction Popup (Custom Keypad & Date Strip) */}
      <AddPaymentModal />

      {/* Webhook Inbox Modal */}
      <WebhookInboxModal />

      {/* User Profile Details Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
        userName={userName}
        userEmail={userEmail}
        onUpdateUserName={setUserName}
      />

      {/* Help & Support Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={closeHelpModal}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
        onConfirmLogout={handleConfirmLogout}
        userEmail={userEmail}
      />

      {/* Toast Feedback */}
      <Toast />
    </div>
  );
};
