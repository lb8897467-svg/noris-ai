import { useEffect, useState } from "react";
import { Phone, PhoneMissed, PhoneOutgoing, PhoneIncoming, Video } from "lucide-react";
import { api } from "../lib/api";
import Avatar from "../components/Avatar";
import { formatLastSeen } from "../utils/cn";
import type { Call } from "../types";

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      const { calls } = await api.calls.list();
      setCalls(calls);
    } catch (err) {
      console.error("Load calls error:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Calls</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Phone size={28} className="text-[var(--text-secondary)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium">No calls yet</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Your call history will appear here</p>
          </div>
        ) : (
          calls.map((call) => {
            const otherUser = call.initiatorId === call.receiverId ? call.receiver : call.initiator;
            const isOutgoing = call.status === "OUTGOING";
            const isMissed = call.status === "MISSED";

            return (
              <div key={call.id} className="flex items-center gap-3 p-3 border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition">
                <Avatar name={otherUser?.profile?.displayName} src={otherUser?.profile?.photoUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isMissed ? "text-red-500" : "text-[var(--text-primary)]"}`}>
                    {otherUser?.profile?.displayName || "Unknown"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {isMissed ? (
                      <PhoneMissed size={14} className="text-red-500" />
                    ) : isOutgoing ? (
                      <PhoneOutgoing size={14} className="text-green-500" />
                    ) : (
                      <PhoneIncoming size={14} className="text-noris-500" />
                    )}
                    <span className="text-sm text-[var(--text-secondary)]">
                      {call.type === "VIDEO" ? "Video" : "Voice"} · {formatLastSeen(call.createdAt)}
                      {call.duration ? ` · ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, "0")}` : ""}
                    </span>
                  </div>
                </div>
                <button className="p-2 rounded-full hover:bg-noris-500 hover:text-white text-noris-500 transition">
                  {call.type === "VIDEO" ? <Video size={18} /> : <Phone size={18} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
