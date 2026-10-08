import { useEffect, useState } from "react";
import { Search, UserPlus, UserCheck, UserX, Bell } from "lucide-react";
import { api } from "../lib/api";
import Avatar from "../components/Avatar";
import { useNavigate } from "react-router-dom";
import type { Contact, FriendRequest } from "../types";

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"contacts" | "requests">("contacts");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contactsRes, requestsRes] = await Promise.all([
        api.contacts.list(),
        api.contacts.receivedRequests(),
      ]);
      setContacts(contactsRes.contacts);
      setRequests(requestsRes.requests);
    } catch (err) {
      console.error("Load contacts error:", err);
    }
  };

  const handleRequest = async (id: string, status: "accepted" | "rejected") => {
    await api.contacts.updateRequest(id, status);
    loadData();
  };

  const startChat = async (userId: string) => {
    const { conversation } = await api.conversations.createDirect({ targetUserId: userId });
    navigate(`/chat/${conversation.id}`);
  };

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    return c.target.profile?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
           c.target.username.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">Contacts</h1>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setTab("contacts")}
          className={`flex-1 py-3 text-sm font-medium transition ${tab === "contacts" ? "text-noris-500 border-b-2 border-noris-500" : "text-[var(--text-secondary)]"}`}
        >
          Contacts ({contacts.length})
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`flex-1 py-3 text-sm font-medium transition ${tab === "requests" ? "text-noris-500 border-b-2 border-noris-500" : "text-[var(--text-secondary)]"}`}
        >
          Requests ({requests.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "contacts" ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <UserPlus size={28} className="text-[var(--text-secondary)]" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">No contacts yet</p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Search for users to add them</p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => startChat(c.targetId)}
                className="flex items-center gap-3 w-full p-3 hover:bg-[var(--bg-tertiary)] transition text-left border-b border-[var(--border)]"
              >
                <Avatar name={c.target.profile?.displayName} src={c.target.profile?.photoUrl} size="md" online={c.target.isOnline} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{c.target.profile?.displayName}</p>
                  <p className="text-sm text-[var(--text-secondary)] truncate">
                    {c.target.isOnline ? "online" : `last seen ${c.target.lastSeen ? new Date(c.target.lastSeen).toLocaleDateString() : "recently"}`}
                  </p>
                </div>
              </button>
            ))
          )
        ) : (
          requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <Bell size={28} className="text-[var(--text-secondary)]" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">No pending requests</p>
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
                <Avatar name={r.sender.profile?.displayName} src={r.sender.profile?.photoUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{r.sender.profile?.displayName}</p>
                  <p className="text-sm text-[var(--text-secondary)] truncate">@{r.sender.username}</p>
                </div>
                <button onClick={() => handleRequest(r.id, "accepted")} className="p-2 rounded-full bg-noris-500 text-white hover:bg-noris-600 transition">
                  <UserCheck size={18} />
                </button>
                <button onClick={() => handleRequest(r.id, "rejected")} className="p-2 rounded-full bg-[var(--bg-tertiary)] text-red-500 hover:bg-red-500 hover:text-white transition">
                  <UserX size={18} />
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
