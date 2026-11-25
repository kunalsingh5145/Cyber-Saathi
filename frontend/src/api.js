// Address of the backend API.
//  - Local development: "/api" (Vite forwards it to the backend on port 4000).
//  - Production: set VITE_API_URL to your deployed backend, e.g. https://cyber-saathi-api.vercel.app/api
export const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const NOT_RUNNING = import.meta.env.DEV
  ? "Cannot reach the backend. Start the project with `npm run dev` from the main folder (the backend runs on port 4000), then try again."
  : "Cannot reach the backend. Check that the backend is deployed and that VITE_API_URL points to it.";

export async function request(path, options = {}) {
  const token = localStorage.getItem("cs_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error(NOT_RUNNING);
  }

  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  if (!isJson) {
    // In development the Vite proxy answers with a plain error when the backend is not running.
    throw new Error(import.meta.env.DEV ? NOT_RUNNING : "The backend returned an unexpected response. Check VITE_API_URL.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // An expired, deleted or suspended account: end the session cleanly.
    if (response.status === 401 && token && !path.startsWith("/auth")) {
      localStorage.removeItem("cs_token");
      localStorage.removeItem("cs_user");
      window.dispatchEvent(new Event("cs-session-expired"));
    }
    throw new Error(data.message || "Request failed.");
  }
  return data;
}

// Records what a signed-in user does so administrators can follow activity. Never blocks the UI.
export function track(type, detail = "", meta) {
  if (!localStorage.getItem("cs_token")) return;
  request("/activity", { method: "POST", body: JSON.stringify({ type, detail, meta }) }).catch(() => {});
}
