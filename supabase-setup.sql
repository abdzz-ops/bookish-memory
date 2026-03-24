-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/atgssebsyfjgperkaijn/sql)
-- This sets up the tables for posts, likes, and views

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table (one like per user per post)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Views table (tracks view count per post)
CREATE TABLE IF NOT EXISTS views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  view_count INTEGER DEFAULT 0
);

-- Storage bucket for uploads
-- Run this in the Supabase Storage tab or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Enable Row Level Security (RLS) and allow public read
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read posts, likes, views
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public read likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Public read views" ON views FOR SELECT USING (true);

-- Allow inserts/updates/deletes (our server uses the anon key)
CREATE POLICY "Allow insert posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert likes" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete likes" ON likes FOR DELETE USING (true);
CREATE POLICY "Allow insert views" ON views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update views" ON views FOR UPDATE USING (true);
CREATE POLICY "Allow delete posts" ON posts FOR DELETE USING (true);
