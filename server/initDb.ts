import { pool } from "./db";

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        join_date TIMESTAMP DEFAULT NOW(),
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        max_tracks INTEGER DEFAULT 3,
        max_tags INTEGER DEFAULT 5,
        badges JSONB DEFAULT '[]',
        is_premium BOOLEAN DEFAULT false,
        premium_expiry TIMESTAMP,
        alias TEXT,
        max_aliases INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        display_name TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        location TEXT DEFAULT '',
        avatar_url TEXT,
        banner_url TEXT,
        background_url TEXT,
        background_video_url TEXT,
        music_url TEXT,
        show_views BOOLEAN DEFAULT true,
        show_uid BOOLEAN DEFAULT true,
        show_join_date BOOLEAN DEFAULT true,
        show_watermark BOOLEAN DEFAULT true,
        theme_color TEXT DEFAULT '#F97316',
        background_effect TEXT DEFAULT 'none',
        reveal_enabled BOOLEAN DEFAULT false,
        reveal_text TEXT DEFAULT 'Click to reveal',
        settings JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#F97316',
        is_protected BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '',
        platform TEXT DEFAULT '',
        style TEXT DEFAULT 'default',
        "order" INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        clicks INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        artist_profile TEXT DEFAULT '',
        "order" INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS view_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS session (
        sid TEXT NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS discord_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        discord_id TEXT NOT NULL,
        discord_username TEXT,
        discord_global_name TEXT,
        email TEXT,
        action TEXT NOT NULL DEFAULT 'login',
        is_new_user BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        preview_image_url TEXT,
        profile_snapshot JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        uses INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);
    `);

    // ─── New tables ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        discord_id TEXT,
        discord_username TEXT,
        discord_avatar TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        claimed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        claimed_by_discord_username TEXT,
        claimed_by_discord_avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL DEFAULT 'user',
        sender_name TEXT,
        sender_avatar TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Add new columns to existing tables (idempotent migrations) ─────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS alias TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS max_aliases INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
      ALTER TABLE badges ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE badges ADD COLUMN IF NOT EXISTS how_to_get TEXT DEFAULT '';
      ALTER TABLE badges ADD COLUMN IF NOT EXISTS visible_to TEXT DEFAULT 'all';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_challenges JSONB DEFAULT '[]';
      ALTER TABLE profiles ALTER COLUMN reveal_enabled SET DEFAULT true;
      ALTER TABLE tracks ADD COLUMN IF NOT EXISTS enabled INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_wheel_spin TIMESTAMP;
      CREATE TABLE IF NOT EXISTS uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username TEXT,
        file_name TEXT,
        content_type TEXT,
        object_path TEXT,
        public_url TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("[db] All tables initialized successfully");
  } finally {
    client.release();
  }
}
