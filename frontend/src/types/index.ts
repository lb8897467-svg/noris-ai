export interface User {
  id: string;
  phone: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN" | "MODERATOR";
  isOnline?: boolean;
  lastSeen?: string;
  profile?: Profile;
  settings?: UserSettings;
}

export interface Profile {
  id: string;
  displayName: string;
  bio?: string;
  photoUrl?: string;
  status?: string;
}

export interface UserSettings {
  phoneVisibility: "EVERYONE" | "CONTACTS" | "NOBODY";
  emailVisibility: "EVERYONE" | "CONTACTS" | "NOBODY";
  lastSeenVisibility: "EVERYONE" | "CONTACTS" | "NOBODY";
  profilePhotoVisibility: "EVERYONE" | "CONTACTS" | "NOBODY";
  whoCanCall: "EVERYONE" | "CONTACTS" | "NOBODY";
  whoCanAddToGroups: "EVERYONE" | "CONTACTS" | "NOBODY";
  whoCanFindByPhone: "EVERYONE" | "CONTACTS" | "NOBODY";
  notifMessages: boolean;
  notifCalls: boolean;
  notifPreviews: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  notifSound?: string;
  theme: string;
  accentColor: string;
  language: string;
  messageRetentionDays?: number;
  twoStepEnabled: boolean;
}

export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP" | "CHANNEL";
  title?: string;
  description?: string;
  photoUrl?: string;
  members?: ConversationMember[];
  messages?: Message[];
  unreadCount?: number;
  draftText?: string;
  muted?: boolean;
  archived?: boolean;
  lastReadAt?: string;
  otherUser?: User;
  role?: string;
  updatedAt?: string;
}

export interface ConversationMember {
  id: string;
  userId: string;
  user: User;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  muted: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  text?: string;
  type: "TEXT" | "PHOTO" | "VIDEO" | "VOICE" | "DOCUMENT" | "CONTACT_CARD" | "LOCATION" | "SYSTEM";
  replyToId?: string;
  replyTo?: Message;
  editedAt?: string;
  deletedForEveryone?: boolean;
  pinned?: boolean;
  attachments?: Attachment[];
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  user?: User;
  emoji: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  sender: User;
  receiverId: string;
  receiver: User;
  status: string;
  message?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  targetId: string;
  target: User;
  nickname?: string;
  isFavorite: boolean;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  type: "PHOTO" | "VIDEO" | "TEXT";
  mediaUrl?: string;
  text?: string;
  backgroundColor?: string;
  audience: string;
  expiresAt: string;
  viewedBy: string[];
  hasViewed?: boolean;
  createdAt: string;
}

export interface Call {
  id: string;
  initiatorId: string;
  initiator: User;
  receiverId?: string;
  receiver?: User;
  type: "VOICE" | "VIDEO";
  status: "OUTGOING" | "INCOMING" | "MISSED" | "DECLINED" | "ACCEPTED" | "ENDED";
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Channel {
  id: string;
  username: string;
  title: string;
  description?: string;
  photoUrl?: string;
  isPublic: boolean;
  subscriberCount: number;
  ownerId: string;
  conversationId?: string;
  isMember?: boolean;
}
