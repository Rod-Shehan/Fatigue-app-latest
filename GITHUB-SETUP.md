# Add this app to your GitHub

Run these commands in **Command Prompt** or **PowerShell** from the **Fatigue app** folder.

---

## If you already have a GitHub repo for this project

1. Open Command Prompt and go to the project:
   ```bat
   cd "c:\Users\r_she\Documents\Fatigue app"
   ```

2. Initialize Git (if not already):
   ```bat
   git init
   ```

3. Add your GitHub repo as remote (replace with your real repo URL):
   ```bat
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   Example: `git remote add origin https://github.com/r_shehan/fatigue-app.git`

4. Add all files, commit, and push:
   ```bat
   git add .
   git commit -m "Add Fatigue app (Next.js)"
   git branch -M main
   git push -u origin main
   ```

If the repo already has commits (e.g. a README), you may need to pull first:
   ```bat
   git pull origin main --allow-unrelated-histories
   git push -u origin main
   ```

---

## If you need to create a new repo on GitHub first

1. Go to [github.com/new](https://github.com/new).
2. Choose a name (e.g. `fatigue-app`), leave "Add a README" **unchecked**, create the repo.
3. Use the steps above with the new repo URL.

---

## Notes

- `.env` and `app-next/.env` are in `.gitignore` and will **not** be pushed (keeps secrets safe).
- If `git init` says "reinitialized", the folder is already a repo; just add the remote and push.
- If you get "remote origin already exists", use: `git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git`
