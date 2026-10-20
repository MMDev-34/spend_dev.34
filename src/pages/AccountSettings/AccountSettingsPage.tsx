import React, { useState } from "react";
import { useRouter } from "@/app/router";
import { useAuth } from "@/context/AuthContext";
import { useUIStore } from "@/stores/uiStore";
import { 
  getLocalUserProfile, 
  saveUserProfile, 
  requestPasswordReset, 
  changeUserPassword,
  deleteCurrentUserAccount, 
  getConnectedDeviceInfo 
} from "@/utils/userProfile";
import { 
  ArrowLeft, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Smartphone, 
  Trash2, 
  ChevronRight, 
  Edit2, 
  Check, 
  X, 
  AlertTriangle,
  Send,
  Laptop,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock
} from "lucide-react";

export const AccountSettingsPage: React.FC = () => {
  const { navigate } = useRouter();
  const { user, signOut } = useAuth();
  const showToast = useUIStore((s) => s.showToast);

  const [profile, setProfile] = useState(() => getLocalUserProfile(user?.uid));
  const deviceInfo = getConnectedDeviceInfo();

  // Dialog States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  
  // Password Change & Reset States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"change" | "forgot">("change");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [twoStepEnabled, setTwoStepEnabled] = useState(() => {
    try {
      return localStorage.getItem("spend_two_step_auth") === "true";
    } catch {
      return false;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleToggleTwoStep = () => {
    const nextVal = !twoStepEnabled;
    setTwoStepEnabled(nextVal);
    try {
      localStorage.setItem("spend_two_step_auth", String(nextVal));
    } catch {}
    showToast(
      nextVal ? "Two-step verification activated" : "Two-step verification deactivated",
      "info"
    );
  };

  const handleOpenPasswordModal = () => {
    setPasswordMode("change");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
    setResetEmailSent(false);
    setIsPasswordModalOpen(true);
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setIsLoading(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      showToast("Password updated successfully!", "success");
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = profile.email || user?.email;
    if (!targetEmail) {
      showToast("No email associated with this account", "error");
      return;
    }

    setIsLoading(true);
    setPasswordError(null);
    try {
      await requestPasswordReset(targetEmail);
      setResetEmailSent(true);
      showToast(`Password reset link sent to ${targetEmail}`, "success");
    } catch (err: any) {
      setPasswordError(err.message || "Could not send reset email");
      showToast(err.message || "Could not send reset email", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await saveUserProfile({ email: newEmail.trim() }, user?.uid);
      setProfile(updated);
      showToast("Email address updated", "success");
      setIsEmailModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Failed to update email", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      showToast("Please type DELETE to confirm", "error");
      return;
    }

    setIsLoading(true);
    try {
      await deleteCurrentUserAccount();
      showToast("Your account has been deleted", "info");
      setIsDeleteModalOpen(false);
      navigate("/");
    } catch (err: any) {
      // In Firebase, deleteUser requires recent login; if that happens, sign out
      if (err.code === "auth/requires-recent-login") {
        showToast("Please re-authenticate before deleting your account", "error");
        await signOut();
        navigate("/");
      } else {
        showToast(err.message || "Failed to delete account", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200 pb-12">
      {/* 1. Header with Back Navigation */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="p-2 -ml-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Account settings
          </h1>
        </div>
      </div>

      {/* 2. Security & Credentials List (Matching Reference Screen 5) */}
      <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#262626] overflow-hidden shadow-sm">
        {/* Login Email Row */}
        <div
          onClick={() => {
            setNewEmail(profile.email || user?.email || "");
            setIsEmailModalOpen(true);
          }}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5 min-w-0 pr-3">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Login email
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#F5F5F5] truncate font-mono-num group-hover:text-emerald-400 transition-colors">
                {profile.email || user?.email || "Not set"}
              </span>
              {user?.emailVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                  Verified
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-[#71717A] group-hover:text-[#F5F5F5] group-hover:bg-[#222222] transition shrink-0"
            aria-label="Edit email"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Password Row */}
        <div
          onClick={handleOpenPasswordModal}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Password
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5] tracking-widest font-mono group-hover:text-emerald-400 transition-colors">
              ••••••••••••
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-[#71717A] group-hover:text-[#F5F5F5] group-hover:bg-[#222222] transition"
            aria-label="Change password"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Two-step Verification Row */}
        <div className="flex items-center justify-between p-4 sm:p-4.5">
          <div className="space-y-0.5 pr-3">
            <span className="text-sm font-semibold text-[#F5F5F5] block">
              Two step verification
            </span>
            <span className="text-xs text-[#71717A] block">
              Extra security layer for signing in and account recovery
            </span>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleTwoStep}
            className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              twoStepEnabled ? "bg-emerald-500" : "bg-[#2A2A2A]"
            }`}
            aria-pressed={twoStepEnabled}
          >
            <span
              className={`absolute top-1 left-1 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                twoStepEnabled ? "translate-x-5.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Connected Devices Row */}
        <div
          onClick={() => setIsDeviceModalOpen(true)}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-[#F5F5F5] group-hover:text-cyan-400 transition-colors">
              Connected devices
            </span>
            <span className="text-xs text-[#71717A] font-mono-num">
              1 device active
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#71717A] group-hover:text-[#F5F5F5]">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Delete Account Section (Matching Reference Screen 5 bottom) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-rose-400">
            Delete my account
          </h3>
          <p className="text-xs text-[#71717A]">
            Permanently remove your account, transactions, and preferences
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition active:scale-95 shrink-0 cursor-pointer"
        >
          Delete
        </button>
      </div>

      {/* Edit Email Modal */}
      {isEmailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsEmailModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/70">
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Change Login Email
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA]">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-mono-num transition"
                />
              </div>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Updating your login email will change your sign-in address. A verification link will be sent to confirm ownership.
              </p>
            </div>

            <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateEmail}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isLoading ? "Saving..." : "Save Email"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset / Change Modal */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsPasswordModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/70">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  passwordMode === "change" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                }`}>
                  {passwordMode === "change" ? <KeyRound className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-[#F5F5F5]">
                  {passwordMode === "change" ? "Change Password" : "Reset Forgotten Password"}
                </h3>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            {passwordMode === "change" ? (
              <form onSubmit={handleUpdatePassword} className="p-5 space-y-4">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="leading-snug">{passwordError}</p>
                      {passwordError.toLowerCase().includes("current password") && (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordMode("forgot");
                            setPasswordError(null);
                          }}
                          className="text-[11px] underline font-semibold text-rose-300 hover:text-white block pt-0.5"
                        >
                          Forgot your password? Send reset email
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Current Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordMode("forgot");
                        setPasswordError(null);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-semibold transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoFocus
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] hover:text-[#F5F5F5] transition cursor-pointer"
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      New Password
                    </label>
                    <span className="text-[10px] text-[#71717A] font-mono-num">
                      Min. 6 chars
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] hover:text-[#F5F5F5] transition cursor-pointer"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Confirm New Password
                    </label>
                    {confirmNewPassword && (
                      <span className={`text-[10px] font-semibold ${
                        newPassword === confirmNewPassword ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {newPassword === confirmNewPassword ? "Match" : "No match"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] hover:text-[#F5F5F5] transition cursor-pointer"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !currentPassword || !newPassword || !confirmNewPassword}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isLoading ? "Updating..." : "Set New Password"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-4">
                {resetEmailSent ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#F5F5F5]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Password Reset Email Sent!</span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      We sent a secure password reset link to <strong className="text-white font-mono-num">{profile.email || user?.email}</strong>. Open the link to create a new password without needing your current one.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3.5 rounded-xl bg-[#181818] border border-[#282828] space-y-1">
                      <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                        Reset Link Recipient
                      </span>
                      <span className="text-xs font-bold text-[#F5F5F5] font-mono-num truncate block">
                        {profile.email || user?.email}
                      </span>
                    </div>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Don't remember your current password? We'll send an official Firebase reset link directly to your inbox so you can set a new password securely.
                    </p>
                  </>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode("change");
                      setPasswordError(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
                  >
                    Back to Enter Password
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isLoading ? "Sending..." : resetEmailSent ? "Resend Link" : "Send Reset Email"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected Devices Modal */}
      {isDeviceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsDeviceModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/70">
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Connected Devices
              </h3>
              <button
                onClick={() => setIsDeviceModalOpen(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3.5 rounded-xl bg-[#181818] border border-[#2E2E2E] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center text-emerald-400">
                    {deviceInfo.deviceType === "mobile" ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F5F5F5]">
                        {deviceInfo.browser} on {deviceInfo.os}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        This device
                      </span>
                    </div>
                    <span className="text-[11px] text-[#71717A] block font-mono-num">
                      {deviceInfo.lastActive}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDeviceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsDeleteModalOpen(false)}
          role="alertdialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-rose-500/10">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">
                  Delete Account Permanently?
                </h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                This action <span className="text-rose-400 font-bold">cannot be undone</span>. All your logged transactions, recurring bills, budget targets, and personal financial data will be permanently wiped.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#71717A]">
                  Type <span className="text-rose-400 font-mono font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-rose-500 font-mono font-bold transition"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isLoading || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isLoading ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
