import { useEffect, useState } from "react";
import { Users, MessageSquare, AlertTriangle, Radio, Activity, Shield } from "lucide-react";
import { api } from "../lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "reports">("overview");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStats();
    loadReports();
  }, []);

  const loadStats = async () => {
    try {
      const { stats } = await api.admin.stats();
      setStats(stats);
    } catch (err) {
      console.error("Load stats error:", err);
    }
  };

  const loadReports = async () => {
    try {
      const { reports } = await api.admin.reports();
      setReports(reports);
    } catch (err) {
      console.error("Load reports error:", err);
    }
  };

  const loadUsers = async (q: string) => {
    try {
      const { users } = await api.admin.users(1, q);
      setUsers(users);
    } catch (err) {
      console.error("Load users error:", err);
    }
  };

  const statCards = [
    { icon: Users, label: "Total Users", value: stats?.users || 0, color: "bg-blue-500" },
    { icon: Activity, label: "Active Now", value: stats?.activeUsers || 0, color: "bg-green-500" },
    { icon: MessageSquare, label: "Messages", value: stats?.messages || 0, color: "bg-noris-500" },
    { icon: Radio, label: "Channels", value: stats?.channels || 0, color: "bg-purple-500" },
    { icon: AlertTriangle, label: "Pending Reports", value: stats?.reports || 0, color: "bg-orange-500" },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={22} className="text-noris-500" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          {["overview", "users", "reports"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t as any);
                if (t === "users") loadUsers("");
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${tab === t ? "bg-noris-500 text-white" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-[var(--bg-tertiary)]">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-2`}>
                  <s.icon size={20} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p>
                <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">System Health</h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-[var(--text-primary)]">All systems operational</span>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="p-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); loadUsers(e.target.value); }}
            className="w-full mb-4 px-4 py-2.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
          />
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-noris-400 to-noris-600 flex items-center justify-center text-white font-semibold">
                  {u.profile?.displayName?.[0] || "?"}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{u.profile?.displayName} <span className="text-xs text-[var(--text-secondary)]">@{u.username}</span></p>
                  <p className="text-xs text-[var(--text-secondary)]">{u.phone} · {u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-red-500/20 text-red-500" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div className="p-4 space-y-2">
          {reports.length === 0 ? (
            <p className="text-center text-[var(--text-secondary)] py-8">No reports</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{r.reason}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-orange-500/20 text-orange-500" : "bg-green-500/20 text-green-500"}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{r.description || "No description"}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Reported by {r.reporter?.profile?.displayName || r.reporter?.username} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
                {r.status === "pending" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={async () => { await api.admin.updateReport(r.id, "resolved"); loadReports(); }} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs">Resolve</button>
                    <button onClick={async () => { await api.admin.updateReport(r.id, "dismissed"); loadReports(); }} className="px-3 py-1 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs">Dismiss</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
