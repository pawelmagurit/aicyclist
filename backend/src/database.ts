import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface Activity {
  id: string;
  userId: string;
  activityId: string;
  activityName: string;
  sportType: string;
  startTime: string;
  duration: number;
  distance: number;
  calories: number;
  averagePower?: number;
  normalizedPower?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  tss?: number;
  intensityFactor?: number;
  rawData: string; // JSON string of full activity data
  createdAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  workoutName: string;
  sportType: string;
  workoutSegments: string; // JSON string of workout segments
  garminWorkoutId?: string;
  isUploaded: boolean;
  createdAt: string;
  scheduledDate?: string;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  planName: string;
  goal: string;
  focus: string;
  duration: number; // in weeks
  sessions: string; // JSON string of planned sessions
  createdAt: string;
  isActive: boolean;
}

export interface User {
  id: string;
  garminUserId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  createdAt: string;
  lastSyncAt?: string;
}

export class Database {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = process.env.DATABASE_PATH || './data/ai-coach.db';
    const dbDir = path.dirname(dbPath);
    
    // Ensure data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        garmin_user_id TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_sync_at TEXT
      )
    `);

    // Activities table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        activity_name TEXT NOT NULL,
        sport_type TEXT NOT NULL,
        start_time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        distance REAL,
        calories INTEGER,
        average_power REAL,
        normalized_power REAL,
        average_heart_rate REAL,
        max_heart_rate REAL,
        average_cadence REAL,
        tss REAL,
        intensity_factor REAL,
        raw_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Workouts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workout_name TEXT NOT NULL,
        sport_type TEXT NOT NULL,
        workout_segments TEXT NOT NULL,
        garmin_workout_id TEXT,
        is_uploaded BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        scheduled_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Training plans table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS training_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        goal TEXT NOT NULL,
        focus TEXT NOT NULL,
        duration INTEGER NOT NULL,
        sessions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    console.log('📊 Database tables initialized');
  }

  // User methods
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, garmin_user_id, access_token, refresh_token, token_expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, user.garminUserId, user.accessToken, user.refreshToken, user.tokenExpiresAt, now],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getUserByGarminId(garminUserId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE garmin_user_id = ?',
        [garminUserId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as User || null);
        }
      );
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve((row as User) || null);
        }
      );
    });
  }

  async updateUserTokens(userId: string, accessToken: string, refreshToken: string, expiresAt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?',
        [accessToken, refreshToken, expiresAt, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Activity methods
  async saveActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO activities (id, user_id, activity_id, activity_name, sport_type, start_time, 
         duration, distance, calories, average_power, normalized_power, average_heart_rate, 
         max_heart_rate, average_cadence, tss, intensity_factor, raw_data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, activity.userId, activity.activityId, activity.activityName, activity.sportType,
         activity.startTime, activity.duration, activity.distance, activity.calories,
         activity.averagePower, activity.normalizedPower, activity.averageHeartRate,
         activity.maxHeartRate, activity.averageCadence, activity.tss, activity.intensityFactor,
         activity.rawData, now],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getActivitiesByUserId(userId: string, limit: number = 50): Promise<Activity[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM activities WHERE user_id = ? ORDER BY start_time DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as Activity[]);
        }
      );
    });
  }

  // Workout methods
  async saveWorkout(workout: Omit<Workout, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO workouts (id, user_id, workout_name, sport_type, workout_segments, 
         garmin_workout_id, is_uploaded, created_at, scheduled_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, workout.userId, workout.workoutName, workout.sportType, workout.workoutSegments,
         workout.garminWorkoutId, workout.isUploaded ? 1 : 0, now, workout.scheduledDate],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getWorkoutsByUserId(userId: string): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as Workout[]);
        }
      );
    });
  }

  async updateWorkoutUploadStatus(workoutId: string, garminWorkoutId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE workouts SET garmin_workout_id = ?, is_uploaded = 1 WHERE id = ?',
        [garminWorkoutId, workoutId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateUserLastSync(userId: string, isoDate: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET last_sync_at = ? WHERE id = ?',
        [isoDate, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Training plan methods
  async saveTrainingPlan(plan: Omit<TrainingPlan, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO training_plans (id, user_id, plan_name, goal, focus, duration, sessions, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, plan.userId, plan.planName, plan.goal, plan.focus, plan.duration,
         plan.sessions, now, plan.isActive ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getActiveTrainingPlan(userId: string): Promise<TrainingPlan | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM training_plans WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as TrainingPlan || null);
        }
      );
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  close(): void {
    this.db.close();
  }
}
