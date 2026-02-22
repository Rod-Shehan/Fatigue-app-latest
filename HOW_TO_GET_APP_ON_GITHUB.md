# How to put your Fatigue app on GitHub

You have the app on **your computer**. You want a **copy on GitHub** so it’s backed up and you can share or use it from another machine. That’s done by **pushing** (uploading), not cloning. Cloning is the opposite: downloading from GitHub to your computer.

Follow these steps in order.

---

## Step 1: Install Git on your computer

Git is the tool that talks to GitHub.

1. Go to: **https://git-scm.com/download/win**
2. Download and run the installer.
3. Use the default options (click Next through the steps).
4. When it’s done, **close Cursor and any terminals**, then open them again.

---

## Step 2: Create an empty repo on GitHub

1. Go to: **https://github.com**
2. Sign in (or create an account).
3. Click the **+** at the top right → **New repository**.
4. Fill in:
   - **Repository name:** e.g. `fatigue-app` (no spaces).
   - **Public** is fine.
   - **Do not** tick “Add a README file” or “Add .gitignore”.
5. Click **Create repository**.

You’ll see a page that says “Quick setup”. Leave that page open; you’ll use the repo address from it in Step 4.

---

## Step 2b: Tell Git who you are (do this once per computer)

Git needs your name and email for every commit. Run these **once** (use your real name and the email you use on GitHub):

```powershell
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

Example: `git config --global user.name "Rod Shehan"` and use the email linked to your GitHub account.

---

## Step 3: Turn your project into a Git repo and save the first version

Open **PowerShell** or **Command Prompt** and run these commands **one at a time**. Wait for each to finish before typing the next.

```powershell
cd "c:\Users\r_she\Documents\Fatigue app"
```

```powershell
git init
```

```powershell
git add .
```

```powershell
git commit -m "First version of Fatigue app"
```

- `git init` = “this folder is now a Git project”
- `git add .` = “include all files (except those in .gitignore)”
- `git commit` = “save this snapshot”

---

## Step 4: Connect your folder to GitHub and upload

You need **your repo address**. It looks like:

`https://github.com/YOUR_USERNAME/fatigue-app.git`

Replace **YOUR_USERNAME** with your actual GitHub username. The repo name is what you typed in Step 2 (e.g. `fatigue-app`).

Then run (use **your** repo address instead of the example):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/fatigue-app.git
```

```powershell
git branch -M main
```

```powershell
git push -u origin main
```

- **First command:** links this folder to your GitHub repo.
- **Second:** names the main branch `main`.
- **Third:** uploads your code to GitHub.

If Git asks for a username and password, use your GitHub username and a **Personal Access Token** (not your normal password). You can create one here: **https://github.com/settings/tokens** → Generate new token (classic), tick `repo`, then copy the token and paste it when Git asks for a password.

---

## Step 5: Check it worked

1. Go to **https://github.com** and open **your repo** (e.g. `YOUR_USERNAME/fatigue-app`).
2. You should see your project files (e.g. `app-next`, `PUSH_TO_GITHUB.md`, etc.).

That’s it. Your project is now on GitHub.

---

## How do I save my latest changes to GitHub? (Simple version)

After you’ve set things up once (Steps 1–4 above), saving your latest work to GitHub is two steps:

1. **Commit** = Git saves a snapshot of your project on your computer (like “Save”).
2. **Push** = Git sends that snapshot to GitHub (like “Upload”).

**Easiest: double-click this file in your project folder**

- **Back up to GitHub.bat** — Run it whenever you want to back up. It will add all changes, commit them, and push to GitHub. If the window says “nothing to commit,” you have no new changes; that’s fine.

**Or do it yourself in PowerShell (one command at a time):**

```powershell
cd "c:\Users\r_she\Documents\Fatigue app"
git add .
git commit -m "Back up my latest changes"
git push origin main
```

- `git add .` = “include all my changed files.”
- `git commit -m "..."` = “save a snapshot with this note.”
- `git push origin main` = “send that snapshot to GitHub.”

The first time you push, Git may ask for your GitHub username and a **Personal Access Token** (from https://github.com/settings/tokens, with `repo` ticked). Use the token as the password.

---

## Summary

| Word    | Meaning |
|--------|---------|
| **Clone** | Download a project **from** GitHub to your computer. |
| **Push**  | Upload **your** project **to** GitHub. |

You did a **push**: your computer → GitHub.

---

## If something goes wrong

- **“git is not recognized”**  
  Git isn’t installed or the terminal was open before you installed it. Install Git (Step 1) and open a **new** terminal.

- **“Permission denied” or “Authentication failed”**  
  Use a Personal Access Token instead of your GitHub password: https://github.com/settings/tokens → Generate new token (classic), tick `repo`, then use the token as the password when `git push` asks.

- **“Author identity unknown” / “unable to auto-detect email”**  
  Set your name and email first (Step 2b above), then run `git add .` and `git commit -m "First version of Fatigue app"` again.

- **“remote origin already exists”**  
  The folder is already linked. You **don’t** need to add the remote again. Just run `git push -u origin main`. If you need to change the URL:  
  `git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git`  
  then try `git push -u origin main` again.
