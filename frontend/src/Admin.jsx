import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck, Users, LayoutDashboard, FileText, Activity as ActivityIcon, Search, X, Plus, Pencil, Trash2,
  CheckCircle2, UserPlus, LogIn, LogOut, Eye, MailWarning, CircleHelp, Link2, HeartHandshake, Download,
  Ban, UserCheck, RefreshCw, ChevronLeft, ChevronRight, Database, BookOpen, Clock
} from "lucide-react";
import { request } from "./api.js";

const TYPES = {
  register: { label: "Registered", icon: UserPlus, tone: "green" },
  login: { label: "Signed in", icon: LogIn, tone: "blue" },
  logout: { label: "Signed out", icon: LogOut, tone: "grey" },
  page_view: { label: "Viewed a page", icon: Eye, tone: "grey" },
  scam_view: { label: "Read a scam example", icon: MailWarning, tone: "amber" },
  quiz_attempt: { label: "Took a quiz", icon: CircleHelp, tone: "teal" },
  url_check: { label: "Checked a link", icon: Link2, tone: "purple" },
  report_help: { label: "Opened emergency help", icon: HeartHandshake, tone: "red" }
};
const typeInfo = (t) => TYPES[t] || { label: t, icon: ActivityIcon, tone: "grey" };

function timeAgo(value) {
  if (!value) return "Never";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60); if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24); if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(value).toLocaleDateString();
}
const fullDate = (v) => (v ? new Date(v).toLocaleString() : "—");
const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function StatCard({ icon, label, value, hint }) {
  return <div className="stat-card"><span>{icon}</span><small>{label}</small><strong>{value ?? "…"}</strong>{hint && <em className="stat-hint">{hint}</em>}</div>;
}

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [detailId, setDetailId] = useState(null);
  const openUser = (id) => { setDetailId(id); setTab("users"); };

  return <div className="admin-wrap">
    <div className="admin-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATION</div><h1>Admin dashboard</h1><p>Manage users, follow their activity and update awareness content.</p></div><span className="admin-badge"><ShieldCheck size={15} /> ADMIN ACCESS</span></div>
    <div className="admin-tabs">
      {[["overview", "Overview", LayoutDashboard], ["users", "Users", Users], ["activity", "Activity feed", ActivityIcon], ["content", "Manage content", FileText]].map(([id, label, Icon]) =>
        <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} /> {label}</button>)}
    </div>
    {message && <div className="notice inline-notice">{message}<button onClick={() => setMessage("")}><X size={15} /></button></div>}
    {tab === "overview" && <Overview setMessage={setMessage} openUser={openUser} goTo={setTab} />}
    {tab === "users" && <UsersTab setMessage={setMessage} detailId={detailId} setDetailId={setDetailId} />}
    {tab === "activity" && <ActivityTab setMessage={setMessage} openUser={openUser} />}
    {tab === "content" && <ContentTab setMessage={setMessage} />}
  </div>;
}

/* ------------------------------------------------------------------ Overview */
function Overview({ setMessage, openUser, goTo }) {
  const [data, setData] = useState(null);
  useEffect(() => { request("/admin/overview").then(setData).catch((e) => setMessage(e.message)); }, [setMessage]);
  if (!data) return <p className="muted">Loading overview…</p>;
  const max = Math.max(1, ...data.series.map((d) => d.count));
  const maxType = Math.max(1, ...data.byType.map((t) => t.count));
  return <>
    <div className="stats-grid admin-stats">
      <StatCard icon={<Users />} label="Registered users" value={data.users} hint={`${data.newThisWeek} joined this week`} />
      <StatCard icon={<Clock />} label="Active in last 24h" value={data.activeToday} />
      <StatCard icon={<ActivityIcon />} label="Activities logged" value={data.activities} />
      <StatCard icon={<CircleHelp />} label="Quiz attempts" value={data.attempts} />
    </div>
    <div className="admin-grid">
      <div className="admin-content"><h2>Activity — last 14 days</h2><p>Every sign-in, page view, quiz and link check by signed-in users.</p>
        <div className="bar-chart" role="img" aria-label="Daily activity for the last 14 days">{data.series.map((d) => <div className="bar-col" key={d.date} title={`${d.date}: ${d.count} activities`}><span className="bar-val">{d.count}</span><div className="bar" style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }} /><small>{d.date.slice(8)}</small></div>)}</div></div>
      <div className="admin-content"><h2>What users do</h2><p>Activity by type.</p>
        <div className="type-list">{data.byType.map((t) => { const info = typeInfo(t.type); const Icon = info.icon; return <div className="type-row" key={t.type}><span className={`type-icon tone-${info.tone}`}><Icon size={14} /></span><span className="type-name">{info.label}</span><div className="type-bar"><i style={{ width: `${(t.count / maxType) * 100}%` }} /></div><b>{t.count}</b></div>; })}</div></div>
    </div>
    <div className="admin-grid">
      <div className="admin-content"><h2>Most active users</h2><p>Click a person to view their full timeline.</p>
        <div className="admin-list">{data.topUsers.length ? data.topUsers.map((u) => <button className="admin-list-item row-button" key={u._id} onClick={() => openUser(u._id)}><div className="user-cell"><span className="avatar">{initials(u.name)}</span><div><b>{u.name}</b><small>{u.email}</small></div></div><span className="pill">{u.count} activities</span></button>) : <p className="muted pad">No activity yet.</p>}</div></div>
      <div className="admin-content"><h2>Content &amp; accounts</h2><p>Quick facts about the platform.</p>
        <div className="quick-facts"><div><BookOpen size={16} /><b>{data.topics}</b> topics</div><div><MailWarning size={16} /><b>{data.scams}</b> scam examples</div><div><CircleHelp size={16} /><b>{data.quizzes}</b> custom quizzes</div><div><Ban size={16} /><b>{data.suspended}</b> suspended</div></div>
        <button className="btn btn-outline full" onClick={() => goTo("users")}><Users size={16} /> Manage users</button></div>
    </div>
    <div className="admin-info"><ShieldCheck /><div><b>Privacy reminder</b><p>Activity tracking records only actions inside Cyber Saathi (no IP addresses or device data). Tell users that activity is recorded, and use aggregated figures when reporting community-service impact.</p></div></div>
  </>;
}

/* ------------------------------------------------------------------ Users */
function UsersTab({ setMessage, detailId, setDetailId }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const debounce = useRef();

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(opts.page ?? page), limit: "20", sort, ...(opts.search ?? search ? { search: opts.search ?? search } : {}), ...(status ? { status } : {}) });
    try {
      const d = await request(`/admin/users?${q}`);
      setRows(d.users); setMeta({ total: d.total, page: d.page, pages: d.pages });
    } catch (e) { setMessage(e.message); } finally { setLoading(false); }
  }, [page, search, sort, status, setMessage]);

  useEffect(() => { load(); }, [page, sort, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const onSearch = (v) => { setSearch(v); clearTimeout(debounce.current); debounce.current = setTimeout(() => { setPage(1); load({ page: 1, search: v }); }, 350); };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const all = []; let p = 1, pages = 1;
      do {
        const q = new URLSearchParams({ page: String(p), limit: "100", sort, ...(search ? { search } : {}), ...(status ? { status } : {}) });
        const d = await request(`/admin/users?${q}`); all.push(...d.users); pages = d.pages; p++;
      } while (p <= pages);
      const safe = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
      const header = ["Name", "Email", "Status", "Joined", "Last active", "Logins", "Activities", "Quiz attempts", "Quiz average %"];
      const lines = all.map((u) => [u.name, u.email, u.status, new Date(u.createdAt).toISOString(), u.lastActivityAt ? new Date(u.lastActivityAt).toISOString() : "", u.loginCount, u.activityCount, u.quizAttempts, u.quizAverage ?? ""].map(safe).join(","));
      const blob = new Blob([[header.map(safe).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `cyber-saathi-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
      setMessage(`Exported ${all.length} users.`);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };

  const addDemo = async () => {
    if (!confirm("Add 50 demo users with sample activity? Existing demo users will be replaced. Real users are not touched.")) return;
    setBusy(true);
    try { const r = await request("/admin/demo-users", { method: "POST", body: JSON.stringify({ count: 50 }) }); setMessage(`Added ${r.users} demo users and ${r.activities} activity records. Demo password: ${r.password}`); setPage(1); load({ page: 1 }); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const removeDemo = async () => {
    if (!confirm("Remove all demo users and their activity? Real users are not touched.")) return;
    setBusy(true);
    try { const r = await request("/admin/demo-users", { method: "DELETE" }); setMessage(`Removed ${r.users} demo users.`); setPage(1); load({ page: 1 }); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };

  return <div className="admin-content">
    <div className="admin-content-top"><div><h2>Registered users</h2><p>{meta.total} account{meta.total === 1 ? "" : "s"}. Passwords are never displayed.</p></div>
      <div className="toolbar-actions"><button className="btn btn-outline" onClick={exportCsv} disabled={busy}><Download size={15} /> Export CSV</button><button className="btn btn-outline" onClick={addDemo} disabled={busy}><Database size={15} /> Add 50 demo users</button><button className="btn btn-quiet" onClick={removeDemo} disabled={busy}><Trash2 size={15} /> Remove demo</button></div></div>
    <div className="user-toolbar">
      <div className="search-box"><Search size={16} /><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search by name or email" aria-label="Search users" /></div>
      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status"><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort users"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="lastActive">Recently active</option><option value="logins">Most sign-ins</option><option value="name">Name A–Z</option></select>
      <button className="icon-btn" title="Refresh" onClick={() => load()}><RefreshCw size={16} className={loading ? "spin" : ""} /></button>
    </div>
    <div className="table-scroll"><table className="user-table"><thead><tr><th>User</th><th>Status</th><th>Joined</th><th>Last active</th><th>Activities</th><th>Quiz avg</th></tr></thead>
      <tbody>{rows.map((u) => <tr key={u._id} onClick={() => setDetailId(u._id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setDetailId(u._id)}>
        <td><div className="user-cell"><span className="avatar">{initials(u.name)}</span><div><b>{u.name}{u.isDemo && <i className="demo-tag">demo</i>}</b><small>{u.email}</small></div></div></td>
        <td><span className={`status-pill ${u.status}`}>{u.status}</span></td><td>{new Date(u.createdAt).toLocaleDateString()}</td><td title={fullDate(u.lastActivityAt)}>{timeAgo(u.lastActivityAt)}</td><td>{u.activityCount}</td><td>{u.quizAverage == null ? "—" : `${u.quizAverage}%`}</td></tr>)}
        {!rows.length && !loading && <tr><td colSpan="6" className="empty-row">No users found. Use “Add 50 demo users” to load sample data.</td></tr>}</tbody></table></div>
    {loading && !rows.length && <p className="muted pad">Loading users…</p>}
    <div className="pager"><button className="icon-btn" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span>Page {meta.page} of {meta.pages}</span><button className="icon-btn" disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div>
    {detailId && <UserDrawer id={detailId} onClose={() => setDetailId(null)} setMessage={setMessage} onChanged={() => load()} />}
  </div>;
}

function UserDrawer({ id, onClose, setMessage, onChanged }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => request(`/admin/users/${id}`).then(setD).catch((e) => { setMessage(e.message); onClose(); }), [id, setMessage, onClose]);
  useEffect(() => { setD(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const setStatus = async (status) => {
    if (status === "suspended" && !confirm("Suspend this user? They will be signed out and unable to log in.")) return;
    setBusy(true);
    try { await request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); setMessage(status === "suspended" ? "User suspended." : "User reactivated."); await load(); onChanged(); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Permanently delete this user and all their activity? This cannot be undone.")) return;
    setBusy(true);
    try { await request(`/admin/users/${id}`, { method: "DELETE" }); setMessage("User deleted."); onChanged(); onClose(); }
    catch (e) { setMessage(e.message); setBusy(false); }
  };

  return <div className="drawer-backdrop" onClick={onClose}><aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="User details">
    <button className="drawer-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
    {!d ? <p className="muted pad">Loading…</p> : <>
      <div className="drawer-head"><span className="avatar big">{initials(d.user.name)}</span><div><h3>{d.user.name}{d.user.isDemo && <i className="demo-tag">demo</i>}</h3><small>{d.user.email}</small><div><span className={`status-pill ${d.user.status}`}>{d.user.status}</span></div></div></div>
      <div className="drawer-stats"><div><b>{d.activities.length >= 100 ? "100+" : d.activities.length}</b><small>Recent activities</small></div><div><b>{d.user.loginCount || 0}</b><small>Sign-ins</small></div><div><b>{d.quizAverage == null ? "—" : `${d.quizAverage}%`}</b><small>Quiz average</small></div></div>
      <dl className="drawer-facts"><dt>Joined</dt><dd>{fullDate(d.user.createdAt)}</dd><dt>Last sign-in</dt><dd>{fullDate(d.user.lastLoginAt)}</dd></dl>
      <div className="drawer-actions">{d.user.status === "active" ? <button className="btn btn-outline" disabled={busy} onClick={() => setStatus("suspended")}><Ban size={15} /> Suspend</button> : <button className="btn btn-primary" disabled={busy} onClick={() => setStatus("active")}><UserCheck size={15} /> Reactivate</button>}<button className="btn btn-danger" disabled={busy} onClick={remove}><Trash2 size={15} /> Delete</button></div>
      {d.attempts.length > 0 && <><h4>Quiz history</h4><div className="mini-list">{d.attempts.slice(0, 6).map((a) => <div key={a._id}><span>{a.quizTitle || "Quiz"}</span><b>{a.score}/{a.total}</b><small>{timeAgo(a.createdAt)}</small></div>)}</div></>}
      <h4>Activity timeline</h4>
      <Timeline items={d.activities} />
    </>}
  </aside></div>;
}

function Timeline({ items }) {
  if (!items.length) return <p className="muted pad">No activity recorded yet.</p>;
  return <ol className="timeline">{items.map((a) => { const info = typeInfo(a.type); const Icon = info.icon; return <li key={a._id || a.id}><span className={`type-icon tone-${info.tone}`}><Icon size={14} /></span><div><b>{a.detail || info.label}</b><small title={fullDate(a.createdAt)}>{info.label} · {timeAgo(a.createdAt)}</small></div></li>; })}</ol>;
}

/* ------------------------------------------------------------------ Activity feed */
function ActivityTab({ setMessage, openUser }) {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [type, setType] = useState("");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async (before) => {
    const q = new URLSearchParams({ limit: "40", ...(type ? { type } : {}), ...(before ? { before } : {}) });
    return request(`/admin/activity?${q}`);
  }, [type]);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const d = await fetchPage(); setItems(d.items); setNext(d.next); } catch (e) { setMessage(e.message); } finally { setLoading(false); }
  }, [fetchPage, setMessage]);
  const more = async () => { try { const d = await fetchPage(next); setItems((x) => [...x, ...d.items]); setNext(d.next); } catch (e) { setMessage(e.message); } };

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!live) return; const t = setInterval(refresh, 10000); return () => clearInterval(t); }, [live, refresh]);

  return <div className="admin-content">
    <div className="admin-content-top"><div><h2>Live activity feed</h2><p>What signed-in users are doing, newest first.</p></div>
      <div className="toolbar-actions"><label className="live-toggle"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Auto-refresh (10s)</label><button className="icon-btn" title="Refresh" onClick={refresh}><RefreshCw size={16} className={loading ? "spin" : ""} /></button></div></div>
    <div className="content-kind"><button className={!type ? "selected" : ""} onClick={() => setType("")}>All</button>{Object.entries(TYPES).map(([k, v]) => <button key={k} className={type === k ? "selected" : ""} onClick={() => setType(k)}>{v.label}</button>)}</div>
    <div className="feed">{items.map((a) => { const info = typeInfo(a.type); const Icon = info.icon; return <div className="feed-item" key={a.id}><span className={`type-icon tone-${info.tone}`}><Icon size={15} /></span><div className="feed-main"><div>{a.user ? <button className="link-btn" onClick={() => openUser(a.user.id)}>{a.user.name}</button> : <i>Deleted user</i>} <span className="feed-detail">— {a.detail || info.label}</span></div><small>{info.label}{a.user ? ` · ${a.user.email}` : ""}</small></div><time title={fullDate(a.createdAt)}>{timeAgo(a.createdAt)}</time></div>; })}
      {!items.length && !loading && <p className="muted pad">No activity yet. Activity appears here as signed-in users use the site, or add demo users from the Users tab.</p>}</div>
    {next && <div className="center-action"><button className="btn btn-outline" onClick={more}>Load older activity</button></div>}
  </div>;
}

/* ------------------------------------------------------------------ Content management (unchanged behaviour) */
function ContentTab({ setMessage }) {
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState("topics");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadItems = useCallback(async (k) => { try { setItems(await request(`/admin/${k}`)); } catch (e) { setMessage(e.message); } }, [setMessage]);
  useEffect(() => { loadItems(kind); }, [kind, loadItems]);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    const form = new FormData(e.currentTarget); const body = {};
    for (const [k, v] of form.entries()) body[k] = v;
    if (kind === "scams") body.warningSigns = String(body.warningSigns || "").split("\n").map((x) => x.trim()).filter(Boolean);
    if (kind === "quizzes") { try { body.questions = JSON.parse(body.questions || "[]"); } catch { setMessage("Questions must be valid JSON."); setBusy(false); return; } }
    body.published = body.published !== "false";
    try { await request(`/admin/${kind}${editing?._id ? `/${editing._id}` : ""}`, { method: editing?._id ? "PUT" : "POST", body: JSON.stringify(body) }); setEditing(null); setMessage("Content saved successfully."); loadItems(kind); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  };
  const remove = async (id) => { if (!confirm("Delete this item? This cannot be undone.")) return; try { await request(`/admin/${kind}/${id}`, { method: "DELETE" }); loadItems(kind); setMessage("Item deleted."); } catch (e) { setMessage(e.message); } };

  return <div className="admin-content"><div className="admin-content-top"><div><h2>Content library</h2><p>Create and update what users see on the website.</p></div><button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add new</button></div>
    <div className="content-kind">{["topics", "scams", "quizzes"].map((k) => <button key={k} className={kind === k ? "selected" : ""} onClick={() => { setKind(k); setEditing(null); }}>{k[0].toUpperCase() + k.slice(1)}</button>)}</div>
    {editing && <form className="edit-form" onSubmit={save} key={editing._id || "new"}><div className="edit-form-head"><h3>{editing._id ? "Edit item" : "Create item"}</h3><button type="button" onClick={() => setEditing(null)}><X size={17} /></button></div>
      <label>Title<input name="title" defaultValue={editing.title || ""} required /></label>
      {kind === "topics" && <><label>Category<input name="category" defaultValue={editing.category || "Online safety"} /></label><label>Icon name<input name="icon" defaultValue={editing.icon || "shield"} /></label><label>Short summary<textarea name="summary" defaultValue={editing.summary || ""} required /></label><label>Full guide<textarea name="content" defaultValue={editing.content || ""} required rows="5" /></label></>}
      {kind === "scams" && <><label>Channel<input name="channel" defaultValue={editing.channel || "SMS / WhatsApp"} /></label><label>Example message<textarea name="example" defaultValue={editing.example || ""} required /></label><label>Warning signs (one per line)<textarea name="warningSigns" defaultValue={(editing.warningSigns || []).join("\n")} rows="4" /></label><label>Safer action<textarea name="safeAction" defaultValue={editing.safeAction || ""} required /></label></>}
      {kind === "quizzes" && <><label>Description<input name="description" defaultValue={editing.description || ""} /></label><label>Questions (JSON)<textarea name="questions" rows="10" defaultValue={JSON.stringify(editing.questions || [{ question: "Question text?", options: ["Option A", "Option B"], answerIndex: 0, explanation: "Explain the correct answer." }], null, 2)} /></label><p className="muted small">Each question needs question, options (array), answerIndex (zero-based) and explanation.</p></>}
      <label>Publication status<select name="published" defaultValue={String(editing.published !== false)}><option value="true">Published</option><option value="false">Draft / hidden</option></select></label><button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save content"} <CheckCircle2 size={16} /></button></form>}
    <div className="admin-list">{items.map((item) => <div className="admin-list-item" key={item._id}><div><b>{item.title || item.name}</b><small>{item.category || item.channel || `${item.questions?.length || 0} questions`} · {item.published === false ? "Draft" : "Published"}</small></div><div className="list-actions"><button title="Edit" onClick={() => setEditing(item)}><Pencil size={16} /></button><button title="Delete" onClick={() => remove(item._id)}><Trash2 size={16} /></button></div></div>)}
      {!items.length && <p className="muted pad">Nothing here yet. Built-in starter content is shown to visitors until you publish your own.</p>}</div>
  </div>;
}
