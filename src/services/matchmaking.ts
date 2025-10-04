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
  private static realtimeSubscriptions: Map<string, any> = new Map();

  static async findMatch(options: MatchOptions): Promise<MatchResult> {
    const { userId, roomSize, isVerified } = options;

    try {
      // Try to find existing room with available space
      const { data: existingRooms, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_size', roomSize)
        .eq('is_verified_only', isVerified)
        .eq('is_active', true)
        .lt('current_count', roomSize)
        .order('created_at', { ascending: true })
        .limit(1);

      if (roomError) throw roomError;

      if (existingRooms && existingRooms.length > 0) {
        const room = existingRooms[0];
        await this.joinRoom(room.id, userId);
        
        const participants = await this.getRoomParticipants(room.id);
        
        return {
          roomId: room.id,
          participants,
          icebreaker: room.icebreaker_prompt || getRandomIcebreaker(),
        };
      }

      // Create new room
      const { data: newRoom, error: createError } = await supabase
        .from('rooms')
        .insert({
          room_type: 'small_group',
          room_size: roomSize,
          current_count: 0,
          is_verified_only: isVerified,
          is_active: true,
          icebreaker_prompt: getRandomIcebreaker(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!newRoom) throw new Error('Failed to create room');

      await this.joinRoom(newRoom.id, userId);

      // Wait for other participants with realtime
      return await this.waitForParticipants(newRoom.id, roomSize, userId);

    } catch (error) {
      console.error('Matching error:', error);
      throw error;
    }
  }

  static async findOppositeGenderMatch(userId: string, userGender: string): Promise<MatchResult> {
    const oppositeGender = userGender === 'male' ? 'female' : 'male';

    try {
      // Find waiting rooms with opposite gender
      const { data: waitingRooms, error: roomError } = await supabase
        .from('rooms')
        .select(`
          id,
          icebreaker_prompt,
          current_count,
          room_participants!inner (
            user_id,
            users!inner (gender)
          )
        `)
        .eq('room_type', 'one_to_one')
        .eq('is_active', true)
        .eq('current_count', 1);

      if (roomError) throw roomError;

      const matchingRoom = waitingRooms?.find(room => {
        const participants = room.room_participants as any[];
        if (participants && participants.length > 0) {
          const participant = participants[0];
          return participant?.users?.gender === oppositeGender;
        }
        return false;
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
      const { data: newRoom, error: createError } = await supabase
        .from('rooms')
        .insert({
          room_type: 'one_to_one',
          room_size: 2,
          current_count: 0,
          is_verified_only: true,
          is_active: true,
          icebreaker_prompt: getRandomIcebreaker(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!newRoom) throw new Error('Failed to create room');

      await this.joinRoom(newRoom.id, userId);

      return await this.waitForParticipants(newRoom.id, 2, userId);

    } catch (error) {
      console.error('Opposite gender matching error:', error);
      throw error;
    }
  }

  private static async waitForParticipants(
    roomId: string,
    requiredCount: number,
    userId: string
  ): Promise<MatchResult> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const channel = supabase
        .channel(`room_matching_${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`,
          },
          async (payload) => {
            if (resolved) return;
            
            const room = payload.new as any;
            
            if (room.current_count >= requiredCount) {
              resolved = true;
              
              // Cleanup
              this.cleanupMatching(userId, roomId);
              
              const participants = await this.getRoomParticipants(roomId);
              
              resolve({
                roomId,
                participants,
                icebreaker: room.icebreaker_prompt || getRandomIcebreaker(),
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to room matching: ${roomId}`);
          }
        });

      this.realtimeSubscriptions.set(userId, channel);

      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupMatching(userId, roomId);
          this.leaveRoom(roomId, userId);
          reject(new Error('Matching timeout - no participants found'));
        }
      }, 30000);

      this.matchingIntervals.set(userId, timeout);
    });
  }

  private static async joinRoom(roomId: string, userId: string) {
    try {
      // Check if already in room
      const { data: existing } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return;
      }

      // Add participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({ room_id: roomId, user_id: userId });

      if (participantError && participantError.code !== '23505') {
        throw participantError;
      }

      // Increment room count atomically (via RPC or SQL function)
      await supabase.rpc('increment_room_count', { room_id: roomId });

    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  private static async getRoomParticipants(roomId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('users!inner(username)')
        .eq('room_id', roomId);

      if (error) {
        console.error('Error getting participants:', error);
        return [];
      }

      return (data || [])
  .filter((p: any) => p.users && Array.isArray(p.users) && p.users[0])
  .map((p: any) => p.users[0].username);
        
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  }

  static cancelMatching(userId: string) {
    this.cleanupMatching(userId, null);
  }

  private static cleanupMatching(userId: string, roomId: string | null) {
    const timeout = this.matchingIntervals.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.matchingIntervals.delete(userId);
    }

    const channel = this.realtimeSubscriptions.get(userId);
    if (channel) {
      supabase.removeChannel(channel);
      this.realtimeSubscriptions.delete(userId);
    }
  }

  static async leaveRoom(roomId: string, userId: string) {
    try {
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      const { data: room } = await supabase
        .from('rooms')
        .select('current_count')
        .eq('id', roomId)
        .single();

      if (room && room.current_count <= 1) {
        await supabase
          .from('rooms')
          .update({ is_active: false })
          .eq('id', roomId);
      } else {
        // Decrement room count atomically
        await supabase.rpc('decrement_room_count', { room_id: roomId });
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }
}
