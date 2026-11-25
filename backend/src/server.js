// Local development / normal Node hosting. (On Vercel, api/index.js is used instead.)
import { ENV_PATH, envFileExists, wrongEnvName, configProblems } from "./env.js";
import app from "./app.js";
import { connectDB } from "./db.js";

const port = Number(process.env.PORT) || 4000;

app.listen(port, async () => {
  console.log(`\nCyber Saathi API  ->  http://localhost:${port}   (health check: http://localhost:${port}/api/health)`);
  if (!envFileExists) {
    console.error(`\n[!] No .env file found. Expected it here:\n    ${ENV_PATH}`);
    if (wrongEnvName) console.error("    You have a file named .env.txt - rename it to .env");
    else console.error("    Create it by copying .env.example to .env and filling in your values.");
  }
  const problems = configProblems();
  if (problems.length) { problems.forEach((p) => console.error(`[!] ${p}`)); console.error("[!] Fix backend/.env, save, and the server will restart.\n"); return; }
  try { await connectDB(); console.log("[db] Connected to MongoDB\n"); }
  catch (e) { console.error(`[db] ${e.userMessage || e.message}\n`); }
});
