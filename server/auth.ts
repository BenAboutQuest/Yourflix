import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from './db';
import { users, sessions, type User, type InsertUser, type Session, type InsertSession } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export class AuthService {
  
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const passwordHash = await this.hashPassword(userData.passwordHash);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        passwordHash,
      })
      .returning();
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user;
  }

  async createSession(userId: number): Promise<Session> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    const [session] = await db
      .insert(sessions)
      .values({
        id: sessionId,
        userId,
        expiresAt,
      })
      .returning();

    return session;
  }

  async getSessionById(sessionId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));
  }

  async validateSession(sessionId: string): Promise<{ user: User; session: Session } | null> {
    const session = await this.getSessionById(sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.deleteSession(sessionId);
      }
      return null;
    }

    const user = await this.getUserById(session.userId);
    
    if (!user) {
      await this.deleteSession(sessionId);
      return null;
    }

    return { user, session };
  }

  async login(usernameOrEmail: string, password: string): Promise<{ user: User; sessionId: string } | null> {
    // Try to find user by username or email
    let user = await this.getUserByUsername(usernameOrEmail);
    if (!user) {
      user = await this.getUserByEmail(usernameOrEmail);
    }

    if (!user) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    const session = await this.createSession(user.id);
    
    return {
      user,
      sessionId: session.id,
    };
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ user: User; sessionId: string }> {
    // Check if username or email already exists
    const existingUser = await this.getUserByUsername(userData.username) || 
                         await this.getUserByEmail(userData.email);
    
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const user = await this.createUser({
      username: userData.username,
      email: userData.email,
      passwordHash: userData.password, // Will be hashed in createUser
      displayName: userData.displayName,
    });

    const session = await this.createSession(user.id);

    return {
      user,
      sessionId: session.id,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.deleteSession(sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db
      .delete(sessions)
      .where(eq(sessions.expiresAt, new Date()));
  }

  async getAllUsers(): Promise<User[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users);
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // First delete all sessions for this user
      await db
        .delete(sessions)
        .where(eq(sessions.userId, userId));
      
      // Delete the user
      const result = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}

export const authService = new AuthService();