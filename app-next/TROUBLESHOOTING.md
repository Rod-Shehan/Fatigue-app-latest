# Why the app might not open

## 1. "npm" or "next" is not recognized

**Cause:** Node.js is not installed, or it's not in your PATH when you run the batch file.

**Fix:**
- Install Node.js from https://nodejs.org (choose **LTS**).
- During setup, leave **"Add to PATH"** checked.
- **Restart your PC** (or at least close and reopen Cursor/File Explorer).
- Double-click **Start App (Next).bat** again.

---

## 2. Browser opens but says "This site can't be reached" or "Connection refused"

**Cause:** The Next.js server is not running yet, or it failed to start.

**Fix:**
- When you run **Start App (Next).bat**, a **second window** opens titled **"Next.js - Fatigue App"**. **Leave that window open.**
- In that window, wait until you see something like: **"Ready in 3s"** or **"compiled"**.
- If you see **red error text** in that window, read it (e.g. "Port 3000 is in use", "Module not found").
- Then in your browser go to **http://localhost:3000** or press **F5** to refresh.

---

## 3. Prisma errors (e.g. "datasource url" or "schema validation")

**Cause:** A different (newer) version of Prisma is being used than the one in the project.

**Fix:**
- Open a command prompt in the **app-next** folder:
  - `cd "c:\Users\r_she\Documents\Fatigue app\app-next"`
- Run: `npm install` then `npx prisma generate` then `npx prisma db push`
- If it still fails, run: `npm install prisma@6.9.0 --save-dev` then try again.

---

## 4. Login page appears but sign-in does nothing / "Invalid email or password"

**Cause:** No password is set for the app.

**Fix:**
- In the **app-next** folder, open the **.env** file in Notepad.
- Add or edit: **NEXTAUTH_CREDENTIALS_PASSWORD=** and type a password after the `=`, e.g.  
  `NEXTAUTH_CREDENTIALS_PASSWORD=mysecret`
- Add: **NEXTAUTH_SECRET=** and type any long random string, e.g.  
  `NEXTAUTH_SECRET=something-random-12345`
- Save the file, **close the "Next.js - Fatigue App" window**, then run **Start App (Next).bat** again.
- Sign in with **any email** (e.g. you@example.com) and the password you set.

---

## 5. Port 3000 already in use

**Cause:** Another program (or an old Next.js run) is using port 3000.

**Fix:**
- Close any other **"Next.js"** or **"Node"** command windows.
- Or use a different port: in **app-next** run:  
  `set PORT=3001 && npm run dev`  
  Then open **http://localhost:3001** in your browser.
