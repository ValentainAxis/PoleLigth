import admin from 'firebase-admin';
import { Vision } from '../types';

let db: admin.database.Database | null = null;

/**
 * Initialize Firebase Admin SDK
 * Called once at server startup
 */
export function initializeFirebase() {
  if (db) return; // Already initialized

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    if (!serviceAccountPath) {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not set. Using default credentials.');
    }

    if (!databaseURL) {
      console.warn('⚠️  FIREBASE_DATABASE_URL not set. Firebase may not work correctly.');
    }

    // Load service account if path is provided
    if (serviceAccountPath) {
      try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: databaseURL,
        });
      } catch (fileErr) {
        console.error('Failed to load service account file:', fileErr);
        throw fileErr;
      }
    } else {
      // Fallback: use default credentials (for production environments like Cloud Run)
      admin.initializeApp({
        databaseURL: databaseURL,
      });
    }

    db = admin.database();
    console.log('✅ Firebase Realtime Database initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Ensure Firebase is initialized before making database calls
 */
function ensureInitialized() {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
}

export const firebaseService = {
  /**
   * Get all visions from database
   */
  async getVisions(): Promise<Vision[]> {
    try {
      const database = ensureInitialized();
      const snapshot = await database.ref('visions').once('value');
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('Error fetching visions from Firebase:', error);
      throw error;
    }
  },

  /**
   * Get a single vision by ID
   */
  async getVision(id: string): Promise<Vision | null> {
    try {
      const database = ensureInitialized();
      const snapshot = await database.ref(`visions/${id}`).once('value');
      return snapshot.val() || null;
    } catch (error) {
      console.error(`Error fetching vision ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create or update a vision
   */
  async saveVision(vision: Vision): Promise<void> {
    try {
      const database = ensureInitialized();
      // Validate required fields
      if (!vision.id || !vision.text || !vision.whisper) {
        throw new Error('Vision must have id, text, and whisper fields');
      }
      await database.ref(`visions/${vision.id}`).set(vision);
    } catch (error) {
      console.error('Error saving vision to Firebase:', error);
      throw error;
    }
  },

  /**
   * Delete a vision by ID
   */
  async deleteVision(id: string): Promise<void> {
    try {
      const database = ensureInitialized();
      await database.ref(`visions/${id}`).remove();
    } catch (error) {
      console.error(`Error deleting vision ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update specific fields of a vision (partial update)
   */
  async updateVision(id: string, updates: Partial<Vision>): Promise<void> {
    try {
      const database = ensureInitialized();
      await database.ref(`visions/${id}`).update(updates);
    } catch (error) {
      console.error(`Error updating vision ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get all root system runes (decayed visions)
   */
  async getRootSystem(): Promise<any[]> {
    try {
      const database = ensureInitialized();
      const snapshot = await database.ref('rootSystem').once('value');
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('Error fetching root system from Firebase:', error);
      throw error;
    }
  },

  /**
   * Save a rune to the root system
   */
  async saveRootRune(rune: any): Promise<void> {
    try {
      const database = ensureInitialized();
      if (!rune.id) {
        throw new Error('Rune must have an id field');
      }
      await database.ref(`rootSystem/${rune.id}`).set(rune);
    } catch (error) {
      console.error('Error saving rune to Firebase:', error);
      throw error;
    }
  },

  /**
   * Delete a rune from root system
   */
  async deleteRune(id: string): Promise<void> {
    try {
      const database = ensureInitialized();
      await database.ref(`rootSystem/${id}`).remove();
    } catch (error) {
      console.error(`Error deleting rune ${id}:`, error);
      throw error;
    }
  },

  /**
   * Set up a real-time listener for all visions
   * Returns an unsubscribe function
   */
  onVisionsChange(callback: (visions: Vision[]) => void): () => void {
    try {
      const database = ensureInitialized();
      const ref = database.ref('visions');
      
      ref.on('value', (snapshot) => {
        const data = snapshot.val();
        const visions = data ? Object.values(data) : [];
        callback(visions);
      });

      // Return unsubscribe function
      return () => ref.off('value');
    } catch (error) {
      console.error('Error setting up visions listener:', error);
      throw error;
    }
  },

  /**
   * Batch save multiple visions (useful for initialization)
   */
  async batchSaveVisions(visions: Vision[]): Promise<void> {
    try {
      const database = ensureInitialized();
      const updates: { [key: string]: Vision } = {};
      
      for (const vision of visions) {
        if (!vision.id) {
          throw new Error('All visions must have an id field');
        }
        updates[`visions/${vision.id}`] = vision;
      }

      await database.ref().update(updates);
    } catch (error) {
      console.error('Error batch saving visions:', error);
      throw error;
    }
  },

  /**
   * Clear all data (use with caution!)
   */
  async clearAllData(): Promise<void> {
    try {
      const database = ensureInitialized();
      await database.ref().remove();
      console.warn('⚠️  All Firebase data cleared');
    } catch (error) {
      console.error('Error clearing Firebase data:', error);
      throw error;
    }
  },

  /**
   * Get database connection status
   */
  getDatabase(): admin.database.Database {
    return ensureInitialized();
  }
};

export default firebaseService;