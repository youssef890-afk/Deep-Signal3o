export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface PostWithDetails extends Post {
  profile: Profile | null;
  likes: Like[];
  like_count: number;
  has_liked: boolean;
}

export interface Conversation {
  otherUser: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}
