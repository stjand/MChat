// src/services/matchmaking.ts
import { supabase } from '../lib/supabase';
import { getRandomIcebreaker } from '../utils/username';

interface MatchOptions {
  userId: string;
  roomSize: 2 | 3 | 4;
  isVerified: boolean;
  gender?: string;
}

interface MatchResult {
  roomId: string;
  participants: string[];
  icebreaker: string;
}

export class MatchmakingService {
  private static matchingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Find or create a room for the user
  static async findMatch(options: MatchOptions): Promise<MatchResult> {
    const { userId, roomSize, isVerified, gender } = options;

    // First, try to join an existing waiting room
    const existingRoom = await this.findExistingRoom(roomSize, isVerified);

    if (existingRoom && existingRoom.current_count < roomSize) {
      // Join existing room
      await this.joinRoom(existingRoom.id, userId);
      
      return {
        roomId: existingRoom.id,
        participants: await this.getRoomParticipants(existingRoom.id),
        icebreaker: existingRoom.icebreaker_prompt || getRandomIcebreaker(),
      };
    }

    // No existing room, create a new one
    const newRoom = await this.createRoom(roomSize, isVerified);
    await this.joinRoom(newRoom.id, userId);

    // Wait for other participants
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const { data: room } = await supabase
            .from('rooms')
            .select('current_count, icebreaker_prompt')
            .eq('id', newRoom.id)
            .single();

          if (room && room.current_count >= roomSize) {
            clearInterval(checkInterval);
            this.matchingIntervals.delete(userId);

            const participants = await this.getRoomParticipants(newRoom.id);
            resolve({
              roomId: newRoom.id,
              participants,
              icebreaker: room.icebreaker_prompt || getRandomIcebreaker(),
            });
          }
        } catch (error) {
          clearInterval(checkInterval);
          this.matchingIntervals.delete(userId);
          reject(error);
        }
      }, 1000); // Check every second

      // Store interval for cleanup
      this.matchingIntervals.set(userId, checkInterval);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.matchingIntervals.has(userId)) {
          clearInterval(checkInterval);
          this.matchingIntervals.delete(userId);
          reject(new Error('Matching timeout'));
        }
      }, 30000);
    });
  }

  // Find match for 1:1 opposite gender chat
  static async findOppositeGenderMatch(userId: string, userGender: string): Promise<MatchResult> {
    const oppositeGender = userGender === 'male' ? 'female' : 'male';

    // Try to find existing 1:1 waiting room with opposite gender
    const { data: waitingRooms } = await supabase
      .from('rooms')
      .select(`
        id,
        icebreaker_prompt,
        current_count,
        room_participants (
          user_id,
          users (gender)
        )
      `)
      .eq('room_type', 'one_to_one')
      .eq('is_active', true)
      .eq('current_count', 1);

    // Find room with opposite gender participant
    const matchingRoom = waitingRooms?.find(room => {
      const participant = room.room_participants[0];
      return participant?.users[0]?.gender === oppositeGender;
    });

    if (matchingRoom) {
      await this.joinRoom(matchingRoom.id, userId);
      
      return {
        roomId: matchingRoom.id,
        participants: await this.getRoomParticipants(matchingRoom.id),
        icebreaker: matchingRoom.icebreaker_prompt || getRandomIcebreaker(),
      };
    }

    // Create new waiting room
    const newRoom = await this.createRoom(2, true, 'one_to_one');
    await this.joinRoom(newRoom.id, userId);

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const { data: room } = await supabase
            .from('rooms')
            .select('current_count, icebreaker_prompt')
            .eq('id', newRoom.id)
            .single();

          if (room && room.current_count >= 2) {
            clearInterval(checkInterval);
            this.matchingIntervals.delete(userId);

            const participants = await this.getRoomParticipants(newRoom.id);
            resolve({
              roomId: newRoom.id,
              participants,
              icebreaker: room.icebreaker_prompt || getRandomIcebreaker(),
            });
          }
        } catch (error) {
          clearInterval(checkInterval);
          this.matchingIntervals.delete(userId);
          reject(error);
        }
      }, 1000);

      this.matchingIntervals.set(userId, checkInterval);

      setTimeout(() => {
        if (this.matchingIntervals.has(userId)) {
          clearInterval(checkInterval);
          this.matchingIntervals.delete(userId);
          reject(new Error('No opposite gender match found'));
        }
      }, 30000);
    });
  }

  // Helper: Find existing room
  private static async findExistingRoom(roomSize: number, isVerifiedOnly: boolean) {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_size', roomSize)
      .eq('is_verified_only', isVerifiedOnly)
      .eq('is_active', true)
      .lt('current_count', roomSize)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return data;
  }

  // Helper: Create new room
  private static async createRoom(
    roomSize: number,
    isVerifiedOnly: boolean,
    roomType: string = 'small_group'
  ) {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_type: roomType,
        room_size: roomSize,
        current_count: 0,
        is_verified_only: isVerifiedOnly,
        is_active: true,
        icebreaker_prompt: getRandomIcebreaker(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Helper: Join room
  private static async joinRoom(roomId: string, userId: string) {
    // Add participant
    const { error: participantError } = await supabase
      .from('room_participants')
      .insert({ room_id: roomId, user_id: userId });

    if (participantError) throw participantError;

    // Increment room count
    const { error: updateError } = await supabase.rpc('increment_room_count', {
      room_id: roomId,
    });

    if (updateError) throw updateError;
  }

  // Helper: Get room participants
  private static async getRoomParticipants(roomId: string): Promise<string[]> {
    const { data } = await supabase
      .from('room_participants')
      .select('users(username)')
      .eq('room_id', roomId);

    return data?.map((p: any) => p.users.username) || [];
  }

  // Cancel matchmaking
  static cancelMatching(userId: string) {
    const interval = this.matchingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.matchingIntervals.delete(userId);
    }
  }

  // Leave room
  static async leaveRoom(roomId: string, userId: string) {
    // Remove participant
    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    // Decrement count or deactivate room
    const { data: room } = await supabase
      .from('rooms')
      .select('current_count')
      .eq('id', roomId)
      .single();

    if (room && room.current_count <= 1) {
      // Last person left, deactivate room
      await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', roomId);
    } else {
      // Decrement count
      await supabase.rpc('decrement_room_count', { room_id: roomId });
    }
  }
}

// SQL Functions needed in Supabase (add to your schema):
/*
-- Function to increment room count
CREATE OR REPLACE FUNCTION increment_room_count(room_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE rooms 
  SET current_count = current_count + 1 
  WHERE id = room_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement room count
CREATE OR REPLACE FUNCTION decrement_room_count(room_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE rooms 
  SET current_count = GREATEST(current_count - 1, 0)
  WHERE id = room_id;
END;
$$ LANGUAGE plpgsql;
*/