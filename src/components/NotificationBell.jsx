import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { listNotifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } from "../api.js";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Poll unread count every 30s.
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await unreadNotificationCount();
        if (active) setUnread(data.unread_count ?? 0);
      } catch { /* silent */ }
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await listNotifications(30);
      setNotifications(data.notifications || []);
      setUnread(data.unread_count ?? 0);
    } catch { /* silent */ }
    setLoading(false);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications();
  };

  const markRead = async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnread((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => n.readAt ? n : { ...n, readAt: new Date().toISOString() }));
    setUnread(0);
  };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={toggle} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {unread > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          <div className="notif-list">
            {loading && <div className="notif-empty">Loading...</div>}
            {!loading && notifications.length === 0 && (
              <div className="notif-empty">No notifications yet</div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.readAt ? "" : "unread"}`}
                onClick={() => { if (!n.readAt) markRead(n.id); }}
              >
                <div className="notif-item-title">{n.title}</div>
                {n.message && <div className="notif-item-msg">{n.message}</div>}
                <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
