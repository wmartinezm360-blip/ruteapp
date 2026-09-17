/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * --- PRINCIPIO NO NEGOCIABLE: LÍMITES CLÍNICOS ---
 * Esta app NO diagnostica, no clasifica trastornos, ni infiere "enfermedades" o cuadros clínicos.
 * El cuestionario inicial es para perfilamiento motivacional/personalidad (OCEAN), NUNCA diagnóstico.
 * ---
 */

export type Role = 'user' | 'superadmin';

// --- Client-Side Types ---

export interface User {
  uid: string;
  email: string;
  displayName: string;
  /**
   * @deprecated The role field is referential/UI-only.
   * The source of truth for authorization is Custom Claims in Firebase Authentication.
   * Do not use this field for security logic.
   */
  role: Role;
  biometricEnabled: boolean;
  salt: string; // Hex string
}

export type GoalType = 'habit' | 'meta_small' | 'meta_medium' | 'meta_large';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: GoalType;
  parentId?: string; // Reference to parent goal
  status: 'pending' | 'in_progress' | 'completed';
  progressValue: number;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  goalId: string;
  action: 'completed' | 'skipped';
  timestamp: number;
}

export interface UserProfileData {
  userId: string;
  encrypted_payload: string; // E2EE data: quiz responses, diary, chat history
}

// --- Server-Side Only Types ---
// DO NOT import these types in React components.

export interface UserAuthRecord {
  uid: string;
  pinHash: string; // Must use bcrypt/Argon2 + salt
  lastAttemptAt?: number;
  attemptCount: number;
  createdAt: number;
}

export interface AuditLog {
  id: string; // Firestore ID
  adminId: string;
  action: string;
  targetUserId: string;
  timestamp: number;
  ipAddress: string;
  originalValue?: any;
  newValue?: any;
}
