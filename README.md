# Wardrobe AI

A personal closet app: photograph your clothes, let AI tag them, and get
outfit suggestions from a built-in color-and-style matching engine that works
entirely offline.

## Features

- **Digital closet** — grid of all your clothes with filters by type, color, and style
- **AI tagging** — snap a photo (or pick from your gallery) and the backend asks a
  vision model to identify the type, colors, pattern, style, and season. If the
  backend is unreachable you can always tag items by hand.
- **"What goes with this?"** — pick any item and see every other piece ranked by
  how well it pairs, with a score and a plain-English reason
- **Saved outfits** — combine matched pieces into named outfits with an overall score
- **Favorites and wear log** — mark favorites; the database tracks wear history

## What's in this folder

| Folder     | What it is |
|------------|------------|
| `mobile/`  | The phone app (Expo / React Native, TypeScript) |
| `backend/` | A small Python server that does the AI photo tagging |

## Setup (one time)

You need two free tools installed:

1. **Node.js** (runs the phone app tooling) — download the LTS version from
   https://nodejs.org and run the installer.
2. **Python 3.10+** (runs the tagging server) — download from https://www.python.org
   (on Windows, tick "Add python.exe to PATH" during install).

### 1. Get a free Groq API key

The AI tagging uses Groq's free tier.

1. Go to https://console.groq.com and sign up (free).
2. Open the **API Keys** section and create a key.
3. In a terminal, set it before starting the backend:

   **Windows (PowerShell):**
   ```powershell
   $env:GROQ_API_KEY = "paste-your-key-here"
   ```
   **Mac/Linux:**
   ```bash
   export GROQ_API_KEY="paste-your-key-here"
   ```

   (See `backend/.env.example` for the variable name.)

### 2. Install and run the backend

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Leave this window open. Check it works by visiting http://localhost:8000/health
in your browser — you should see `{"status":"ok", ...}`.

The app still works without the backend — you'll just tag items manually.

### 3. Install and run the phone app

In a **second** terminal:

```powershell
cd mobile
npm install
npx expo start
```

## Testing on your real phone (Expo Go)

1. Install the **Expo Go** app from the App Store / Play Store.
2. Make sure your phone and computer are on the **same Wi-Fi network**.
3. Find your computer's LAN IP: on Windows run `ipconfig` and look for
   "IPv4 Address" (something like `192.168.1.42`).
4. Open `mobile/src/config.ts` and change the backend URL:
   ```ts
   export const BACKEND_URL = 'http://192.168.1.42:8000';
   ```
5. Restart the backend so it accepts outside connections:
   ```powershell
   uvicorn main:app --reload --host 0.0.0.0
   ```
6. Run `npx expo start` in `mobile/` and scan the QR code with your phone
   (Camera app on iPhone, Expo Go app on Android).

## How the matching works

The matcher is pure logic on your phone — no internet needed. Every pair of
items starts at a neutral 50 and rules adjust the score, clamped to 0-100:

**Color (12-hue color wheel)**
- Complementary colors (opposites, like blue + orange): **+30**
- Analogous colors (neighbors, like pink + red): **+25**
- Same color family: **+15**
- A neutral (black, white, grey, beige, brown, denim) pairs with anything: **+20**

**Pattern**
- Two patterned pieces together: **−25** (patterns compete)
- One solid + one pattern: **+10** (the solid balances it)

**Style**
- Same style vibe: **+15**
- Formal + sporty: **−30** (blazer with gym shorts — no)

Each suggestion comes with a one-line explanation, so you learn the "why"
behind the pairing. Roughly: 75+ is a great match, 50-74 is safe, below 50
means think twice.

## Going to production (her phone, your laptop off)

### A. Put the backend on the internet (free, ~10 min)

1. Push this folder to a GitHub repo.
2. Go to [render.com](https://render.com) → **New → Blueprint** → pick the repo
   (it reads `backend/render.yaml` automatically).
3. When prompted, set:
   - `GROQ_API_KEY` — your Groq key
   - `APP_SECRET` — any long random string you invent (this stops strangers
     from using your Groq quota)
4. Render gives you a URL like `https://wardrobe-ai-backend.onrender.com`.

Note: Render's free tier sleeps after 15 min idle — the first tag of the day
takes ~50s to wake up, then it's fast. The app falls back to manual tagging
if it times out, so nothing breaks.

### B. Build the real Android app (free, ~20 min)

1. Edit `mobile/src/config.ts`:
   - `BACKEND_URL` → your Render URL
   - `APP_SECRET` → the same random string from step A3
2. Create a free account at [expo.dev](https://expo.dev), then:
   ```
   cd mobile
   npm install -g eas-cli
   eas login
   eas build -p android --profile preview
   ```
3. Expo's servers build the APK (~15 min) and give you a download link /
   QR code. Open it on her phone, install the APK, done — "Wardrobe AI"
   with its own icon, works anywhere, laptop off.

To ship an update later: bump nothing, just run the same `eas build` command
and install the new APK over the old one (her closet data is kept).
