// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database Types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          is_verified: boolean;
          gender: string;
          college_email: string | null;
          college_name: string | null;
          karma_points: number;
          is_anonymous: boolean;
          badges: string[];
          daily_message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          room_id: string | null;
          content: string;
          is_mega_chat: boolean;
          reactions: {
            fire: number;
            laugh: number;
            heart: number;
            eyes: number;
          };
          is_pinned: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      rooms: {
        Row: {
          id: string;
          room_type: string;
          room_size: number;
          current_count: number;
          is_verified_only: boolean;
          is_active: boolean;
          icebreaker_prompt: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      room_participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['room_participants']['Row'], 'joined_at'>;
        Update: Partial<Database['public']['Tables']['room_participants']['Insert']>;
      };
    };
  };
};

// SQL Schema for Supabase (run this in Supabase SQL Editor)
/*
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  gender TEXT DEFAULT 'unspecified',
  college_email TEXT UNIQUE,
  college_name TEXT,
  karma_points INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT TRUE,
  badges TEXT[] DEFAULT '{}',
  daily_message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID,
  content TEXT NOT NULL,
  is_mega_chat BOOLEAN DEFAULT FALSE,
  reactions JSONB DEFAULT '{"fire":0,"laugh":0,"heart":0,"eyes":0}'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type TEXT NOT NULL,
  room_size INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  is_verified_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  icebreaker_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Room participants table
CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_mega_chat ON messages(is_mega_chat) WHERE is_mega_chat = TRUE;
CREATE INDEX idx_rooms_active ON rooms(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_karma ON users(karma_points DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Public read, authenticated write)
CREATE POLICY "Public users read" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Public messages read" ON messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert messages" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Public rooms read" ON rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Public participants read" ON room_participants FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON room_participants FOR INSERT WITH CHECK (true);

-- Function to reset daily message counts
CREATE OR REPLACE FUNCTION reset_daily_message_counts()
RETURNS void AS $$
BEGIN
  UPDATE users SET daily_message_count = 0 WHERE is_anonymous = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/