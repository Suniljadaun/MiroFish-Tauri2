# MiroFish Desktop — Tauri 2 Wrapper

> A plug-and-play macOS `.app` that runs the MiroFish swarm intelligence engine locally.  
> No Docker. No Python install needed on the user's machine. Just double-click and go.

---

## Architecture

```
MiroFish.app
├── Tauri 2 (Rust)          — window, lifecycle, IPC
├── Vue 3 frontend           — setup screen + launch screen + iframe shell
├── mirofish-server sidecar  — PyInstaller-bundled Flask backend
│   └── full Python env      — Flask, OASIS, Zep, OpenAI, PyMuPDF …
└── MiroFish Vue UI          — original frontend served by Flask at :5001
```

The Rust core spawns the Python sidecar on launch, passing API keys as
environment variables. The Vue wrapper polls `/health` until ready, then
loads the full MiroFish UI inside an iframe.

---

## Repo Layout

```
mirofish-tauri/              ← this folder (place next to MiroFish/)
├── .github/
│   └── workflows/
│       └── build-macos.yml  ← GitHub Actions: builds .app on macOS runner
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs           ← Tauri commands: start/stop/status backend
│   ├── capabilities/
│   │   └── default.json     ← Tauri 2 permissions
│   ├── icons/               ← app icons (generate with tauri icon)
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
├── frontend/
│   ├── src/
│   │   ├── App.vue           ← orchestrates setup → launch → app phases
│   │   ├── main.js
│   │   ├── tauri-bridge.js   ← wraps all invoke() calls
│   │   ├── config-store.js   ← persists API keys via plugin-store
│   │   └── components/
│   │       ├── SetupScreen.vue   ← first-launch API key form
│   │       └── LaunchScreen.vue  ← animated loading while sidecar starts
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── mirofish_server.spec      ← PyInstaller spec for the Python sidecar
└── package.json              ← root (tauri CLI)
```

---

## Prerequisites (your Ubuntu dev machine)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Node 20+
node --version   # must be >= 18

# Python 3.11
python3.11 --version
```

---

## Local Dev Setup (Ubuntu)

### 1. Clone & position repos

```bash
git clone https://github.com/666ghj/MiroFish.git
# your Tauri wrapper should sit beside it:
ls
# MiroFish/   mirofish-tauri/
```

### 2. Install Python backend deps

```bash
cd MiroFish/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pyinstaller
```

### 3. Copy .env and verify backend starts

```bash
cd MiroFish
cp .env.example .env
# Edit .env — fill in LLM_API_KEY and ZEP_API_KEY
nano .env

# Test it runs:
cd backend && python run.py
# Should see: MiroFish Backend 启动完成 on port 5001
```

### 4. Install frontend deps

```bash
cd mirofish-tauri
npm install
cd frontend && npm install && cd ..
```

### 5. Dev mode (Linux window, hot-reload)

```bash
cd mirofish-tauri
npm run dev
# Tauri opens a window
# The setup screen appears — enter your API keys
# The sidecar launches — you see the launch screen
# Once /health responds, the MiroFish UI loads in the iframe
```

---

## Building the macOS .app via GitHub Actions

This is the **recommended path** — you code on Ubuntu, GitHub's macOS
runner compiles the real `.app`.

### 1. Create your GitHub repo

```bash
cd mirofish-tauri
git init
git add .
git commit -m "feat: initial Tauri 2 MiroFish desktop wrapper"
git remote add origin https://github.com/YOUR_USERNAME/mirofish-tauri.git
git push -u origin main
```

> **Important:** The workflow expects `MiroFish/` and `mirofish-tauri/` to
> both live at the repo root. The easiest way is a monorepo:
>
> ```
> repo-root/
> ├── MiroFish/          ← git submodule or just copied in
> └── mirofish-tauri/    ← this project
> ```
>
> Or adjust the `working-directory` paths in `build-macos.yml`.

### 2. Push → Actions triggers automatically

Go to **Actions** tab on GitHub → watch the `Build MiroFish macOS App` job.

### 3. Download the artifact

Once green: **Actions → your run → Artifacts → MiroFish-macOS → Download**

You get a `.dmg` and a `.app`. Send the `.dmg` link to the founder.

### 4. Tagging a release (optional)

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will also create a **GitHub Release** with the `.dmg`
attached — gives you a permanent download URL.

---

## Generate App Icons

```bash
# Install tauri CLI globally if needed
npm install -g @tauri-apps/cli

# From mirofish-tauri/
# Put a 1024x1024 PNG at src-tauri/icons/app-icon.png, then:
npx tauri icon src-tauri/icons/app-icon.png
```

This generates all required icon sizes including `.icns` for macOS.

---

## Environment Variables Passed to Sidecar

| Variable | Source |
|---|---|
| `LLM_API_KEY` | User-entered in SetupScreen, stored via plugin-store |
| `LLM_BASE_URL` | Same |
| `LLM_MODEL_NAME` | Same |
| `ZEP_API_KEY` | Same |
| `FLASK_PORT` | Hardcoded `5001` in Rust |
| `FLASK_DEBUG` | `false` in production |

Keys are persisted to `~/Library/Application Support/com.mirofish.desktop/config.json`
on macOS (handled by `@tauri-apps/plugin-store`).

---

## Tauri IPC Commands

| Command (Rust) | Called from JS | Purpose |
|---|---|---|
| `start_backend` | `tauri-bridge.js` | Spawn Python sidecar with env vars |
| `stop_backend` | App.vue | Kill sidecar process |
| `backend_status` | tauri-bridge.js | Check if process is alive |
| `set_backend_ready` | tauri-bridge.js | Mark health-check passed |
| `get_backend_port` | tauri-bridge.js | Get port (default 5001) |

---

## Troubleshooting

**Sidecar not found at launch**
- The binary must be at `src-tauri/binaries/mirofish-server-<triple>`
- Run the PyInstaller step manually to verify

**Health check times out**
- The Python backend may be crashing — check stderr in the Tauri console
- Most common cause: missing/invalid API keys

**iframe shows blank**
- The Vue frontend inside MiroFish must also be built: `cd MiroFish/frontend && npm run build`
- Flask serves it as static files — confirm `/` returns HTML

**macOS Gatekeeper blocks the app**
- Right-click → Open (first time) to bypass unsigned app warning
- Or code-sign with an Apple Developer certificate

---

## What the Founder Gets

1. Double-click `MiroFish.dmg`
2. Drag to Applications
3. Open MiroFish.app
4. Enter LLM + Zep API keys (one time)
5. Click **Save & Launch Swarm**
6. Full MiroFish UI loads locally — no browser, no Docker, no Python

---

## License

AGPL-3.0 — same as upstream MiroFish
