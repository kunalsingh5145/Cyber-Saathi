// Database models.
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  isDemo: { type: Boolean, default: false },
  lastLoginAt: Date,
  loginCount: { type: Number, default: 0 }
}, { timestamps: true });

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: "Online safety" },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  icon: { type: String, default: "shield" },
  published: { type: Boolean, default: true }
}, { timestamps: true });

const scamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channel: { type: String, default: "SMS / WhatsApp" },
  example: { type: String, required: true },
  warningSigns: { type: [String], default: [] },
  safeAction: { type: String, required: true },
  published: { type: Boolean, default: true }
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answerIndex: { type: Number, required: true },
  explanation: { type: String, required: true }
}, { _id: true });

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  questions: { type: [questionSchema], default: [] },
  published: { type: Boolean, default: true }
}, { timestamps: true });

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  quizTitle: { type: String, default: "" },
  score: Number,
  total: Number
}, { timestamps: true });

export const ACTIVITY_TYPES = ["register", "login", "logout", "page_view", "scam_view", "quiz_attempt", "url_check", "report_help"];

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ACTIVITY_TYPES, required: true },
  detail: { type: String, default: "", maxlength: 200 },
  meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Topic = mongoose.models.Topic || mongoose.model("Topic", topicSchema);
export const Scam = mongoose.models.Scam || mongoose.model("Scam", scamSchema);
export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
export const Attempt = mongoose.models.Attempt || mongoose.model("Attempt", attemptSchema);
export const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
