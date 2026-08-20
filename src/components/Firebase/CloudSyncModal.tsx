"use client";

import { useState, useEffect } from "react";
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  UploadCloud, 
  DownloadCloud, 
  User, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  LogOut, 
  Sparkles, 
  ShieldCheck, 
  Smartphone,
  RefreshCw
} from "lucide-react";
import { AuthService } from "../../lib/firebase/authService";
import { CloudSyncService, CloudBackupData } from "../../lib/firebase/syncService";
import { useCrewStore } from "../../store/useCrewStore";
import { UserProfile } from "../../types";
import { User as FirebaseUser } from "firebase/auth";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnboarding?: () => void;
}

export default function CloudSyncModal({ isOpen, onClose, onStartOnboarding }: CloudSyncModalProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  // Loading & Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [backupInfo, setBackupInfo] = useState<CloudBackupData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const sequences = useCrewStore((state) => state.sequences);
  const userProfile = useCrewStore((state) => state.userProfile);

  const formatAuthError = (err: any): string => {
    const code = err?.code || "";
    if (code === "auth/configuration-not-found" || code === "auth/admin-restricted-operation") {
      return "Firebase Authentication needs to be enabled in your Firebase Console: Go to console.firebase.google.com > Build > Authentication > Get Started > enable Email/Password and Anonymous.";
    }
    if (code === "auth/email-already-in-use") {
      return "An account with this email already exists. Please switch to Sign In.";
    }
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Invalid email or password. Please check your credentials.";
    }
    if (code === "auth/weak-password") {
      return "Password is too weak. Please use at least 6 characters.";
    }
    if (code === "auth/network-request-failed") {
      return "Network connection issue. Local offline cache is still active.";
    }
    return err.message || "Authentication error.";
  };

  // Subscribe to auth state
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        const info = await CloudSyncService.getCloudBackupInfo(user.uid);
        setBackupInfo(info);
      } else {
        setBackupInfo(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMessage({ type: "error", text: "Please enter your email and password." });
      return;
    }
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const user = await AuthService.signIn(email.trim(), password);
      setStatusMessage({ type: "success", text: `Welcome back, ${user.email}!` });
      const info = await CloudSyncService.getCloudBackupInfo(user.uid);
      setBackupInfo(info);
      if (info?.profile) {
        useCrewStore.getState().updateUserProfile(info.profile);
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: formatAuthError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMessage({ type: "error", text: "Please provide an email and password." });
      return;
    }
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const user = await AuthService.signUp(email.trim(), password, displayName.trim() || userProfile?.name);
      setStatusMessage({ type: "success", text: "Account created successfully! Taking you to profile setup..." });
      
      const currentProfile = useCrewStore.getState().userProfile;
      const updatedProfile: UserProfile = {
        ...(currentProfile || {
          name: displayName.trim(),
          employeeId: "",
          airline: "Envoy Air (AA Eagle)",
          equipment: "E175",
          crewRole: "CA",
          base: "ORD",
          hasCompletedOnboarding: false,
        }),
        email: user.email || email.trim(),
        name: displayName.trim() || currentProfile?.name || "",
        firebaseUid: user.uid,
      };
      useCrewStore.getState().updateUserProfile(updatedProfile);

      // Trigger initial backup
      await CloudSyncService.backupAllToCloud(user.uid);
      const info = await CloudSyncService.getCloudBackupInfo(user.uid);
      setBackupInfo(info);

      if (onStartOnboarding) {
        setTimeout(() => {
          onClose();
          onStartOnboarding();
        }, 700);
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: formatAuthError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const user = await AuthService.signInAsGuest();
      setStatusMessage({ type: "success", text: "Signed in with 1-Tap Pilot Cloud ID!" });
      const currentProfile = useCrewStore.getState().userProfile;
      if (currentProfile) {
        useCrewStore.getState().updateUserProfile({
          ...currentProfile,
          firebaseUid: user.uid,
        });
      }
      const info = await CloudSyncService.getCloudBackupInfo(user.uid);
      setBackupInfo(info);

      if (!currentProfile?.hasCompletedOnboarding && onStartOnboarding) {
        setTimeout(() => {
          onClose();
          onStartOnboarding();
        }, 700);
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: formatAuthError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      setStatusMessage({ type: "info", text: "Signed out of cloud account." });
      setBackupInfo(null);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error signing out." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupNow = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const result = await CloudSyncService.backupAllToCloud(currentUser.uid);
      if (result.success) {
        setStatusMessage({ type: "success", text: result.message });
        const info = await CloudSyncService.getCloudBackupInfo(currentUser.uid);
        setBackupInfo(info);
      } else {
        setStatusMessage({ type: "error", text: result.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Backup failed." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreNow = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const result = await CloudSyncService.restoreAllFromCloud(currentUser.uid);
      if (result.success) {
        setStatusMessage({ type: "success", text: result.message });
      } else {
        setStatusMessage({ type: "error", text: result.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Restore failed." });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100001] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 border border-white/30 rounded-2xl text-white shadow-2xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight flex items-center gap-1.5">
                <span>Firebase Cloud Sync</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 font-mono font-bold">
                  LIVE
                </span>
              </h3>
              <p className="text-xs text-sky-100 font-medium">
                Offline-first Firestore schedule & logbook sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin space-y-4 flex-1">
          {/* Status Message Banner */}
          {statusMessage && (
            <div 
              className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : statusMessage.type === "error"
                  ? "bg-rose-50 text-rose-900 border-rose-300"
                  : "bg-sky-50 text-sky-900 border-sky-300"
              }`}
            >
              {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {statusMessage.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {statusMessage.type === "info" && <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* USER SIGNED IN VIEW */}
          {currentUser ? (
            <div className="space-y-4">
              {/* Account Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 font-black text-sm shadow-2xs">
                      {currentUser.isAnonymous ? "G" : (currentUser.email?.[0]?.toUpperCase() || "P")}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {currentUser.isAnonymous ? "Pilot Guest Cloud ID" : (currentUser.displayName || currentUser.email)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        UID: {currentUser.uid.slice(0, 12)}...
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active-press shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Cloud Connection Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-white rounded-2xl border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-sans block">Firebase Project</span>
                    <span className="font-black text-slate-900">crewschedule-9ce66</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-2xl border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-sans block">Offline Mode</span>
                    <span className="font-black text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active (Flight Ready)
                    </span>
                  </div>
                </div>

                {/* Envoy Pilot Profile Status */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{userProfile?.name || "Envoy Pilot"}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-mono font-bold">
                          {userProfile?.base || "ORD"} • {userProfile?.crewRole || "CA"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {userProfile?.hasCompletedOnboarding ? "Profile configured & synced to Firestore" : "Setup incomplete"}
                      </div>
                    </div>
                  </div>

                  {onStartOnboarding && (
                    <button
                      onClick={() => {
                        onClose();
                        onStartOnboarding();
                      }}
                      className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition cursor-pointer active-press"
                    >
                      {userProfile?.hasCompletedOnboarding ? "Edit Profile" : "Setup Wizard"}
                    </button>
                  )}
                </div>
              </div>

              {/* Cloud Sync & Backup Actions */}
              <div className="p-4 bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Schedule & Logbook Cloud Backup
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {backupInfo?.lastBackupAt 
                        ? `Last backup: ${new Date(backupInfo.lastBackupAt).toLocaleString()}`
                        : "No cloud backup created yet"}
                    </p>
                  </div>

                  <span className="text-xs font-mono font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-200">
                    {sequences.length} Pairings
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={handleBackupNow}
                    disabled={isSyncing}
                    className="py-3 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active-press shadow-md disabled:opacity-50"
                  >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>Backup Now</span>
                  </button>

                  <button
                    onClick={handleRestoreNow}
                    disabled={isSyncing}
                    className="py-3 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active-press shadow-2xs disabled:opacity-50"
                  >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4 text-sky-600" />}
                    <span>Restore Data</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* USER NOT SIGNED IN VIEW */
            <div className="space-y-4">
              {/* Auth Mode Toggle */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className={`py-2 rounded-xl transition cursor-pointer ${
                    authMode === "signin"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`py-2 rounded-xl transition cursor-pointer ${
                    authMode === "signup"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
                {authMode === "signup" && (
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Pilot / Crew Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={userProfile?.name || "e.g. Capt. Austin Pryor"}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pilot@envoyair.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active-press disabled:opacity-50 mt-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{authMode === "signin" ? "Sign In to Cloud Sync" : "Create Cloud Account"}</span>
                </button>
              </form>

              {/* 1-Tap Guest Cloud ID Option */}
              <div className="pt-3 border-t border-slate-200 text-center">
                <p className="text-[11px] text-slate-500 mb-2">Want instant backup without creating a password?</p>
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active-press"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>1-Tap Instant Pilot Cloud ID</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
