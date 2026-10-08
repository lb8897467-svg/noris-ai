import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, Users, Phone, Circle, Settings, Menu, LogOut, Search } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useChatStore } from "../store/chat";
import { cn } from "../utils/cn";
import Avatar from "../components/Avatar";
import ChatList from "../components/chat/ChatList";
import ChatView from "../components/chat/ChatView";
import ContactsPage from "./ContactsPage";
import CallsPage from "./CallsPage";
import StoriesPage from "./StoriesPage";
import SettingsPage from "./SettingsPage";
import AdminPage from "./AdminPage";
import NewChatModal from "../components/chat/NewChatModal";

export default function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { loadConversations } = useChatStore();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const tabs = [
    { icon: MessageCircle, label: "Chats", path: "/" },
    { icon: Users, label: "Contacts", path: "/contacts" },
    { icon: Phone, label: "Calls", path: "/calls" },
    { icon: Circle, label: "Stories", path: "/stories" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const isAdmin = user?.role === "ADMIN" || user?.role === "MODERATOR";

  return (
    <div className="flex h-full w-full bg-[var(--bg-secondary)]">
      {/* Sidebar — desktop */}
      <div className="hidden md:flex flex-col w-16 lg:w-72 bg-[var(--bg-primary)] border-r border-[var(--border)]">
        {/* Logo / header */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-xl bg-noris-500 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-7 h-7">
              <path d="M50 22 C33 22 20 33 20 48 C20 54 22 60 26 64 L22 78 L38 74 C42 76 46 76 50 76 C67 76 80 65 80 50 C80 35 67 22 50 22 Z" fill="white"/>
              <circle cx="38" cy="48" r="4" fill="#0088cc"/>
              <circle cx="50" cy="48" r="4" fill="#0088cc"/>
              <circle cx="62" cy="48" r="4" fill="#0088cc"/>
            </svg>
          </div>
          <span className="hidden lg:block text-xl font-bold text-[var(--text-primary)]">Noris</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 p-2">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path || (tab.path === "/" && location.pathname.startsWith("/chat"));
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition justify-center lg:justify-start",
                  active
                    ? "bg-noris-500 text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                )}
              >
                <tab.icon size={22} />
                <span className="hidden lg:block font-medium">{tab.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition justify-center lg:justify-start",
                location.pathname === "/admin"
                  ? "bg-noris-500 text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              )}
            >
              <Settings size={22} />
              <span className="hidden lg:block font-medium">Admin</span>
            </button>
          )}
        </nav>

        {/* User profile */}
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition w-full justify-center lg:justify-start"
          >
            <Avatar name={user?.profile?.displayName} src={user?.profile?.photoUrl} size="md" online />
            <div className="hidden lg:block text-left overflow-hidden">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.profile?.displayName}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">@{user?.username}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatList onNewChat={() => setShowNewChat(true)} />} />
          <Route path="/chat/:conversationId" element={<ChatView />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] border-t border-[var(--border)] flex justify-around items-center h-16 z-50">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path || (tab.path === "/" && location.pathname.startsWith("/chat"));
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn("p-2 rounded-lg transition", active ? "text-noris-500" : "text-[var(--text-secondary)]")}
            >
              <tab.icon size={24} />
            </button>
          );
        })}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
