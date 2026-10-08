import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Search, UserPlus, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useChatStore } from "../../store/chat";
import Avatar from "../Avatar";
import type { User } from "../../types";

interface NewChatModalProps {
  onClose: () => void;
}

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const navigate = useNavigate();
  const { loadConversations } = useChatStore();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { users } = await api.users.search(q);
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId: string) => {
    try {
      const { conversation } = await api.conversations.createDirect({ targetUserId: userId });
      await loadConversations();
      onClose();
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      console.error("Start chat error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">New Chat</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg">
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search by username or name..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && <p className="text-center text-sm text-[var(--text-secondary)] py-4">Searching...</p>}
          {!loading && results.length === 0 && search.trim().length >= 2 && (
            <p className="text-center text-sm text-[var(--text-secondary)] py-4">No users found</p>
          )}
          {!loading && search.trim().length < 2 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">Search for people by their username to start chatting</p>
            </div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u.id)}
              className="flex items-center gap-3 w-full p-3 hover:bg-[var(--bg-tertiary)] transition text-left"
            >
              <Avatar name={u.profile?.displayName} src={u.profile?.photoUrl} size="md" online={u.isOnline} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] truncate">{u.profile?.displayName}</p>
                <p className="text-sm text-[var(--text-secondary)] truncate">@{u.username}</p>
              </div>
              <UserPlus size={18} className="text-noris-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
