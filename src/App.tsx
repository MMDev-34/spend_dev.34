import React, { useEffect } from "react";
import { RouterProvider, useRouter } from "@/app/router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { TransactionsPage } from "@/pages/Transactions/TransactionsPage";
import { OverviewPage } from "@/pages/Overview/OverviewPage";
import { PlanPage } from "@/pages/Plan/PlanPage";
import { BorrowLendPage } from "@/pages/BorrowLend/BorrowLendPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { ProfilePage } from "@/pages/Profile/ProfilePage";
import { AccountSettingsPage } from "@/pages/AccountSettings/AccountSettingsPage";
import { NotificationsPage } from "@/pages/Notifications/NotificationsPage";
import { AuthPage } from "@/pages/Auth/AuthPage";
import { RealisticCoin } from "@/components/common/RealisticCoin";

import { useAppStore } from "@/stores/appStore";

function AppContent() {
  const { route, navigate } = useRouter();
  const { user, loading, isEmailVerified } = useAuth();
  const defaultStartRoute = useAppStore((s) => s.settings.defaultStartRoute);

  // Initial mount route redirection if custom defaultStartRoute is set and app opens at "/"
  useEffect(() => {
    if (defaultStartRoute && defaultStartRoute !== "/" && route === "/") {
      navigate(defaultStartRoute as any);
    }
  }, []);

  // If user is logged in & email verified, redirect away from /auth, /login, /signup
  useEffect(() => {
    if (user && isEmailVerified && (route === "/auth" || route === "/login" || route === "/signup")) {
      navigate((defaultStartRoute as any) || "/");
    }
  }, [user, isEmailVerified, route, navigate, defaultStartRoute]);

  // 1. Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-[#F5F5F5] select-none">
        <div className="relative flex items-center justify-center mb-5">
          <RealisticCoin size={58} speed={3.6} tiltX={15} />
        </div>
        <div className="text-sm font-semibold tracking-wide text-[#F5F5F5]">Spend Vault</div>
        <div className="text-xs text-[#71717A] mt-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Authenticating secure session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated or Unverified Gate: Direct to proper Sign Up & Log In page
  if (!user || !isEmailVerified) {
    return <AuthPage />;
  }

  // 3. Authenticated Dashboard Access

  // 4. Authenticated & Verified Dashboard Access
  const renderCurrentPage = () => {
    switch (route) {
      case "/":
        return <DashboardPage />;
      case "/transactions":
        return <TransactionsPage />;
      case "/plans":
        return <PlanPage />;
      case "/overview":
        return <OverviewPage />;
      case "/borrow-lend":
        return <BorrowLendPage />;
      case "/settings":
        return <SettingsPage />;
      case "/profile":
        return <ProfilePage />;
      case "/account-settings":
        return <AccountSettingsPage />;
      case "/notifications":
        return <NotificationsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppLayout>{renderCurrentPage()}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}
