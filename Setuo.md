# Contributing to the Three.js PWA Project

> Team onboarding & CI/CD pipeline guide for new contributors.  
> **Stack:** Plain HTML/JS · Three.js (CDN) · GitHub Actions · ESLint

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [One-time setup](#2-one-time-setup)
3. [Daily workflow](#3-daily-workflow)
4. [CI pipeline](#4-understanding-the-ci-pipeline)
5. [Project structure](#5-project-structure)
6. [Rules everyone must follow](#6-rules-everyone-must-follow)
7. [Getting help](#7-getting-help)
8. [Quick start summary](#quick-start-summary)

---

## 1. Prerequisites

Make sure you have the following installed before you begin.

| Tool | Purpose |
|------|---------|
| Git | Version control — track and share code changes |
| Node.js (v20+) | Required to run ESLint locally |
| VS Code *(recommended)* | Code editor with Git and Live Server built in |
| Live Server extension | Serves the app locally without a bundler |
| GitHub account | Where the shared repo lives — ask the lead for access |

**Install check:** open your terminal and run:

```sh
git --version
node --version
```

Both should return a version number. If not, install from [git-scm.com](https://git-scm.com) and [nodejs.org](https://nodejs.org).

---

## 2. One-time setup

Run through this section exactly once when you first join the project.

### 2.1 Configure Git identity

```sh
git config --global user.name "Your Full Name"
git config --global user.email "you@yourcompany.com"
```

> **Important:** use the same email address that is linked to your GitHub account.

### 2.2 Clone the repository

The lead developer will share the repository URL with you:

```sh
git clone https://github.com/aryanyenpurecodativelabs-netizen/Mock.git
cd Mock
```

### 2.3 Install ESLint

There is no bundler in this project, but ESLint is needed so the CI pipeline can check your code style:

```sh
npm install
```

This installs ESLint and nothing else. It takes under a minute.

### 2.4 Copy the environment file

The `.env` file is never committed to Git, so you need to create it yourself:

```sh
cp .env.example .env
```

Open `.env` and fill in any values the lead tells you about. Leave the rest as-is.

### 2.5 Run the project locally

Since there is no build step, you just need to serve the files with a local web server.

**Option A — VS Code Live Server (easiest):**

1. Open the project folder in VS Code
2. Install the Live Server extension if you haven't already (search in Extensions panel)
3. Right-click `index.html` → **Open with Live Server**
4. Your browser opens at `http://127.0.0.1:5500`

**Option B — terminal:**

```sh
npx serve .
```

> Three.js ES modules don't work from `file://` paths — always use one of these two options.

---

## 3. Daily workflow

Every day you work on the project, follow this exact flow. It keeps everyone's work separate and ensures nothing broken reaches `main`.

### 3.1 Always start from an up-to-date main

```sh
git checkout main
git pull origin main
```

### 3.2 Create your feature branch

Use the naming pattern `type/your-name-short-description`:

```sh
git checkout -b feature/alice-add-lighting
```

| Prefix | When to use |
|--------|-------------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Cleanup, docs, config changes |

### 3.3 Write your code

Keep commits small and focused — one logical change per commit:

```sh
git add .
git commit -m "Add ambient and directional lights to scene"
```

You can make as many commits as you need while working.

### 3.4 Push your branch

```sh
git push origin feature/alice-add-lighting
```

**What happens automatically when you push:**

- GitHub Actions detects your push and starts the CI pipeline
- It runs ESLint on your code and validates that the PWA files (`manifest.json`, `sw.js`, `index.html`) are present and valid
- You'll see a ✅ or ❌ next to your commit on GitHub within ~60 seconds

### 3.5 Open a Pull Request (PR)

1. Go to the repo on GitHub
2. Click **Compare & pull request** in the banner that appears
3. Write a short description of what you changed and why
4. Assign at least one teammate as a reviewer
5. Click **Create pull request**

**You cannot merge unless:**
- The CI pipeline passes (lint + PWA validation both green)
- At least one teammate has approved the PR
- Your branch is up to date with `main`

### 3.6 Respond to review feedback

Make fixes on the same branch, commit, and push again. The PR updates automatically and CI re-runs:

```sh
# make your fixes, then:
git add .
git commit -m "Fix lint errors in Controls.js"
git push origin feature/alice-add-lighting
```

### 3.7 Merge and clean up

Once approved and CI is green, click **Merge pull request** on GitHub. Then clean up locally:

```sh
git checkout main
git pull origin main
git branch -d feature/alice-add-lighting
```

---

## 4. Understanding the CI pipeline

The CI pipeline runs automatically on every push and pull request — you do not trigger it manually.

| Check | What it does |
|-------|-------------|
| Lint check | Runs ESLint on all `.js` files in `src/` and `app.js` to catch code style errors and undefined variables |
| Validate `manifest.json` | Confirms the PWA manifest file exists and is valid JSON |
| Validate `sw.js` | Confirms the service worker file is present |
| Validate `index.html` | Confirms the app entry point exists |

### 4.1 If the pipeline fails

Click the **Details** link next to the failing check to see the exact error.

Common ESLint errors and how to fix them:

| Error | Fix |
|-------|-----|
| `no-unused-vars` | Remove or use the variable you declared |
| `no-undef` | Import the missing variable, or check for a typo |
| `semi` | Remove the semicolon at the end of the line |
| `quotes` | Change double quotes to single quotes |

After fixing, push again and the pipeline re-runs automatically.

### 4.2 Run lint locally before pushing

Catch errors before they reach CI:

```sh
npm run lint
```

Fix all errors and warnings before pushing — this saves time waiting for the pipeline.

---

## 5. Project structure

```
my-threejs-pwa/
├── index.html              # App entry point — loads app.js via ES module
├── app.js                  # Wires together scene, camera, renderer, lights
├── src/
│   ├── core/               # Three.js engine: scene, camera, renderer, loop
│   ├── components/         # Reusable 3D objects: lights, controls, meshes
│   ├── loaders/            # Helpers for loading .glb models and textures
│   ├── utils/              # Shared math helpers and resize handler
│   └── styles/main.css     # Global styles — canvas sizing and body reset
├── public/
│   ├── manifest.json       # PWA config — app name, icons, theme color
│   └── sw.js               # Service worker — handles offline caching
├── assets/
│   ├── models/             # 3D model files (.glb / .gltf)
│   └── textures/           # Texture files (.jpg / .png / .ktx2)
├── .github/workflows/      # CI and deploy pipeline definitions
├── .eslintrc.json          # ESLint rules applied by the pipeline and locally
├── .env.example            # Example environment variables — safe to commit
└── .env                    # Your local environment values — NEVER commit this
```

---

## 6. Rules everyone must follow

- **Never push directly to `main`.** Always use a branch and a Pull Request.
- **Never commit the `.env` file.** It contains secrets.
- **Always pull from `main` before creating a new branch.**
- **Keep your branch short-lived** — merge within a day or two to avoid conflicts.
- **Write clear commit messages** that explain what changed, not just what you did.
- **Review teammates' PRs promptly** — don't leave them waiting more than one working day.
- **If CI fails, fix it before asking for a review.**

---

## 7. Getting help

| Situation | What to do |
|-----------|-----------|
| CI is failing but you can't figure out why | Click **Details** on the failing check — the error log is there. Then run `npm run lint` locally. |
| Git says your branch is behind `main` | Run `git pull origin main`, fix any merge conflicts, then push again. |
| You accidentally committed to `main` | Message the lead immediately. Do not push. |
| You need access to the repo | Ask the lead to add you in GitHub **Settings → Collaborators**. |
| The app won't load locally | Make sure you're using Live Server or `npx serve` — Three.js ES modules don't work from `file://` paths. |

---

## Quick start summary

```sh
# 1. Configure Git
git config --global user.name "Your Full Name"
git config --global user.email "you@yourcompany.com"

# 2. Clone and install
git clone <repo-url> && cd my-threejs-pwa
npm install
cp .env.example .env

# 3. Open index.html with Live Server (or: npx serve .)

# 4. Every day: branch → code → commit → push → PR → CI green → review → merge
git checkout main && git pull origin main
git checkout -b feature/your-name-task
# ... make changes ...
git add . && git commit -m "Describe your change"
git push origin feature/your-name-task
# Open PR on GitHub, get review, merge
```
