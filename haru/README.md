# Haru — Tasks & Notes for KiroCrew

A clean, simple markdown notes & task workspace for KiroCrew.

- **Workspace**: Write `# Sections`, notes, and `[] tasks`. Every task row lets you pick any KiroCrew **Agent** and **Model** (`Auto`, `Qwen3 Coder Next`, `MiniMax M2.5`, `MiniMax M2.1`, `DeepSeek 3.2`, `GLM-5`, `Claude Sonnet 4.5`, `Claude Haiku 4.5`, etc.) and click **▶ Run** to submit the task directly as a new KiroCrew session and navigate to it. Features 4 switchable views: **Split View**, **Task Runner**, **Markdown**, and **🌱 Garden**.
- **🌱 Garden (Cute Focus View)**: Renders tasks as cute animated **Mochi Buds** ordered strictly by the sequence you added them. Includes **Garden Quest** mechanics: the first unfinished task acts as the 🚩 **Leader**, a Pomodoro-style **⏱ Tend focus timer** that visually sprouts your bud as time passes, **☀ Sunshine rewards**, a daily goal ring with rain-day streaks, and unlocked **🐾 cute open-source companions** with a Pikmin-like squad trail.
- **Radar**: View and manage all **incomplete and unfinished tasks**, running KiroCrew sessions, `@People` assignments, and `#Tags` in one place.

## Why the name "Haru"?
**Haru (`하루`)** is the Korean word for **"One Day" / "A Day"** (and in Japanese `春` means "Spring"). It was named Haru because the workspace is designed as a simple daily anchor for your notes and agent tasks.

## Quick Build & Live Testing in KiroCrew

From `c:\Users\root\.gemini\antigravity\playground\sparse-rosette\haru`:

### 1. One-Command Build & Sync to KiroCrew
```bash
npm run build
```
This compiles `ui/dist/haru-0.1.2.mjs` and automatically syncs `app.json`, `backend/`, and `ui/dist/` directly into `C:\Users\root\.kiro\crew\apps\haru`.

### 2. Live Watch Mode (Auto-Rebuild & Auto-Sync on Save)
```bash
npm run dev
```
Watches `ui/src/` and `backend/`. Every time you save a file, it rebuilds and syncs to `C:\Users\root\.kiro\crew\apps\haru`, and the open Haru page in KiroCrew hot-reloads the updated bundle automatically.


```
$py = "C:\Users\root\AppData\Local\Programs\KiroCrew\resources\backend-dist\kirocrew-backend\python.exe"

& $py -s -P -m kiro_crew app uninstall haru
& $py -s -P -m kiro_crew app install .
& $py -s -P -m kiro_crew app enable haru
```