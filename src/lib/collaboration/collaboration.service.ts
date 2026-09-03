import { db } from '@/lib/db';
import { createHash } from 'crypto';

// ─── Types ──────────────────────────────────────────────────

export interface CollaborationSession {
  id: string;
  articleId: string;
  documentId: string;
  status: 'ACTIVE' | 'IDLE' | 'CLOSED';
  createdAt: string;
  lastActivityAt: string;
  activeUsers: CollaboratingUser[];
  maxUsers: number;
}

export interface CollaboratingUser {
  userId: string;
  name: string;
  color: string;
  cursorPosition: number;
  selectionRange?: { from: number; to: number };
  lastSeenAt: string;
  isActive: boolean;
}

export interface CollaborationEvent {
  type: 'USER_JOINED' | 'USER_LEFT' | 'CONTENT_CHANGED' | 'CURSOR_MOVED' | 'AWARENESS_UPDATE';
  userId: string;
  timestamp: string;
  data?: unknown;
}

// ─── Session Management ─────────────────────────────────────

const ACTIVE_SESSIONS = new Map<string, CollaborationSession>();

// Predefined cursor colors for collaborators
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2',
];

let colorIndex = 0;

function getNextColor(): string {
  const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length];
  colorIndex++;
  return color;
}

/**
 * Creates or joins a collaboration session for an article.
 */
export async function joinCollaborationSession(
  articleId: string,
  userId: string,
  userName: string,
): Promise<CollaborationSession> {
  // Check if session already exists
  let session = ACTIVE_SESSIONS.get(articleId);

  if (!session || session.status === 'CLOSED') {
    // Verify article exists
    const article = await db.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, rewrittenContent: true, originalContent: true },
    });

    if (!article) throw new Error('Article not found');

    session = {
      id: `session-${articleId}-${Date.now()}`,
      articleId,
      documentId: `doc-${articleId}`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      activeUsers: [],
      maxUsers: 10,
    };

    ACTIVE_SESSIONS.set(articleId, session);
  }

  // Check max users
  if (session.activeUsers.length >= session.maxUsers) {
    throw new Error('Maximum collaborators reached');
  }

  // Check if user already in session
  const existingUser = session.activeUsers.find((u) => u.userId === userId);
  if (existingUser) {
    existingUser.lastSeenAt = new Date().toISOString();
    existingUser.isActive = true;
  } else {
    session.activeUsers.push({
      userId,
      name: userName,
      color: getNextColor(),
      cursorPosition: 0,
      lastSeenAt: new Date().toISOString(),
      isActive: true,
    });
  }

  session.lastActivityAt = new Date().toISOString();

  // Record in the database
  await db.articleVersion.create({
    data: {
      articleId,
      versionNumber: session.activeUsers.length,
      title: 'Collaboration Session Started',
      content: `Session ${session.id} started by ${userName}`,
      createdById: userId,
    },
  });

  return session;
}

/**
 * Leaves a collaboration session.
 */
export async function leaveCollaborationSession(
  articleId: string,
  userId: string,
): Promise<CollaborationSession | null> {
  const session = ACTIVE_SESSIONS.get(articleId);
  if (!session) return null;

  session.activeUsers = session.activeUsers.filter((u) => u.userId !== userId);
  session.lastActivityAt = new Date().toISOString();

  // Close session if no users left
  if (session.activeUsers.length === 0) {
    session.status = 'IDLE';
  }

  return session;
}

/**
 * Gets the current state of a collaboration session.
 */
export function getCollaborationSession(articleId: string): CollaborationSession | null {
  return ACTIVE_SESSIONS.get(articleId) || null;
}

/**
 * Lists all active collaboration sessions for a site.
 */
export function getActiveSessions(siteId: string): CollaborationSession[] {
  const sessions: CollaborationSession[] = [];
  for (const session of ACTIVE_SESSIONS.values()) {
    if (session.status === 'ACTIVE' || session.status === 'IDLE') {
      sessions.push(session);
    }
  }
  return sessions;
}

// ─── Y.js Document State ────────────────────────────────────

/**
 * Generates a unique document identifier for Y.js collaboration.
 */
export function generateDocumentId(articleId: string): string {
  const hash = createHash('sha256').update(articleId).digest('hex').slice(0, 12);
  return `yjs-doc-${hash}`;
}

/**
 * Configuration for Y.js + TipTap collaboration.
 * This provides the setup config that the frontend needs.
 */
export function getCollaborationConfig(articleId: string) {
  const documentId = generateDocumentId(articleId);
  const session = ACTIVE_SESSIONS.get(articleId);

  return {
    documentId,
    serverUrl: process.env.NEXT_PUBLIC_COLLABORATION_URL || null,
    webrtcConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    },
    awarenessConfig: {
      maxColoredListeners: 10,
      states: session?.activeUsers.map((u) => ({
        user: { name: u.name, color: u.color },
        cursor: u.cursorPosition,
        selection: u.selectionRange,
      })) || [],
    },
  };
}

// ─── Awareness Protocol ─────────────────────────────────────

/**
 * Updates a user's cursor position and awareness state.
 */
export function updateAwareness(
  articleId: string,
  userId: string,
  data: {
    cursorPosition?: number;
    selectionRange?: { from: number; to: number };
  },
): void {
  const session = ACTIVE_SESSIONS.get(articleId);
  if (!session) return;

  const user = session.activeUsers.find((u) => u.userId === userId);
  if (user) {
    if (data.cursorPosition !== undefined) {
      user.cursorPosition = data.cursorPosition;
    }
    if (data.selectionRange !== undefined) {
      user.selectionRange = data.selectionRange;
    }
    user.lastSeenAt = new Date().toISOString();
  }

  session.lastActivityAt = new Date().toISOString();
}

/**
 * Cleans up stale sessions (no activity for 30 minutes).
 */
export function cleanupStaleSessions(): number {
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  let cleaned = 0;

  for (const [articleId, session] of ACTIVE_SESSIONS.entries()) {
    if (new Date(session.lastActivityAt).getTime() < thirtyMinAgo) {
      session.status = 'CLOSED';
      ACTIVE_SESSIONS.delete(articleId);
      cleaned++;
    }
  }

  return cleaned;
}

// ─── Conflict Resolution ────────────────────────────────────

/**
 * Checks if two users are editing the same region.
 * Returns true if there's a potential conflict.
 */
export function hasConflict(
  articleId: string,
  userId1: string,
  userId2: string,
): boolean {
  const session = ACTIVE_SESSIONS.get(articleId);
  if (!session) return false;

  const user1 = session.activeUsers.find((u) => u.userId === userId1);
  const user2 = session.activeUsers.find((u) => u.userId === userId2);

  if (!user1 || !user2 || !user1.selectionRange || !user2.selectionRange) return false;

  // Check if ranges overlap
  return (
    user1.selectionRange.from <= user2.selectionRange.to &&
    user1.selectionRange.to >= user2.selectionRange.from
  );
}
