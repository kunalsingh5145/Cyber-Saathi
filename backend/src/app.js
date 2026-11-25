import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "./env.js";
import { connectDB, explainDbError } from "./db.js";
import { configProblems, envFileExists, wrongEnvName } from "./env.js";
import { User, Topic, Scam, Quiz, Attempt, Activity, ACTIVITY_TYPES } from "./models.js";
import { seedDemoUsers, removeDemoUsers } from "./seed.js";
import { starterTopics, starterScams, starterQuiz } from "./content.js";

const app = express();
app.disable("x-powered-by");

// Only the website(s) listed in CLIENT_ORIGIN may call the API from a browser. Empty = allow any (fine for testing).
const allowed = (process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || !allowed.length || allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)),
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Cache-Control": "no-store" });
  next();
});

// Wrap async route handlers so errors reach the error handler instead of hanging the request.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/", (_req, res) => res.json({ service: "Cyber Saathi API", status: "running", health: "/api/health" }));

// Health check: open /api/health in the browser to see exactly what is wrong (if anything).
app.get("/api/health", async (_req, res) => {
  const problems = configProblems();
  let database = false, error = null;
  if (!problems.length) { try { await connectDB(); database = mongoose.connection.readyState === 1; } catch (e) { error = e.userMessage || explainDbError(e); } }
  res.json({ ok: !problems.length && database, service: "Cyber Saathi API", database, envFileFound: envFileExists, ...(wrongEnvName ? { hint: "You have a file named .env.txt. Rename it to .env" } : {}), problems, error });
});

// Every other /api route needs the database. Connect once (cached), or explain what is wrong.
app.use("/api", wrap(async (_req, _res, next) => { await connectDB(); next(); }));

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Verifies the JWT, then re-checks the account in the database so suspended or deleted users lose access at once.
function auth(requiredRole, { optional = false } = {}) {
  return async (req, res, next) => {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    if (!token && optional) return next();
    try {
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const account = await User.findById(payload.id).select("role status name");
      if (!account || account.status === "suspended") return res.status(401).json({ message: "Your session is no longer valid. Please sign in again." });
      if (requiredRole && account.role !== requiredRole) return res.status(403).json({ message: "Administrator access required." });
      req.user = { id: account._id.toString(), role: account.role, name: account.name };
      next();
    } catch {
      if (optional) return next();
      return res.status(401).json({ message: "Please log in to continue." });
    }
  };
}

// Fire-and-forget activity log. Tracking must never break a user request.
async function logActivity(userId, type, detail = "", meta) {
  try { await Activity.create({ userId, type, detail: String(detail).slice(0, 200), meta }); } catch (e) { console.error("Activity log failed:", e.message); }
}

// Best-effort login throttle (in-memory, per serverless instance).
const attempts = new Map();
function throttled(key) {
  const now = Date.now();
  const rec = (attempts.get(key) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(key, rec);
  return rec.length >= 8;
}
const noteFailure = (key) => attempts.set(key, [...(attempts.get(key) || []), Date.now()]);

const publicTopic = (doc) => ({ id: doc._id, title: doc.title, category: doc.category, summary: doc.summary, content: doc.content, icon: doc.icon });
const publicScam = (doc) => ({ id: doc._id, title: doc.title, channel: doc.channel, example: doc.example, warningSigns: doc.warningSigns, safeAction: doc.safeAction });
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const accountPayload = (user) => ({ name: user.name, email: user.email, role: user.role });

app.post("/api/auth/register", wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || typeof password !== "string" || password.length < 8)
    return res.status(400).json({ message: "Enter your name, a valid email and a password of at least 8 characters." });
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: "user", lastLoginAt: new Date(), loginCount: 1 });
  await logActivity(user._id, "register", "Created an account");
  res.status(201).json({ token: tokenFor(user), user: accountPayload(user) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const key = `${req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "ip"}:${normalizedEmail}`;
  if (throttled(key)) return res.status(429).json({ message: "Too many attempts. Please wait a few minutes and try again." });
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
    noteFailure(key);
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  if (user.status === "suspended") return res.status(403).json({ message: "This account has been suspended. Please contact the administrator." });
  user.lastLoginAt = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();
  await logActivity(user._id, "login", user.role === "admin" ? "Administrator signed in" : "Signed in");
  res.json({ token: tokenFor(user), user: accountPayload(user) });
}));

// Client-reported activity (page views, scam examples read, starter-quiz scores, logout).
app.post("/api/activity", auth(), wrap(async (req, res) => {
  const { type, detail, meta } = req.body || {};
  const allowed = ["page_view", "scam_view", "quiz_attempt", "logout", "report_help"];
  if (!allowed.includes(type)) return res.status(400).json({ message: "Unsupported activity type." });
  const safeMeta = {};
  if (meta && typeof meta === "object") {
    for (const k of ["page", "score", "total"]) if (["string", "number"].includes(typeof meta[k])) safeMeta[k] = typeof meta[k] === "string" ? meta[k].slice(0, 60) : meta[k];
  }
  if (type === "quiz_attempt" && Number.isFinite(safeMeta.score) && Number.isFinite(safeMeta.total) && safeMeta.total > 0 && safeMeta.score <= safeMeta.total) {
    await Attempt.create({ userId: req.user.id, quizId: new mongoose.Types.ObjectId(), quizTitle: String(detail || "Everyday Cyber Safety").split(":")[0].slice(0, 80), score: safeMeta.score, total: safeMeta.total });
  }
  await logActivity(req.user.id, type, String(detail || "").slice(0, 200), Object.keys(safeMeta).length ? safeMeta : undefined);
  res.status(201).json({ ok: true });
}));

app.get("/api/content", wrap(async (_req, res) => {
  let topics = await Topic.find({ published: true }).sort({ createdAt: -1 });
  let scams = await Scam.find({ published: true }).sort({ createdAt: -1 });
  let quizzes = await Quiz.find({ published: true }).select("title description questions._id").sort({ createdAt: -1 });
  if (!topics.length) topics = starterTopics.map((x) => ({ ...x, _id: x.title }));
  if (!scams.length) scams = starterScams.map((x) => ({ ...x, _id: x.title }));
  if (!quizzes.length) quizzes = [{ ...starterQuiz, _id: "starter-quiz" }];
  res.json({ topics: topics.map(publicTopic), scams: scams.map(publicScam), quizzes: quizzes.map(q => ({ id: q._id, title: q.title, description: q.description, questionCount: q.questions.length })) });
}));

app.get("/api/quizzes/:id", wrap(async (req, res) => {
  if (req.params.id !== "starter-quiz" && !isValidId(req.params.id)) return res.status(404).json({ message: "Quiz not found." });
  const quiz = req.params.id === "starter-quiz" ? starterQuiz : await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ message: "Quiz not found." });
  res.json({ id: quiz._id, title: quiz.title, description: quiz.description, questions: quiz.questions.map(q => ({ id: q._id, question: q.question, options: q.options })) });
}));

app.post("/api/quizzes/:id/attempt", auth(), wrap(async (req, res) => {
  if (req.params.id !== "starter-quiz" && !isValidId(req.params.id)) return res.status(404).json({ message: "Quiz not found." });
  const quiz = req.params.id === "starter-quiz" ? starterQuiz : await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ message: "Quiz not found." });
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const review = quiz.questions.map((q, i) => ({ question: q.question, selectedIndex: answers[i], answerIndex: q.answerIndex, correct: answers[i] === q.answerIndex, explanation: q.explanation }));
  const score = review.filter(x => x.correct).length;
  await Attempt.create({ userId: req.user.id, quizId: req.params.id === "starter-quiz" ? new mongoose.Types.ObjectId() : quiz._id, quizTitle: quiz.title, score, total: quiz.questions.length });
  await logActivity(req.user.id, "quiz_attempt", `${quiz.title}: ${score}/${quiz.questions.length}`, { score, total: quiz.questions.length });
  res.json({ score, total: quiz.questions.length, review });
}));

app.get("/api/me/stats", auth(), wrap(async (req, res) => {
  const attempts = await Attempt.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
  res.json({ attempts: attempts.length, average: attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score / Math.max(b.total, 1), 0) / attempts.length * 100) : 0 });
}));

// ---------------------------------------------------------------- Admin: overview
const DAY = 86400000;
app.get("/api/admin/overview", auth("admin"), wrap(async (_req, res) => {
  const now = Date.now();
  const since14 = new Date(now - 14 * DAY);
  const [users, topics, scams, quizzes, attempts, activities, activeToday, newThisWeek, suspended, daily, byType, topUsers] = await Promise.all([
    User.countDocuments({ role: "user" }), Topic.countDocuments(), Scam.countDocuments(), Quiz.countDocuments(), Attempt.countDocuments(), Activity.countDocuments(),
    User.countDocuments({ role: "user", lastLoginAt: { $gte: new Date(now - DAY) } }),
    User.countDocuments({ role: "user", createdAt: { $gte: new Date(now - 7 * DAY) } }),
    User.countDocuments({ role: "user", status: "suspended" }),
    Activity.aggregate([{ $match: { createdAt: { $gte: since14 } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }]),
    Activity.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Activity.aggregate([{ $group: { _id: "$userId", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }, { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } }, { $unwind: "$u" }, { $project: { name: "$u.name", email: "$u.email", count: 1 } }])
  ]);
  const map = Object.fromEntries(daily.map((d) => [d._id, d.count]));
  const series = Array.from({ length: 14 }, (_, i) => { const d = new Date(now - (13 - i) * DAY).toISOString().slice(0, 10); return { date: d, count: map[d] || 0 }; });
  res.json({ users, topics, scams, quizzes, attempts, activities, activeToday, newThisWeek, suspended, series, byType: byType.map((t) => ({ type: t._id, count: t.count })), topUsers });
}));

// ---------------------------------------------------------------- Admin: users and activity
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

app.get("/api/admin/users", auth("admin"), wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const filter = { role: "user" };
  if (req.query.status === "active" || req.query.status === "suspended") filter.status = req.query.status;
  const q = String(req.query.search || "").trim().slice(0, 60);
  if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), "i") }, { email: new RegExp(escapeRegex(q), "i") }];
  const sorts = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, lastActive: { lastLoginAt: -1 }, logins: { loginCount: -1 } };
  const sort = sorts[req.query.sort] || sorts.newest;
  const [total, users] = await Promise.all([User.countDocuments(filter), User.find(filter).select("name email status isDemo createdAt lastLoginAt loginCount").sort(sort).skip((page - 1) * limit).limit(limit).lean()]);
  const ids = users.map((u) => u._id);
  const [acts, atts] = await Promise.all([
    Activity.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", count: { $sum: 1 }, last: { $max: "$createdAt" } } }]),
    Attempt.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", count: { $sum: 1 }, avg: { $avg: { $divide: ["$score", { $max: ["$total", 1] }] } } } }])
  ]);
  const actMap = Object.fromEntries(acts.map((a) => [a._id.toString(), a]));
  const attMap = Object.fromEntries(atts.map((a) => [a._id.toString(), a]));
  res.json({
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
    users: users.map((u) => ({ ...u, activityCount: actMap[u._id.toString()]?.count || 0, lastActivityAt: actMap[u._id.toString()]?.last || u.lastLoginAt || u.createdAt, quizAttempts: attMap[u._id.toString()]?.count || 0, quizAverage: attMap[u._id.toString()] ? Math.round(attMap[u._id.toString()].avg * 100) : null }))
  });
}));

app.get("/api/admin/users/:id", auth("admin"), wrap(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ message: "User not found." });
  const user = await User.findById(req.params.id).select("name email role status isDemo createdAt lastLoginAt loginCount").lean();
  if (!user) return res.status(404).json({ message: "User not found." });
  const [activities, attempts, byType] = await Promise.all([
    Activity.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Attempt.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Activity.aggregate([{ $match: { userId: user._id } }, { $group: { _id: "$type", count: { $sum: 1 } } }])
  ]);
  const avg = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score / Math.max(b.total, 1), 0) / attempts.length * 100) : null;
  res.json({ user, activities, attempts, quizAverage: avg, byType: byType.map((t) => ({ type: t._id, count: t.count })) });
}));

app.patch("/api/admin/users/:id", auth("admin"), wrap(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ message: "User not found." });
  const { status } = req.body || {};
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ message: "Status must be active or suspended." });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.role === "admin") return res.status(400).json({ message: "Administrator accounts cannot be suspended here." });
  user.status = status;
  await user.save();
  res.json({ ok: true, status: user.status });
}));

app.delete("/api/admin/users/:id", auth("admin"), wrap(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ message: "User not found." });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.role === "admin") return res.status(400).json({ message: "Administrator accounts cannot be deleted here." });
  await Promise.all([Activity.deleteMany({ userId: user._id }), Attempt.deleteMany({ userId: user._id }), user.deleteOne()]);
  res.json({ ok: true });
}));

app.get("/api/admin/activity", auth("admin"), wrap(async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const filter = {};
  if (ACTIVITY_TYPES.includes(req.query.type)) filter.type = req.query.type;
  if (req.query.before && !Number.isNaN(Date.parse(req.query.before))) filter.createdAt = { $lt: new Date(req.query.before) };
  const rows = await Activity.find(filter).sort({ createdAt: -1 }).limit(limit + 1).populate("userId", "name email").lean();
  const more = rows.length > limit;
  const items = rows.slice(0, limit).map((a) => ({ id: a._id, type: a.type, detail: a.detail, meta: a.meta, createdAt: a.createdAt, user: a.userId ? { id: a.userId._id, name: a.userId.name, email: a.userId.email } : null }));
  res.json({ items, next: more ? items[items.length - 1].createdAt : null });
}));

// Demo data controls (admin only). Demo accounts are flagged isDemo so they can be removed cleanly.
app.post("/api/admin/demo-users", auth("admin"), wrap(async (req, res) => {
  const count = Math.min(100, Math.max(1, parseInt(req.body?.count) || 50));
  res.status(201).json(await seedDemoUsers(count));
}));
app.delete("/api/admin/demo-users", auth("admin"), wrap(async (_req, res) => res.json(await removeDemoUsers())));

// ---------------------------------------------------------------- Admin: content management
for (const [path, Model] of [["topics", Topic], ["scams", Scam], ["quizzes", Quiz]]) {
  app.get(`/api/admin/${path}`, auth("admin"), wrap(async (_req, res) => {
    res.json(await Model.find().sort({ createdAt: -1 }));
  }));
  app.post(`/api/admin/${path}`, auth("admin"), wrap(async (req, res) => {
    res.status(201).json(await Model.create(req.body));
  }));
  app.put(`/api/admin/${path}/:id`, auth("admin"), wrap(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Content not found." });
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Content not found." });
    res.json(doc);
  }));
  app.delete(`/api/admin/${path}/:id`, auth("admin"), wrap(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Content not found." });
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Content not found." });
    res.json({ ok: true });
  }));
}

// Basic client-side safety hints only. This is not a malware scanner or proof that a URL is safe.
app.post("/api/check-url", auth(null, { optional: true }), wrap(async (req, res) => {
  const raw = String(req.body.url || "").trim().slice(0, 2000);
  let parsed;
  try { parsed = new URL(raw); } catch { return res.status(400).json({ message: "Enter a complete URL, including https:// or http://." }); }
  const host = parsed.hostname.toLowerCase();
  const flags = [];
  if (parsed.protocol !== "https:") flags.push("This address does not use HTTPS.");
  if (parsed.username || parsed.password) flags.push("The address contains embedded login information.");
  if (host.startsWith("xn--") || host.split(".").some(part => part.startsWith("xn--"))) flags.push("The domain uses encoded characters; check it carefully.");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) flags.push("The address uses an IP address instead of a familiar domain.");
  if (host.length > 45) flags.push("The domain name is unusually long.");
  if (/(login|verify|secure|update|account|kyc|gift|prize)/i.test(parsed.href)) flags.push("The address contains words commonly used in deceptive links.");
  if (parsed.hostname.split(".").length > 4) flags.push("The domain has several subdomain levels; inspect the registered domain.");
  if (req.user) await logActivity(req.user.id, "url_check", `Checked link: ${host}`, { host: host.slice(0, 80) });
  res.json({ url: raw, host, flags, status: flags.length ? "Review carefully" : "No basic warning found", note: "This quick check cannot confirm whether a website is safe. A scam site can use HTTPS and a dangerous site may have no obvious warning signs. Do not enter passwords, OTPs, card details or UPI PINs unless you independently trust the site." });
}));

app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found." }));

app.use((err, _req, res, _next) => {
  console.error(err.userMessage || err.message);
  if (err?.userMessage) return res.status(500).json({ message: err.userMessage });
  if (err?.name === "ValidationError") return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(" ") });
  if (err?.name === "CastError") return res.status(400).json({ message: "Invalid value in request." });
  if (err?.code === 11000) return res.status(409).json({ message: "That item already exists." });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid request body." });
  if (/Mongo|ECONNREFUSED|ENOTFOUND|selection/i.test(String(err?.name) + String(err?.message))) return res.status(500).json({ message: explainDbError(err) });
  res.status(500).json({ message: "Something went wrong on the server. Check the backend terminal for details." });
});

export default app;
