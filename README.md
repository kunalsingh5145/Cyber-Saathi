# Cyber Saathi

Digital-safety awareness website: learn pages, scam library, games, cyber quiz, link checker, emergency help,
user accounts and an admin dashboard that shows every user and what they do.

```
cyber-saathi/
├── backend/    Express + MongoDB API   (deploys to Vercel as its own project)
├── frontend/   React + Vite website    (deploys to Vercel as its own project)
└── package.json   convenience scripts to run both locally with one command
```

## 1. Connect your MongoDB

The backend reads **one file: `backend/.env`** (create it by copying `backend/.env.example`).

### Option A – MongoDB Atlas (free cloud database, needed for Vercel)
1. Sign up at https://www.mongodb.com/atlas and create a free **M0** cluster.
2. **Database Access → Add New Database User**: choose a username and password (letters and numbers are easiest).
3. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Vercel has no fixed IP, so this is required for deployment.
4. **Database → Connect → Drivers** and copy the connection string. It looks like  
   `mongodb+srv://myuser:<password>@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority`
5. Put your password in place of `<password>` and add the database name `cyber_saathi` before the `?`:  
   `mongodb+srv://myuser:mypassword@cluster0.abc12.mongodb.net/cyber_saathi?retryWrites=true&w=majority`  
   If the password contains special characters, encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`).
6. Paste it as `MONGODB_URI` in `backend/.env`.

### Option B – MongoDB installed on your computer
Install MongoDB Community Server (and optionally Compass), make sure it is running, and use  
`MONGODB_URI=mongodb://127.0.0.1:27017/cyber_saathi`. This only works on your own computer, not on Vercel.

The database and collections (users, activities, attempts, topics, scams, quizzes) are created automatically.

### The other settings in `backend/.env`
| Variable | Meaning |
|---|---|
| `JWT_SECRET` | Any long random text (32+ characters). Keep it private. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin login. **The admin account is created automatically when the backend starts** – no seed command. Changing these values and restarting updates the admin. |
| `CLIENT_ORIGIN` | (optional) Website address allowed to call the API, e.g. `https://cyber-saathi.vercel.app`. Leave empty locally. |
| `DEMO_USER_PASSWORD` | Password for the 50 demo users (default `Saathi@12345`). |

## 2. Run locally (one terminal)

```powershell
npm run install:all
copy backend\.env.example backend\.env      # then edit backend\.env
npm run dev
```

Open http://localhost:5173. Sign in as admin with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, or click **Create an account** to make a normal user.

**Is the backend OK?** Open http://localhost:4000/api/health – it tells you exactly what is wrong (missing `.env`, bad MongoDB password, Atlas blocking your IP, placeholder text, …). The backend terminal prints the same messages.

### Admin dashboard
- **Overview** – users, active in 24h, activities, quiz attempts, 14-day chart, top users.
- **Users** – search, filter, sort, export CSV; click a user for their full activity timeline and quiz history; suspend, reactivate or delete.
- **Activity feed** – live stream of what signed-in users do.
- **Manage content** – topics, scam examples and quizzes.
- **Users → Add 50 demo users** adds sample users with activity (or run `npm run seed`). **Remove demo** deletes only those.

Tracked for signed-in users: sign-in/out, pages viewed, scam examples opened, quiz scores, link checks (domain only), emergency page visits. No IP addresses or device data. Mention this in your privacy notice.

## 3. Deploy to Vercel (two projects from one GitHub repository)

Push the whole `cyber-saathi` folder to GitHub, then create **two** Vercel projects from that repository.

### Backend project
1. **Add New → Project** → import the repo. Set **Root Directory = `backend`**, Framework Preset = **Other**.
2. Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Deploy, then open `https://YOUR-BACKEND.vercel.app/api/health` – it must show `"database": true`.

### Frontend project
1. **Add New → Project** → import the same repo. Set **Root Directory = `frontend`**, Framework Preset = **Vite**.
2. Environment Variable: `VITE_API_URL` = `https://YOUR-BACKEND.vercel.app/api`
3. Deploy.

### Finish
Back in the **backend** project add `CLIENT_ORIGIN` = your frontend address (e.g. `https://cyber-saathi.vercel.app`, no trailing slash) and **Redeploy** it. This restricts the API to your website.
If you change `VITE_API_URL` later, redeploy the frontend (it is baked in at build time).

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Cannot reach the backend" | The backend is not running (use `npm run dev` from the main folder) or `VITE_API_URL` is wrong in production. |
| Health says "No .env file" | The file must be exactly `backend/.env` (not `.env.txt`, not in another folder). |
| "MongoDB rejected the username or password" | Fix the user/password in `MONGODB_URI`; URL-encode special characters. |
| "Could not reach MongoDB in time" | Atlas → Network Access → allow your IP (or `0.0.0.0/0`). |
| Browser says CORS error | Set `CLIENT_ORIGIN` to the exact website address (or leave it empty while testing). |
| Port 4000 already in use | Close the old terminal still running the backend, or set `PORT` in `backend/.env`. |

## Before going public
Change the admin password, remove the demo users, and keep `.env` out of GitHub (already in `.gitignore`).
