import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  updateProfile,
  User 
} from "firebase/auth";
import { auth } from "./config";
import { UserProfile } from "../../types";

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export class AuthService {
  /**
   * Register with Email and Password
   */
  public static async signUp(email: string, pass: string, displayName?: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  }

  /**
   * Sign In with Email and Password
   */
  public static async signIn(email: string, pass: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  }

  /**
   * 1-Tap Anonymous Cloud ID Sign In (Zero friction for pilots)
   */
  public static async signInAsGuest(): Promise<User> {
    const cred = await signInAnonymously(auth);
    return cred.user;
  }

  /**
   * Sign Out
   */
  public static async signOut(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Send Password Reset Email
   */
  public static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Get Current Authenticated User
   */
  public static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Subscribe to Auth State Changes
   */
  public static onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}
