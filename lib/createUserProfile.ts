import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";

export type UserPlan = "free" | "starter" | "pro" | "enterprise";

export const PLAN_CREDITS: Record<string, number> = {
  free:       15,
  starter:    50,
  pro:        500,
  enterprise: -1,   // unlimited (-1 = không trừ credit)
};

export const PLAN_APP_LIMIT: Record<string, number> = {
  free:       3,
  starter:    -1,   // unlimited
  pro:        -1,
  enterprise: -1,
};

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: UserPlan;
  /** Total number of builds the user has submitted */
  builds: number;
  /** Credit còn lại trong tháng hiện tại */
  credits: number;
  /** Credit tối đa của plan hiện tại (dùng cho UI progress bar). -1 = unlimited */
  planCredits: number;
  /** Timestamp ngày 1 đầu tháng tiếp theo — thời điểm reset credit */
  creditsResetAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Tính timestamp ngày 1 đầu tháng tiếp theo (UTC+7) */
function nextMonthFirstDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Creates a user profile document in Firestore on first login.
 * If the document already exists, it is left unchanged (merge only updatedAt).
 */
export async function createUserProfileIfNeeded(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid);

  console.log("[createUserProfile] Checking Firestore for uid:", user.uid);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log("[createUserProfile] No document found — creating new profile...");

    const profile: Omit<UserProfile, "createdAt" | "updatedAt"> & {
      createdAt: unknown;
      updatedAt: unknown;
    } = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      plan: "free",
      builds: 0,
      credits: PLAN_CREDITS.free,
      planCredits: PLAN_CREDITS.free,
      creditsResetAt: nextMonthFirstDay(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, profile);
    console.log("[createUserProfile] ✅ Profile created successfully for uid:", user.uid);
  } else {
    console.log("[createUserProfile] ✅ Profile already exists for uid:", user.uid);
  }
}

/**
 * Tạo build job trên Firestore, chỉ dùng userId (không lưu email).
 * Schema: builds/{id} { userId, status, schemeName, bundleId, createdAt, ... }
 */
export async function createBuildJob(
  user: User,
  params: { schemeName: string; bundleId: string }
) {
  return addDoc(collection(db, "builds"), {
    userId: user.uid,
    status: "pending",
    schemeName: params.schemeName,
    bundleId: params.bundleId,
    createdAt: serverTimestamp(),
  });
}
