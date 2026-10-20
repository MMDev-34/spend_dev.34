import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "@/app/router";
import { useAuth } from "@/context/AuthContext";
import { useUIStore } from "@/stores/uiStore";
import { 
  getLocalUserProfile, 
  saveUserProfile, 
  fetchRemoteUserProfile 
} from "@/utils/userProfile";
import { UserProfileData } from "@/types/user";
import { 
  ArrowLeft, 
  Camera, 
  Edit2, 
  User, 
  Calendar, 
  Phone, 
  UserCheck, 
  ShieldCheck, 
  ChevronRight, 
  X, 
  Check, 
  Upload,
  Sparkles
} from "lucide-react";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
];

export const ProfilePage: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const showToast = useUIStore((s) => s.showToast);

  const [profile, setProfile] = useState<UserProfileData>(() => getLocalUserProfile(user?.uid));
  const [activeEditField, setActiveEditField] = useState<"name" | "dob" | "phone" | "gender" | "avatar" | null>(null);

  // Field Edit Form State
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<UserProfileData["gender"]>("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and refresh remote profile if available
  useEffect(() => {
    if (user) {
      fetchRemoteUserProfile(user).then((remoteData) => {
        setProfile(remoteData);
      });
    }
  }, [user]);

  const handleOpenEdit = (field: "name" | "dob" | "phone" | "gender" | "avatar") => {
    setActiveEditField(field);
    if (field === "name") setEditName(profile.displayName || "");
    if (field === "dob") setEditDob(profile.dateOfBirth || "");
    if (field === "phone") setEditPhone(profile.phone || "");
    if (field === "gender") setEditGender(profile.gender || "");
    if (field === "avatar") setEditAvatarUrl(profile.photoURL || "");
  };

  const handleSaveField = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<UserProfileData> = {};
      if (activeEditField === "name") {
        if (!editName.trim()) throw new Error("Name cannot be empty");
        updates.displayName = editName.trim();
      } else if (activeEditField === "dob") {
        updates.dateOfBirth = editDob;
      } else if (activeEditField === "phone") {
        updates.phone = editPhone.trim();
      } else if (activeEditField === "gender") {
        updates.gender = editGender;
      } else if (activeEditField === "avatar") {
        updates.photoURL = editAvatarUrl.trim();
      }

      const updated = await saveUserProfile(updates, user?.uid);
      setProfile(updated);
      showToast("Profile updated successfully", "success");
      setActiveEditField(null);
    } catch (err: any) {
      showToast(err.message || "Failed to save profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be under 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setEditAvatarUrl(base64);
      try {
        const updated = await saveUserProfile({ photoURL: base64 }, user?.uid);
        setProfile(updated);
        showToast("Profile picture updated", "success");
        if (activeEditField === "avatar") setActiveEditField(null);
      } catch (err) {
        showToast("Could not save picture", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const formatDisplayDob = (dobStr?: string) => {
    if (!dobStr) return "Not set";
    const parts = dobStr.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
    return dobStr;
  };

  const formatDisplayGender = (gender?: string) => {
    if (!gender) return "Not set";
    if (gender === "male") return "Male";
    if (gender === "female") return "Female";
    if (gender === "other") return "Other";
    if (gender === "prefer_not_to_say") return "Prefer not to say";
    return gender;
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200 pb-12">
      {/* 1. Header with Back Button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 -ml-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer"
            aria-label="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Profile
          </h1>
        </div>
      </div>

      {/* 2. Top Profile Avatar Hero */}
      <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col items-center justify-center text-center space-y-4 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#333333] bg-[#1C1C1C] flex items-center justify-center shadow-lg shadow-black/40">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName || "Profile avatar"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-neutral-800 to-neutral-700 text-[#F5F5F5] text-3xl font-bold font-mono">
                {profile.displayName?.slice(0, 2).toUpperCase() || "SV"}
              </div>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            title="Upload photo"
            aria-label="Change photo"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#F5F5F5]">
            {profile.displayName || "User"}
          </h2>
          <p className="text-xs text-[#71717A] font-mono-num">
            {profile.email || user?.email || "No email linked"}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleOpenEdit("avatar")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#F5F5F5] border border-[#333333] transition cursor-pointer active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add image</span>
          </button>
        </div>
      </div>

      {/* 3. Detailed Profile Fields (Matching Reference Screen 3) */}
      <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#262626] overflow-hidden shadow-sm">
        {/* Name Row */}
        <div
          onClick={() => handleOpenEdit("name")}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Name
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5] group-hover:text-emerald-400 transition-colors">
              {profile.displayName || "Not set"}
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-[#71717A] group-hover:text-[#F5F5F5] group-hover:bg-[#222222] transition"
            aria-label="Edit name"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Date of Birth Row */}
        <div
          onClick={() => handleOpenEdit("dob")}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Date of birth
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5] font-mono-num group-hover:text-emerald-400 transition-colors">
              {formatDisplayDob(profile.dateOfBirth)}
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-[#71717A] group-hover:text-[#F5F5F5] group-hover:bg-[#222222] transition"
            aria-label="Edit date of birth"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Phone Row */}
        <div
          onClick={() => handleOpenEdit("phone")}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Phone
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5] font-mono-num group-hover:text-emerald-400 transition-colors">
              {profile.phone || "Not set"}
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-[#71717A] group-hover:text-[#F5F5F5] group-hover:bg-[#222222] transition"
            aria-label="Edit phone"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Gender Row */}
        <div
          onClick={() => handleOpenEdit("gender")}
          className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-neutral-800/30 transition cursor-pointer group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Gender
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5] group-hover:text-emerald-400 transition-colors">
              {formatDisplayGender(profile.gender)}
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-[#71717A] group-hover:text-[#F5F5F5] group-hover:bg-[#222222] transition"
            aria-label="Edit gender"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Shortcut Link to Account Settings (Matching Reference Screen 3 bottom) */}
      <div
        onClick={() => navigate("/account-settings")}
        className="p-4 sm:p-5 rounded-2xl bg-[#141414] hover:bg-[#181818] border border-[#262626] hover:border-[#383838] transition cursor-pointer flex items-center justify-between gap-4 group shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#F5F5F5] group-hover:text-cyan-400 transition-colors">
              Account settings
            </h3>
            <p className="text-xs text-[#71717A] truncate">
              A shortcut link to change login, password
            </p>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-[#71717A] group-hover:text-[#F5F5F5] group-hover:translate-x-0.5 transition" />
      </div>

      {/* 5. Edit Field Modal / Sheet */}
      {activeEditField && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setActiveEditField(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/70">
              <h3 className="text-sm font-bold text-[#F5F5F5] capitalize">
                {activeEditField === "dob"
                  ? "Edit Date of Birth"
                  : activeEditField === "avatar"
                  ? "Update Profile Picture"
                  : `Edit ${activeEditField}`}
              </h3>
              <button
                onClick={() => setActiveEditField(null)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {activeEditField === "name" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-medium transition"
                  />
                </div>
              )}

              {activeEditField === "dob" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-mono-num transition"
                  />
                </div>
              )}

              {activeEditField === "phone" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] outline-none focus:border-emerald-500 font-mono-num transition"
                  />
                </div>
              )}

              {activeEditField === "gender" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Select Gender
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: "male", label: "Male" },
                      { id: "female", label: "Female" },
                      { id: "other", label: "Other" },
                      { id: "prefer_not_to_say", label: "Prefer not to say" },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setEditGender(g.id as any)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          editGender === g.id
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                            : "bg-[#1C1C1C] border-[#2D2D2D] text-[#A1A1AA] hover:text-white"
                        }`}
                      >
                        <span>{g.label}</span>
                        {editGender === g.id && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeEditField === "avatar" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-xs text-[#F5F5F5] outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                      Or pick a preset avatar
                    </span>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditAvatarUrl(preset)}
                          className={`w-14 h-14 rounded-full overflow-hidden border-2 transition mx-auto cursor-pointer ${
                            editAvatarUrl === preset
                              ? "border-emerald-400 scale-105"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={preset}
                            alt={`Preset ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveEditField(null)}
                className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveField}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
