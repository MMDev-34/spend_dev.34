export interface UserProfileData {
  displayName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | "";
  photoURL?: string;
  updatedAt?: string;
}

export interface ConnectedDeviceInfo {
  id: string;
  deviceType: "mobile" | "desktop" | "tablet";
  browser: string;
  os: string;
  lastActive: string;
  isCurrent: boolean;
}
