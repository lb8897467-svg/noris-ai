import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Send, Search, MoreVertical, Phone, Video, Paperclip,
  Smile, Reply, Copy, Trash2, Edit2, Pin, Check, CheckCheck, X, Mic
} from "lucide-react";
import { useChatStore } from "../../store/chat";
import { useAuthStore } from "../../store/auth";
import { api } from "../../lib/api";
import Avatar from "../Avatar";
import { formatTime, formatLastSeen, cn } from "../../utils/cn";
import type { Message } from "../../types";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function ChatView() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeConversation, setActiveConversation, loadMessages, messages,
    sendMessage, typingUsers, emitTyping, markRead, deleteMessage,
  } = useChatStore();

  const [text, setText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: Message; x: number; y: number } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(null);
      api.conversations.get(conversationId).then(({ conversation }) => {
        setActiveConversation(conversation);
        loadMessages(conversationId);
      }).catch(() => navigate("/"));
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Close context menu on click
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const conv = activeConversation;
  if (!conv) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
        Loading...
      </div>
    );
  }

  const name = conv.type === "DIRECT" ? conv.otherUser?.profile?.displayName || "Unknown" : conv.title || "Group";
  const photo = conv.type === "DIRECT" ? conv.otherUser?.profile?.photoUrl : conv.photoUrl;
  const online = conv.type === "DIRECT" ? conv.otherUser?.isOnline : false;
  const lastSeen = conv.type === "DIRECT" ? conv.otherUser?.lastSeen : undefined;

  const handleSend = async () => {
    if (!text.trim() || !conversationId) return;
    const msgText = text.trim();
    setText("");
    if (editingMessage) {
      await api.conversations.editMessage(conversationId, editingMessage.id, msgText);
      setEditingMessage(null);
    } else {
      await sendMessage(conversationId, msgText, replyTo?.id);
    }
    setReplyTo(null);
    emitTyping(conversationId, false);
  };

  const handleTyping = (value: string) => {
    setText(value);
    if (conversationId) {
      emitTyping(conversationId, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => emitTyping(conversationId, false), 2000);
    }
  };

  const handleSearch = async () => {
    if (!conversationId || !searchQuery.trim()) return;
    const { messages } = await api.conversations.search(conversationId, searchQuery);
    setSearchResults(messages);
  };

  const handleContextAction = async (action: string, message: Message) => {
    setContextMenu(null);
    if (!conversationId) return;

    switch (action) {
      case "reply":
        setReplyTo(message);
        break;
      case "copy":
        if (message.text) navigator.clipboard.writeText(message.text);
        break;
      case "edit":
        setEditingMessage(message);
        setText(message.text || "");
        break;
      case "delete-self":
        await deleteMessage(conversationId, message.id, false);
        break;
      case "delete-all":
        await deleteMessage(conversationId, message.id, true);
        break;
      case "pin":
        await api.conversations.pin(conversationId, message.id);
        break;
      case "react":
        await api.conversations.react(conversationId, message.id, "👍");
        break;
    }
  };

  const typingArray = Array.from(typingUsers);
  const isTyping = typingArray.length > 0 && conv.type === "DIRECT";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border-b border-[var(--border)] z-10">
        <button onClick={() => navigate("/")} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition">
          <ArrowLeft size={22} className="text-[var(--text-secondary)]" />
        </button>
        <Avatar name={name} src={photo} size="md" online={online} onClick={() => navigate(`/settings`)} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] truncate">{name}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {isTyping ? (
              <span className="text-noris-500">typing...</span>
            ) : online ? (
              "online"
            ) : lastSeen ? (
              `last seen ${formatLastSeen(lastSeen)}`
            ) : conv.type === "GROUP" ? (
              `${conv.members?.length || 0} members`
            ) : (
              "offline"
            )}
          </p>
        </div>
        <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition">
          <Search size={20} className="text-[var(--text-secondary)]" />
        </button>
        <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition">
          <Phone size={20} className="text-[var(--text-secondary)]" />
        </button>
        <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition">
          <Video size={20} className="text-[var(--text-secondary)]" />
        </button>
        <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition">
          <MoreVertical size={20} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="p-3 bg-[var(--bg-primary)] border-b border-[var(--border)] flex gap-2">
          <input
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
          />
          <button onClick={handleSearch} className="px-4 py-2 rounded-full bg-noris-500 text-white text-sm font-medium">
            Search
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
            No messages. Say hello! 👋
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.senderId === user?.id;
            const prevMsg = messages[i - 1];
            const showAvatar = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);
            const showName = conv.type !== "DIRECT" && !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);

            return (
              <div
                key={msg.id}
                className={cn("flex gap-2 group", isOwn ? "justify-end" : "justify-start")}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
                }}
              >
                {!isOwn && (
                  <div className="w-8 shrink-0">
                    {showAvatar && <Avatar name={msg.sender?.profile?.displayName} src={msg.sender?.profile?.photoUrl} size="sm" />}
                  </div>
                )}
                <div className={cn("max-w-[75%] md:max-w-[60%]")}>
                  {showName && (
                    <p className="text-xs font-semibold text-noris-500 mb-0.5 ml-1">
                      {msg.sender?.profile?.displayName || msg.sender?.username}
                    </p>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 relative",
                      isOwn ? "bubble-out rounded-br-md" : "bubble-in rounded-bl-md shadow-sm"
                    )}
                  >
                    {msg.replyTo && (
                      <div className={cn("text-xs mb-1 pb-1 border-b border-current/20 opacity-70")}>
                        <p className="font-semibold">{msg.replyTo.sender?.profile?.displayName || "User"}</p>
                        <p className="truncate">{msg.replyTo.text || "Message"}</p>
                      </div>
                    )}
                    {msg.deletedForEveryone ? (
                      <p className="italic opacity-60 text-sm">🚫 Message deleted</p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                    {msg.attachments?.map((att) => (
                      <div key={att.id} className="mt-2">
                        {att.fileType === "image" && (
                          <img src={att.fileUrl} alt={att.fileName} className="rounded-lg max-w-full" />
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-1 mt-0.5 -mb-0.5">
                      <span className={cn("text-[10px]", isOwn ? "text-white/70" : "text-[var(--text-secondary)]")}>
                        {msg.editedAt && "edited "}
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOwn && !msg.deletedForEveryone && (
                        <CheckCheck size={12} className={isOwn ? "text-white/70" : "text-[var(--text-secondary)]"} />
                      )}
                    </div>
                  </div>
                  {/* Quick reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <span key={emoji} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)]">
                          {emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-[var(--bg-primary)] border-t border-[var(--border)] flex items-center gap-2">
          <Reply size={16} className="text-noris-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-noris-500">Replying to {replyTo.sender?.profile?.displayName || "User"}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{replyTo.text || "Message"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-[var(--bg-tertiary)] rounded">
            <X size={16} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-[var(--bg-primary)] border-t border-[var(--border)] flex items-end gap-2">
        <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition">
          <Paperclip size={22} className="text-[var(--text-secondary)]" />
        </button>
        <div className="flex-1 flex items-end gap-2 bg-[var(--bg-tertiary)] rounded-2xl px-3 py-2">
          <textarea
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
            rows={1}
            className="flex-1 bg-transparent text-[var(--text-primary)] text-sm resize-none max-h-32 no-scrollbar"
            style={{ minHeight: "24px" }}
          />
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1">
            <Smile size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>
        {text.trim() ? (
          <button
            onClick={handleSend}
            className="p-3 rounded-full bg-noris-500 text-white hover:bg-noris-600 transition"
          >
            <Send size={20} />
          </button>
        ) : (
          <button className="p-3 rounded-full bg-noris-500 text-white hover:bg-noris-600 transition">
            <Mic size={20} />
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[var(--bg-primary)] rounded-xl shadow-2xl border border-[var(--border)] py-1 min-w-[180px] animate-fade-in"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 border-b border-[var(--border)] flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={async () => {
                  if (conversationId) await api.conversations.react(conversationId, contextMenu.message.id, emoji);
                  setContextMenu(null);
                }}
                className="text-lg hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
          <ContextItem icon={Reply} label="Reply" onClick={() => handleContextAction("reply", contextMenu.message)} />
          <ContextItem icon={Copy} label="Copy" onClick={() => handleContextAction("copy", contextMenu.message)} />
          {contextMenu.message.senderId === user?.id && !contextMenu.message.deletedForEveryone && (
            <ContextItem icon={Edit2} label="Edit" onClick={() => handleContextAction("edit", contextMenu.message)} />
          )}
          <ContextItem icon={Pin} label="Pin" onClick={() => handleContextAction("pin", contextMenu.message)} />
          <ContextItem icon={Trash2} label="Delete for me" onClick={() => handleContextAction("delete-self", contextMenu.message)} danger />
          {contextMenu.message.senderId === user?.id && (
            <ContextItem icon={Trash2} label="Delete for everyone" onClick={() => handleContextAction("delete-all", contextMenu.message)} danger />
          )}
        </div>
      )}
    </div>
  );
}

function ContextItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition text-left",
        danger ? "text-red-500" : "text-[var(--text-primary)]"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
