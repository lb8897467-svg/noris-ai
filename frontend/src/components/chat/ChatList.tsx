import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Edit, Archive } from "lucide-react";
import { useChatStore } from "../../store/chat";
import { useAuthStore } from "../../store/auth";
import Avatar from "../Avatar";
import { formatDate, cn } from "../../utils/cn";

interface ChatListProps {
  onNewChat: () => void;
}

export default function ChatList({ onNewChat }: ChatListProps) {
  const navigate = useNavigate();
  const { conversations, loadConversations } = useChatStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = c.type === "DIRECT" ? c.otherUser?.profile?.displayName : c.title;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Chats</h1>
        <button
          onClick={onNewChat}
          className="p-2 rounded-full bg-noris-500 text-white hover:bg-noris-600 transition"
        >
          <Edit size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 bg-[var(--bg-primary)]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm border border-transparent focus:border-noris-500 transition"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <MessageCircleIcon />
            </div>
            <p className="text-[var(--text-secondary)] font-medium">No chats yet</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Start a conversation with someone</p>
            <button
              onClick={onNewChat}
              className="mt-4 px-6 py-2.5 rounded-full bg-noris-500 text-white font-medium hover:bg-noris-600 transition"
            >
              New Chat
            </button>
          </div>
        ) : (
          filtered.map((conv) => {
            const name = conv.type === "DIRECT" ? conv.otherUser?.profile?.displayName || "Unknown" : conv.title || "Group";
            const photo = conv.type === "DIRECT" ? conv.otherUser?.profile?.photoUrl : conv.photoUrl;
            const online = conv.type === "DIRECT" ? conv.otherUser?.isOnline : false;
            const lastMsg = conv.messages?.[0];
            const lastMsgText = lastMsg
              ? lastMsg.type === "TEXT"
                ? lastMsg.text
                : lastMsg.type === "PHOTO"
                ? "📷 Photo"
                : lastMsg.type === "VIDEO"
                ? "🎥 Video"
                : lastMsg.type === "VOICE"
                ? "🎤 Voice message"
                : lastMsg.type === "DOCUMENT"
                ? "📄 Document"
                : lastMsg.type === "LOCATION"
                ? "📍 Location"
                : "Message"
              : "No messages yet";

            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="flex items-center gap-3 w-full p-3 hover:bg-[var(--bg-tertiary)] transition text-left border-b border-[var(--border)]"
              >
                <Avatar name={name} src={photo} size="lg" online={online} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{name}</p>
                    <span className="text-xs text-[var(--text-secondary)] shrink-0 ml-2">
                      {lastMsg ? formatDate(lastMsg.createdAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      {lastMsg?.senderId === user?.id && "You: "}
                      {lastMsgText}
                    </p>
                    {conv.unreadCount ? (
                      <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-noris-500 text-white text-xs flex items-center justify-center font-semibold">
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function MessageCircleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)]">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
