/**
 * Shared domain types — a TypeScript reflection of the "Core Entities" in the
 * Technical Architecture doc (Section 2.1). These are hand-written placeholders
 * for the scaffold; once the database schema exists you can replace/augment
 * them with generated Supabase types (`supabase gen types typescript`).
 */

export type Role =
  | "upline" // President team — read-only mentorship
  | "club_owner" // top of own tree (Ruby Ankur)
  | "nco" // Senior Club Operator — cluster treasury hub
  | "jco" // Junior Club Operator — mini-cluster hub
  | "coach" // direct member handler
  | "member" // active GUMS member
  | "privilege" // post-60-day invoice-based member
  | "guest"; // lead / prospect

export type MembershipType = "basic" | "elite" | "privilege";

/** 0 Daily Guest → 6 Decision Point (Ambassador Meeting). */
export type MemberStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HealthStatus = "green" | "yellow" | "red";

export type AmbassadorTier =
  | "ambassador"
  | "silver"
  | "gold"
  | "platinum"
  | "elite_platinum"
  | "ruby"
  | "topaz"
  | "emerald";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: Role;
  parentId?: string | null; // upline
  ambassadorTier?: AmbassadorTier | null;
  status: "active" | "inactive";
  address?: string | null;
  locale?: string | null;
  timezone?: string | null;
  createdAt: string;
}

export interface Member {
  userId: string;
  coachId: string;
  membershipType: MembershipType;
  stage: MemberStage;
  joinDate: string;
  rechargeCount: number;
  idealWeight?: number | null;
  currentWeight?: number | null;
  programConfig?: Record<string, unknown>; // per-member customization (JSON)
}

/** Closure-table row enabling fast subtree + sideline-isolation queries. */
export interface HierarchyClosure {
  ancestorId: string;
  descendantId: string;
  depth: number;
}

export interface RuleConfig {
  id: string;
  key: string;
  value: unknown; // JSON — pricing, criteria, scoring, cadences, gift catalog…
  updatedBy: string;
  updatedAt: string;
}
