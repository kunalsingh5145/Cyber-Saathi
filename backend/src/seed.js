// Demo-data generator shared by `npm run seed` and the admin dashboard button.
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User, Activity, Attempt } from "./models.js";

export const DEMO_DOMAIN = "demo.cybersaathi.in";
export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "Saathi@12345";

const first = ["Aarav","Vivaan","Aditya","Arjun","Reyansh","Krishna","Ishaan","Rohan","Kabir","Dhruv","Ananya","Diya","Saanvi","Aadhya","Myra","Priya","Kavya","Riya","Meera","Isha","Rahul","Amit","Sanjay","Vikram","Manoj","Sunita","Anita","Pooja","Neha","Ritu","Harpreet","Gurpreet","Mohammed","Fatima","Zoya","Imran","Lakshmi","Venkat","Suresh","Deepa","Karthik","Swati","Nikhil","Tanvi","Yash","Sneha","Rajesh","Kiran","Alok","Bhavna"];
const last = ["Sharma","Verma","Gupta","Singh","Kumar","Yadav","Patel","Mehta","Joshi","Reddy","Nair","Iyer","Khan","Ansari","Das","Banerjee","Chauhan","Malik","Bansal","Kapoor","Rao","Pillai","Bhatia","Saxena","Tiwari"];
const pages = ["home","learn","scams","games","quiz","link-check","emergency"];
const pageLabel = { home: "Home", learn: "Learn", scams: "Scam library", games: "Play games", quiz: "Cyber quiz", "link-check": "Link checker", emergency: "Emergency help" };
const scamTitles = ["UPI collect request disguised as a refund","Digital arrest impersonation","Fake KYC update message","Investment group guaranteed returns","OTP forwarding scam","Courier parcel customs fee","Fake job registration fee","QR code refund trick"];
const urls = ["http://sbi-kyc-update.example/login","https://amazon-gift-prize.example/claim","https://secure-paytm-verify.example","https://wikipedia.org","http://192.168.4.20/bank","https://news.example.com"];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

export async function seedDemoUsers(count = 50) {
  const demoUsers = await User.find({ isDemo: true }).select("_id");
  const ids = demoUsers.map((u) => u._id);
  if (ids.length) {
    await Activity.deleteMany({ userId: { $in: ids } });
    await Attempt.deleteMany({ userId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10); // one hash reused for all demo accounts
  const now = Date.now();
  const day = 86400000;
  const users = [];
  const used = new Set();
  for (let i = 0; used.size < count && i < count * 20; i++) {
    const f = pick(first), l = pick(last);
    const email = `${f}.${l}${used.size + 1}@${DEMO_DOMAIN}`.toLowerCase();
    if (used.has(email)) continue;
    used.add(email);
    const joinedDaysAgo = 1 + rnd(75);
    const createdAt = new Date(now - joinedDaysAgo * day - rnd(day));
    users.push({ name: `${f} ${l}`, email, passwordHash, role: "user", status: used.size % 17 === 0 ? "suspended" : "active", isDemo: true, createdAt, updatedAt: createdAt, joinedDaysAgo });
  }

  const created = await User.insertMany(users.map(({ joinedDaysAgo, ...u }) => u), { timestamps: false });
  const activities = [];
  const attempts = [];
  created.forEach((user, idx) => {
    const joinedMs = user.createdAt.getTime();
    const span = Math.max(now - joinedMs, day);
    const activityLevel = 0.3 + Math.random(); // some users are much more active than others
    const sessions = Math.max(1, Math.round(activityLevel * (1 + span / day / 4)));
    let lastLogin = joinedMs;
    activities.push({ userId: user._id, type: "register", detail: "Created an account", createdAt: new Date(joinedMs) });
    for (let s = 0; s < sessions; s++) {
      let t0 = joinedMs + Math.random() * span * (0.15 + 0.85 * Math.pow(Math.random(), 0.6));
      // Roughly half of the users have a recent session so the dashboard shows live-looking activity.
      if (s === sessions - 1 && Math.random() < 0.5) t0 = Math.max(joinedMs + 60000, now - Math.random() * 36 * 3600000);
      const start = Math.min(t0, now - 60000);
      activities.push({ userId: user._id, type: "login", detail: "Signed in", createdAt: new Date(start) });
      lastLogin = Math.max(lastLogin, start);
      let t = start;
      const events = 2 + rnd(6);
      for (let e = 0; e < events; e++) {
        t += 20000 + rnd(240000);
        const r = Math.random();
        const when = new Date(Math.min(t, now));
        if (r < 0.5) {
          const p = pick(pages);
          activities.push({ userId: user._id, type: "page_view", detail: `Viewed ${pageLabel[p]}`, meta: { page: p }, createdAt: when });
        } else if (r < 0.68) {
          activities.push({ userId: user._id, type: "scam_view", detail: `Read scam example: ${pick(scamTitles)}`, createdAt: when });
        } else if (r < 0.86) {
          const total = 10;
          const score = Math.min(total, Math.max(2, Math.round(total * (0.35 + Math.random() * 0.65))));
          activities.push({ userId: user._id, type: "quiz_attempt", detail: `Everyday Cyber Safety: ${score}/${total}`, meta: { score, total }, createdAt: when });
          attempts.push({ userId: user._id, quizId: new mongoose.Types.ObjectId(), quizTitle: "Everyday Cyber Safety", score, total, createdAt: when, updatedAt: when });
        } else if (r < 0.96) {
          const u = pick(urls);
          activities.push({ userId: user._id, type: "url_check", detail: `Checked link: ${u}`, meta: { host: u.replace(/^https?:\/\//, "").split("/")[0] }, createdAt: when });
        } else {
          activities.push({ userId: user._id, type: "report_help", detail: "Opened emergency guidance", createdAt: when });
        }
      }
      if (Math.random() < 0.7) activities.push({ userId: user._id, type: "logout", detail: "Signed out", createdAt: new Date(Math.min(t + 30000, now)) });
    }
    user._lastLogin = lastLogin; user._logins = sessions;
  });

  await Activity.insertMany(activities, { ordered: false });
  if (attempts.length) await Attempt.insertMany(attempts, { timestamps: false });
  await Promise.all(created.map((u) => User.updateOne({ _id: u._id }, { $set: { lastLoginAt: new Date(u._lastLogin), loginCount: u._logins } }, { timestamps: false })));
  return { users: created.length, activities: activities.length, attempts: attempts.length, password: DEMO_PASSWORD };
}

export async function removeDemoUsers() {
  const ids = (await User.find({ isDemo: true }).select("_id")).map((u) => u._id);
  if (!ids.length) return { users: 0 };
  await Activity.deleteMany({ userId: { $in: ids } });
  await Attempt.deleteMany({ userId: { $in: ids } });
  const r = await User.deleteMany({ _id: { $in: ids } });
  return { users: r.deletedCount };
}
