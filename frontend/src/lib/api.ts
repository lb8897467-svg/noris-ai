const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("noris_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("noris_token");
    localStorage.removeItem("noris_session");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: any) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // Auth
  auth: {
    register: (body: any) => api.post("/auth/register", body),
    verifyPhone: (body: any) => api.post("/auth/verify-phone", body),
    verifyEmail: (body: any) => api.post("/auth/verify-email", body),
    resendOtp: (body: any) => api.post("/auth/resend-otp", body),
    login: (body: any) => api.post("/auth/login", body),
    me: () => api.get("/auth/me"),
    logout: (body: any) => api.post("/auth/logout", body),
    sessions: () => api.get("/auth/sessions"),
    deleteSession: (id: string) => api.delete(`/auth/sessions/${id}`),
  },
  // Users
  users: {
    me: () => api.get("/users/me"),
    updateProfile: (body: any) => api.patch("/users/me/profile", body),
    updateUsername: (body: any) => api.patch("/users/me/username", body),
    search: (q: string) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
    get: (id: string) => api.get(`/users/${id}`),
  },
  // Contacts
  contacts: {
    list: () => api.get("/contacts"),
    add: (body: any) => api.post("/contacts", body),
    remove: (id: string) => api.delete(`/contacts/${id}`),
    toggleFavorite: (id: string) => api.patch(`/contacts/${id}/favorite`),
    sendRequest: (body: any) => api.post("/contacts/requests", body),
    receivedRequests: () => api.get("/contacts/requests/received"),
    sentRequests: () => api.get("/contacts/requests/sent"),
    updateRequest: (id: string, status: string) => api.patch(`/contacts/requests/${id}`, { status }),
    block: (id: string) => api.post(`/contacts/block/${id}`),
    unblock: (id: string) => api.delete(`/contacts/block/${id}`),
    blocked: () => api.get("/contacts/blocked"),
  },
  // Conversations
  conversations: {
    list: () => api.get("/conversations"),
    archived: () => api.get("/conversations/archived"),
    createDirect: (body: any) => api.post("/conversations/direct", body),
    createGroup: (body: any) => api.post("/conversations/group", body),
    get: (id: string) => api.get(`/conversations/${id}`),
    messages: (id: string, cursor?: string) => api.get(`/conversations/${id}/messages${cursor ? `?cursor=${cursor}` : ""}`),
    sendMessage: (id: string, body: any) => api.post(`/conversations/${id}/messages`, body),
    editMessage: (convId: string, msgId: string, text: string) => api.patch(`/conversations/${convId}/messages/${msgId}`, { text }),
    deleteMessage: (convId: string, msgId: string, forEveryone?: boolean) => api.delete(`/conversations/${convId}/messages/${msgId}?forEveryone=${forEveryone ? "true" : "false"}`),
    react: (convId: string, msgId: string, emoji: string) => api.post(`/conversations/${convId}/messages/${msgId}/react`, { emoji }),
    pin: (convId: string, msgId: string) => api.patch(`/conversations/${convId}/messages/${msgId}/pin`),
    read: (id: string) => api.post(`/conversations/${id}/read`),
    search: (id: string, q: string) => api.get(`/conversations/${id}/search?q=${encodeURIComponent(q)}`),
    mute: (id: string, muted: boolean) => api.patch(`/conversations/${id}/mute`, { muted }),
    archive: (id: string, archived: boolean) => api.patch(`/conversations/${id}/archive`, { archived }),
    draft: (id: string, draftText: string) => api.patch(`/conversations/${id}/draft`, { draftText }),
    update: (id: string, body: any) => api.patch(`/conversations/${id}`, body),
    addMembers: (id: string, userIds: string[]) => api.post(`/conversations/${id}/members`, { userIds }),
    removeMember: (id: string, userId: string) => api.delete(`/conversations/${id}/members/${userId}`),
    updateRole: (id: string, userId: string, role: string) => api.patch(`/conversations/${id}/members/${userId}/role`, { role }),
    leave: (id: string) => api.delete(`/conversations/${id}/leave`),
  },
  // Stories
  stories: {
    list: () => api.get("/stories"),
    create: (body: any) => api.post("/stories", body),
    view: (id: string) => api.post(`/stories/${id}/view`),
    delete: (id: string) => api.delete(`/stories/${id}`),
  },
  // Channels
  channels: {
    search: (q: string) => api.get(`/channels/search?q=${encodeURIComponent(q)}`),
    mine: () => api.get("/channels/mine"),
    create: (body: any) => api.post("/channels", body),
    get: (username: string) => api.get(`/channels/${username}`),
    join: (id: string) => api.post(`/channels/${id}/join`),
    leave: (id: string) => api.delete(`/channels/${id}/leave`),
  },
  // Calls
  calls: {
    list: () => api.get("/calls"),
    create: (body: any) => api.post("/calls", body),
    update: (id: string, body: any) => api.patch(`/calls/${id}`, body),
  },
  // Notifications
  notifications: {
    list: () => api.get("/notifications"),
    readAll: () => api.post("/notifications/read"),
    readOne: (id: string) => api.post(`/notifications/${id}/read`),
  },
  // Reports
  reports: {
    create: (body: any) => api.post("/reports", body),
  },
  // Settings
  settings: {
    get: () => api.get("/settings"),
    update: (body: any) => api.patch("/settings", body),
    enableTwoStep: (body: any) => api.post("/settings/two-step/enable", body),
    disableTwoStep: (body: any) => api.post("/settings/two-step/disable", body),
    deleteAccount: (body: any) => api.delete("/settings/account"),
    export: () => api.get("/settings/export"),
  },
  // Admin
  admin: {
    stats: () => api.get("/admin/stats"),
    users: (page?: number, search?: string) => api.get(`/admin/users?page=${page || 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
    reports: (status?: string) => api.get(`/admin/reports${status ? `?status=${status}` : ""}`),
    updateReport: (id: string, status: string) => api.patch(`/admin/reports/${id}`, { status }),
    auditLogs: () => api.get("/admin/audit-logs"),
  },
};
