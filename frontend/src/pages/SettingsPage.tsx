import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Bell, Palette, Globe, HelpCircle, LogOut, Shield,
  Smartphone, Database, ChevronRight, Moon, Sun, Monitor, Trash2, Download
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { api } from "../lib/api";
import Avatar from "../components/Avatar";
import { cn } from "../utils/cn";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme } = useAuthStore();
  const [section, setSection] = useState<string | null>(null);

  const sections = [
    { icon: User, label: "Account", desc: "Name, username, photo", key: "account" },
    { icon: Lock, label: "Privacy & Security", desc: "Visibility, blocked users, 2FA", key: "privacy" },
    { icon: Bell, label: "Notifications", desc: "Message, call, sound preferences", key: "notifications" },
    { icon: Smartphone, label: "Devices", desc: "Active sessions", key: "devices" },
    { icon: Palette, label: "Appearance", desc: "Theme, colors", key: "appearance" },
    { icon: Globe, label: "Language", desc: "App language", key: "language" },
    { icon: Database, label: "Data & Storage", desc: "Export, retention, delete account", key: "data" },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQ, report a problem", key: "help" },
  ];

  if (section) {
    return <SettingsSection section={section} onBack={() => setSection(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
      </div>

      {/* Profile header */}
      <button
        onClick={() => setSection("account")}
        className="flex items-center gap-4 p-4 hover:bg-[var(--bg-tertiary)] transition border-b border-[var(--border)]"
      >
        <Avatar name={user?.profile?.displayName} src={user?.profile?.photoUrl} size="xl" online />
        <div className="flex-1 text-left">
          <p className="text-lg font-bold text-[var(--text-primary)]">{user?.profile?.displayName}</p>
          <p className="text-sm text-[var(--text-secondary)]">@{user?.username}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{user?.phone} · {user?.email}</p>
        </div>
        <ChevronRight size={20} className="text-[var(--text-secondary)]" />
      </button>

      {/* Settings sections */}
      <div className="py-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className="flex items-center gap-4 w-full p-4 hover:bg-[var(--bg-tertiary)] transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
              <s.icon size={20} className="text-noris-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--text-primary)]">{s.label}</p>
              <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
            </div>
            <ChevronRight size={18} className="text-[var(--text-secondary)]" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="p-4">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition font-medium"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>

      <div className="text-center pb-6">
        <p className="text-xs text-[var(--text-secondary)]">Noris v1.0.0</p>
      </div>
    </div>
  );
}

function SettingsSection({ section, onBack }: { section: string; onBack: () => void }) {
  const { user, theme, setTheme, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || "");
  const [bio, setBio] = useState(user?.profile?.bio || "");
  const [status, setStatus] = useState(user?.profile?.status || "");
  const [settings, setSettings] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (section === "privacy" || section === "notifications") {
      api.settings.get().then(({ settings }) => setSettings(settings));
    }
    if (section === "devices") {
      api.auth.sessions().then(({ sessions }) => setSessions(sessions));
    }
    if (section === "privacy") {
      api.contacts.blocked().then(({ blocked }) => setBlocked(blocked));
    }
  }, [section]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.users.updateProfile({ displayName, bio, status });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (key: string, value: any) => {
    try {
      const { settings: updated } = await api.settings.update({ [key]: value });
      setSettings(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This will permanently delete your account and all data.")) return;
    try {
      await api.settings.deleteAccount({ password: "" });
      await logout();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExport = async () => {
    const data = await api.settings.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "noris-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibilityOptions = [
    { value: "EVERYONE", label: "Everyone" },
    { value: "CONTACTS", label: "Contacts" },
    { value: "NOBODY", label: "Nobody" },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
        <button onClick={onBack} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition">
          <ChevronRight size={22} className="text-[var(--text-secondary)] rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)] capitalize">{section}</h1>
      </div>

      {section === "account" && (
        <div className="p-4 space-y-4">
          <div className="flex flex-col items-center mb-4">
            <Avatar name={displayName} src={user?.profile?.photoUrl} size="xl" />
            <button className="mt-2 text-sm text-noris-500 font-medium">Change Photo</button>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] font-medium">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] font-medium">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] resize-none" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] font-medium">Status</label>
            <input value={status} onChange={(e) => setStatus(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] font-medium">Username</label>
            <div className="flex items-center mt-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)]">
              <span className="text-[var(--text-secondary)]">@</span>
              <span className="text-[var(--text-primary)]">{user?.username}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] font-medium">Phone (private)</label>
            <div className="flex items-center mt-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)]">
              <span className="text-[var(--text-primary)]">{user?.phone}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] font-medium">Email (private)</label>
            <div className="flex items-center mt-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)]">
              <span className="text-[var(--text-primary)]">{user?.email}</span>
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="w-full py-3 rounded-xl bg-noris-500 text-white font-semibold hover:bg-noris-600 transition disabled:opacity-50">
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      )}

      {section === "privacy" && settings && (
        <div className="p-4 space-y-1">
          <PrivacySelect label="Phone Number Visibility" value={settings.phoneVisibility} onChange={(v) => handleSaveSettings("phoneVisibility", v)} options={visibilityOptions} />
          <PrivacySelect label="Email Visibility" value={settings.emailVisibility} onChange={(v) => handleSaveSettings("emailVisibility", v)} options={visibilityOptions} />
          <PrivacySelect label="Last Seen & Online" value={settings.lastSeenVisibility} onChange={(v) => handleSaveSettings("lastSeenVisibility", v)} options={visibilityOptions} />
          <PrivacySelect label="Profile Photo" value={settings.profilePhotoVisibility} onChange={(v) => handleSaveSettings("profilePhotoVisibility", v)} options={visibilityOptions} />
          <PrivacySelect label="Who Can Call" value={settings.whoCanCall} onChange={(v) => handleSaveSettings("whoCanCall", v)} options={visibilityOptions} />
          <PrivacySelect label="Who Can Add to Groups" value={settings.whoCanAddToGroups} onChange={(v) => handleSaveSettings("whoCanAddToGroups", v)} options={visibilityOptions} />
          <PrivacySelect label="Who Can Find by Phone" value={settings.whoCanFindByPhone} onChange={(v) => handleSaveSettings("whoCanFindByPhone", v)} options={visibilityOptions} />

          <div className="pt-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Blocked Users</h3>
            {blocked.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No blocked users</p>
            ) : (
              blocked.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2">
                  <Avatar name={u.profile?.displayName} src={u.profile?.photoUrl} size="sm" />
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{u.profile?.displayName}</span>
                  <button onClick={async () => { await api.contacts.unblock(u.id); api.contacts.blocked().then(({ blocked }) => setBlocked(blocked)); }} className="text-sm text-noris-500">Unblock</button>
                </div>
              ))
            )}
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Two-Step Verification</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              {settings.twoStepEnabled ? "✅ Enabled" : "Add an extra layer of security"}
            </p>
            {!settings.twoStepEnabled && (
              <button className="px-4 py-2 rounded-xl bg-noris-500 text-white text-sm font-medium">Enable</button>
            )}
          </div>
        </div>
      )}

      {section === "notifications" && settings && (
        <div className="p-4 space-y-1">
          <ToggleRow label="Message Notifications" value={settings.notifMessages} onChange={(v) => handleSaveSettings("notifMessages", v)} />
          <ToggleRow label="Call Notifications" value={settings.notifCalls} onChange={(v) => handleSaveSettings("notifCalls", v)} />
          <ToggleRow label="Show Preview" value={settings.notifPreviews} onChange={(v) => handleSaveSettings("notifPreviews", v)} />
        </div>
      )}

      {section === "devices" && (
        <div className="p-4 space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <Smartphone size={20} className="text-[var(--text-secondary)]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{s.deviceType || "Unknown device"}</p>
                <p className="text-xs text-[var(--text-secondary)]">Last active: {new Date(s.lastActive).toLocaleString()}</p>
                {s.ipAddress && <p className="text-xs text-[var(--text-secondary)]">IP: {s.ipAddress}</p>}
              </div>
              <button onClick={async () => { await api.auth.deleteSession(s.id); api.auth.sessions().then(({ sessions }) => setSessions(sessions)); }} className="text-sm text-red-500">Revoke</button>
            </div>
          ))}
        </div>
      )}

      {section === "appearance" && (
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Theme</h3>
          {[
            { value: "light", icon: Sun, label: "Light" },
            { value: "dark", icon: Moon, label: "Dark" },
            { value: "system", icon: Monitor, label: "System" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value as any)}
              className={cn("flex items-center gap-3 w-full p-3 rounded-xl transition", theme === opt.value ? "bg-noris-500 text-white" : "bg-[var(--bg-tertiary)] text-[var(--text-primary)]")}
            >
              <opt.icon size={20} />
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {section === "language" && (
        <div className="p-4">
          <p className="text-sm text-[var(--text-secondary)]">Language selection coming soon. Currently: English</p>
        </div>
      )}

      {section === "data" && (
        <div className="p-4 space-y-3">
          <button onClick={handleExport} className="flex items-center gap-3 w-full p-4 rounded-xl bg-[var(--bg-tertiary)] hover:bg-noris-500 hover:text-white transition text-[var(--text-primary)]">
            <Download size={20} />
            <span className="font-medium">Export My Data</span>
          </button>
          <button onClick={handleDeleteAccount} className="flex items-center gap-3 w-full p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition font-medium">
            <Trash2 size={20} />
            Delete Account
          </button>
        </div>
      )}

      {section === "help" && (
        <div className="p-4 space-y-2">
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">About Noris</h3>
            <p className="text-sm text-[var(--text-secondary)]">Noris is a secure messaging platform. Version 1.0.0</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Terms of Service</h3>
            <p className="text-sm text-[var(--text-secondary)]">By using Noris, you agree to our terms and privacy policy.</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Report a Problem</h3>
            <p className="text-sm text-[var(--text-secondary)]">Found a bug? Report it to help us improve.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacySelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm border border-transparent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn("w-12 h-6 rounded-full transition relative", value ? "bg-noris-500" : "bg-gray-400")}
      >
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition", value ? "left-6" : "left-0.5")} />
      </button>
    </div>
  );
}
