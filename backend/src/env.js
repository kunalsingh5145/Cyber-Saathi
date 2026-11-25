// Loads backend/.env no matter which folder you start the server from.
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ENV_PATH = path.join(root, ".env");
export const envFileExists = fs.existsSync(ENV_PATH);
export const wrongEnvName = fs.existsSync(path.join(root, ".env.txt"));
dotenv.config({ path: ENV_PATH });

// Returns a list of problems that stop the app from working (empty list = all good).
export function configProblems() {
  const problems = [];
  const uri = process.env.MONGODB_URI || "";
  if (!uri) problems.push("MONGODB_URI is missing in backend/.env");
  else if (/USERNAME|YOUR-CLUSTER|PASSWORD@/.test(uri)) problems.push("MONGODB_URI still contains placeholder text (USERNAME / PASSWORD / YOUR-CLUSTER). Paste your real connection string.");
  else if (!/^mongodb(\+srv)?:\/\//.test(uri)) problems.push("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) problems.push("JWT_SECRET is missing or too short (use 32+ random characters) in backend/.env");
  return problems;
}
