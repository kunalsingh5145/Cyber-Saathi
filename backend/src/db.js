
import "./env.js";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models.js";
import { configProblems } from "./env.js";

// Use DNS servers that successfully resolved your Atlas SRV records.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

mongoose.set("strictQuery", true);

export function explainDbError(error) {
  const m = String(error?.message || error);

  if (/bad auth|Authentication failed|auth failed/i.test(m))
    return "MongoDB rejected the username or password. Check MONGODB_URI and URL-encode special characters in the password.";

  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(m))
    return "MongoDB DNS lookup failed. Check your internet connection and Atlas hostname.";

  if (/ECONNREFUSED|ETIMEDOUT|MongoNetworkError/i.test(m))
    return `MongoDB network connection failed: ${m}`;

  if (/Server selection timed out|selection|whitelist|IP/i.test(m))
    return `Could not reach MongoDB: ${m}`;

  if (/Invalid scheme|Invalid connection string|URI/i.test(m))
    return "MONGODB_URI is not a valid connection string.";

  return `Database error: ${m}`;
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    console.warn("[admin] ADMIN_EMAIL / ADMIN_PASSWORD not set.");
    return;
  }

  if (password.length < 8) {
    console.warn("[admin] ADMIN_PASSWORD must be at least 8 characters.");
    return;
  }

  const existing = await User.findOne({ email });

  if (!existing) {
    await User.create({
      name: "Administrator",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin"
    });

    console.log(`[admin] Admin account created for ${email}`);
    return;
  }

  const same = await bcrypt.compare(password, existing.passwordHash);

  if (!same || existing.role !== "admin" || existing.status !== "active") {
    existing.passwordHash = same
      ? existing.passwordHash
      : await bcrypt.hash(password, 12);

    existing.role = "admin";
    existing.status = "active";

    await existing.save();
    console.log(`[admin] Admin account updated for ${email}`);
  }
}

let ready;

export function connectDB() {
  if (mongoose.connection.readyState === 1 && ready) return ready;

  if (!ready) {
    ready = (async () => {
      const problems = configProblems();

      if (problems.length) {
        const error = new Error(problems.join(" "));
        error.userMessage = problems.join(" ");
        throw error;
      }

      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 15000
        });

        console.log("[db] MongoDB connected successfully");

        await ensureAdmin();
      } catch (error) {
        if (!error.userMessage) {
          error.userMessage = explainDbError(error);
        }

        throw error;
      }
    })().catch(error => {
      ready = null;
      throw error;
    });
  }

  return ready;
}
