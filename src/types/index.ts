export type UserMode = 'anonymous' | 'verified';

export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export type RoomType = 'small_group' | 'one_to_one' | 'mega_chat';

export type BadgeType = 'verified' | 'streak' | 'party_animal' | 'night_owl' | 'funniest';

export interface User {
  id: string;
  username: string;
  isVerified: boolean;
  gender: Gender;
  collegeEmail?: string;
  collegeName?: string;
  karmaPoints: number;
  isAnonymous: boolean;
  badges: BadgeType[];
  dailyMessageCount: number;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  isVerifiedAuthor: boolean;
  reactions: {
    fire: number;
    laugh: number;
    heart: number;
    eyes: number;
  };
  isPinned: boolean;
  createdAt: Date;
}

export interface Room {
  id: string;
  roomType: RoomType;
  roomSize: number;
  currentCount: number;
  isVerifiedOnly: boolean;
  isActive: boolean;
  icebreakerPrompt?: string;
  participants: User[];
  messages: Message[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  isVerified: boolean;
}