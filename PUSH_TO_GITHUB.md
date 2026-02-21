# Push this app to GitHub

Follow these steps to put your Fatigue app on GitHub.

---

## Quick: Link to an existing GitHub repo

If you **already created** a repo on GitHub and only need to link and push:

```powershell
cd "c:\Users\r_she\Documents\Fatigue app"
git init
git add .
git commit -m "Initial commit: Driver Fatigue Log app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Replace **YOUR_USERNAME** with your GitHub username and **YOUR_REPO** with the repository name.

---

## Full steps

## 1. Install Git (if needed)

- Download: https://git-scm.com/download/win  
- Run the installer and restart your terminal/Cursor after.

## 2. Open a terminal in this folder

In Cursor or PowerShell:

```powershell
cd "c:\Users\r_she\Documents\Fatigue app"
```

## 3. Initialize Git and make the first commit

Run these commands one by one:

```powershell
git init
git add .
git commit -m "Initial commit: Driver Fatigue Log app"
```

## 4. Create a new repository on GitHub

1. Go to **https://github.com/new**
2. Sign in if needed.
3. Set **Repository name** (e.g. `fatigue-app` or `driver-fatigue-log`).
4. Choose **Public**.
5. **Do not** check "Add a README" or "Add .gitignore" (you already have files).
6. Click **Create repository**.

## 5. Connect and push

GitHub will show commands; use these (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Example if your username is `jane` and repo is `fatigue-app`:

```powershell
git remote add origin https://github.com/jane/fatigue-app.git
git branch -M main
git push -u origin main
```

You may be asked to sign in (browser or GitHub CLI).

---

**Note:** `.env` and `app-next/.env` are in `.gitignore`, so secrets (e.g. `NEXTAUTH_SECRET`, `NEXTAUTH_CREDENTIALS_PASSWORD`) are not pushed. Keep a backup of your `.env` locally.
