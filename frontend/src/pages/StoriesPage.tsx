import { useEffect, useState } from "react";
import { Plus, X, Camera, Type as TypeIcon } from "lucide-react";
import { api } from "../lib/api";
import Avatar from "../components/Avatar";
import { useAuthStore } from "../store/auth";
import type { Story } from "../types";

export default function StoriesPage() {
  const { user } = useAuthStore();
  const [stories, setStories] = useState<{ user: any; stories: Story[] }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<{ user: any; stories: Story[]; index: number } | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const { stories } = await api.stories.list();
      setStories(stories);
    } catch (err) {
      console.error("Load stories error:", err);
    }
  };

  const handleView = (userStories: { user: any; stories: Story[] }) => {
    setViewing({ ...userStories, index: 0 });
    if (userStories.stories[0]) {
      api.stories.view(userStories.stories[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Stories</h1>
        <button onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-noris-500 text-white hover:bg-noris-600 transition">
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Camera size={28} className="text-[var(--text-secondary)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium">No stories yet</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Share a moment with your contacts</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stories.map((group, i) => (
              <button
                key={i}
                onClick={() => handleView(group)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[var(--bg-tertiary)] group"
              >
                {group.stories[0]?.mediaUrl ? (
                  <img src={group.stories[0].mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-noris-400 to-noris-600">
                    <span className="text-white text-lg font-medium px-4 text-center">{group.stories[0]?.text || "Story"}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 left-2">
                  <div className={`w-3 h-3 rounded-full border-2 ${group.stories[0]?.hasViewed ? "border-gray-400" : "border-noris-500"}`}>
                    <Avatar name={group.user.profile?.displayName} src={group.user.profile?.photoUrl} size="sm" className="w-full" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-sm font-semibold truncate">{group.user.profile?.displayName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create story modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--bg-primary)] rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Create Story</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg">
                <X size={20} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await api.stories.create({ type: "TEXT", text: "Hello from Noris! 👋", audience: "CONTACTS" });
                  setShowCreate(false);
                  loadStories();
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-noris-500 hover:text-white transition text-[var(--text-primary)]"
              >
                <TypeIcon size={20} />
                <span className="font-medium">Text Story</span>
              </button>
              <button
                onClick={async () => {
                  await api.stories.create({ type: "PHOTO", mediaUrl: "https://via.placeholder.com/600x800", audience: "CONTACTS" });
                  setShowCreate(false);
                  loadStories();
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-noris-500 hover:text-white transition text-[var(--text-primary)]"
              >
                <Camera size={20} />
                <span className="font-medium">Photo Story</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story viewer */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setViewing(null)}>
          <div className="relative w-full h-full max-w-md mx-auto">
            {viewing.stories[viewing.index]?.mediaUrl ? (
              <img src={viewing.stories[viewing.index].mediaUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-noris-400 to-noris-600">
                <span className="text-white text-2xl font-medium px-8 text-center">{viewing.stories[viewing.index]?.text}</span>
              </div>
            )}
            <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
              <Avatar name={viewing.user.profile?.displayName} src={viewing.user.profile?.photoUrl} size="md" />
              <div>
                <p className="text-white font-semibold">{viewing.user.profile?.displayName}</p>
                <p className="text-white/60 text-xs">{new Date(viewing.stories[viewing.index]?.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
