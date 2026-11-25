// Adds 50 demo users with activity:  npm run seed   (the admin dashboard has a button for this too)
import "../src/env.js";
import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { seedDemoUsers } from "../src/seed.js";

const count = Number(process.argv[2]) || 50;
try {
  await connectDB();
  const r = await seedDemoUsers(count);
  console.log(`Created ${r.users} demo users with ${r.activities} activity records and ${r.attempts} quiz attempts.`);
  console.log(`Demo accounts use the password: ${r.password}`);
} catch (e) {
  console.error(e.userMessage || e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
