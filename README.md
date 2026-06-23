# StudyHub — Offline-First Study Platform

An Instagram-style study platform where users share **only external links**
(YouTube videos, Google Drive PDFs/PPTs) — no files are ever uploaded or
stored. Works fully offline after first load, using `localStorage` as the
database.

---

## 1. Architecture

```
/studyhub
 ├── index.html          → app shell (sidebar/bottom nav, view root, modal/toast hosts)
 ├── css/style.css        → dark theme + neon glassmorphism design system
 ├── js/
 │    ├── storage.js       → tiny localStorage "database" (DB.* helpers)
 │    ├── linkUtils.js     → detects YouTube/Drive links, builds embeds
 │    ├── auth.js          → register/login/session/XP (SHA-256 hashed pw)
 │    ├── authView.js      → login/register screen markup
 │    ├── seed.js          → first-run demo data
 │    ├── feed.js          → post feed, composer, like/comment/save/share, paid unlock
 │    ├── filter.js        → multi-criteria instant filter bar
 │    ├── classroom.js     → create/join classroom, announcements, members
 │    ├── quiz.js          → MCQ quiz builder + offline attempt + instant scoring
 │    ├── chat.js          → per-classroom offline group chat
 │    ├── profile.js       → stats, XP/level bar, saved/own posts
 │    ├── modal.js         → generic modal + confirm dialog
 │    ├── monetization.js  → simulated ad slots + premium upsell
 │    ├── firebase-sync.js → OPTIONAL cloud layer, disabled by default
 │    ├── router.js        → hash-based SPA router
 │    └── app.js           → bootstrap: seeds data, builds nav, starts router
 ├── electron/             → desktop (EXE) wrapper
 ├── android/              → Capacitor config for APK wrapper
 └── data/                 → (reserved — no files are stored here; links only)
```

**Data model** (all arrays in `localStorage`, see `DB_KEYS` in `storage.js`):
`users`, `posts`, `comments`, `classrooms`, `classroomMembers`, `quizzes`,
`quizAttempts`, `chats`, `unlocks` (paid-content unlock receipts).

**Why this stays "offline-first":** every read/write goes through `DB.*`,
which only touches `localStorage`. The only network calls the app ever makes
are the `<iframe>` embeds for YouTube/Drive previews — if those are
unreachable (offline), the rest of the app (feed, classrooms, quizzes, chat,
profile, XP) keeps working from cached local data.

---

## 2. Run locally

No build step needed — it's plain HTML/CSS/JS.

```bash
cd studyhub
python3 -m http.server 8080
# then open http://localhost:8080
```

(Opening `index.html` directly via `file://` also works in most browsers,
but a local server avoids occasional CORS quirks.)

**Demo logins** (seeded automatically on first run):
- `teacher@demo.com` / `demo1234`
- `student@demo.com` / `demo1234`

---

## 3. Deploy on GitHub Pages

```bash
cd studyhub
git init
git add .
git commit -m "StudyHub initial commit"
git branch -M main
git remote add origin https://github.com/<you>/studyhub.git
git push -u origin main
```

Then in GitHub: **Settings → Pages → Source: `main` branch, `/ (root)`** →
Save. Your app will be live at `https://<you>.github.io/studyhub/`.

---

## 4. Convert to EXE (Electron)

```bash
cd studyhub/electron
mkdir app
cp -r ../index.html ../css ../js app/      # copy the web app in
npm install
npm start          # test the desktop window
npm run build       # produces a Windows installer in /electron/dist
```

> `electron-builder` cross-builds Windows targets from Mac/Linux too, but for
> a signed/clean EXE it's easiest to run `npm run build` on Windows directly.

---

## 5. Convert to APK (Capacitor)

```bash
cd studyhub
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
mkdir www && cp -r index.html css js www/
npx cap init StudyHub com.studyhub.app --web-dir=www
npx cap add android
npx cap copy android
npx cap open android      # opens Android Studio -> Build > Build APK
```

The provided `android/capacitor.config.json` already has the matching
`appId`/background color if you want to copy it over the generated one.

---

## 6. Roadmap — the four "next" upgrades

### Firebase backend (real users + cloud)
`js/firebase-sync.js` is a ready-to-enable starter, **off by default** so the
app stays true to the offline-first brief:
1. Create a project at console.firebase.google.com, enable **Authentication
   (Email/Password)** and **Firestore**.
2. Paste your config into `firebaseConfig` in `firebase-sync.js`.
3. Add to `index.html` *before* `firebase-sync.js`:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
   ```
4. Set `FIREBASE_ENABLED = true`.
5. Call `CloudSync.syncPostUp(post)` right after `DB.insert(DB_KEYS.posts, post)`
   in `feed.js`, and `CloudSync.pullPostsDown()` on login — both are already
   written, just wire the two call sites.

### Premium UI level
Already added in this pass: card rise-in animation, button shine sweep on
hover, hover-lift on classroom/quiz cards, glowing active nav icon, premium
badge. For a further pass: page-transition slide, skeleton loaders while the
embed iframe loads, and a settings page for theme accent color.

### Real payment integration
The "Unlock" / "Go Premium" buttons currently simulate payment by deducting
XP-as-coins locally (`Modal.confirm` -> `DB.update`). To go live:
1. Pick a gateway — **Razorpay** (India-friendly) or **Stripe**.
2. Create a tiny serverless function (Vercel/Netlify/Cloud Functions) that
   creates an order and verifies the signature server-side — **never** trust
   client-side "payment success" for real money.
3. Replace the body of `Feed.unlockPost` / `Monetization.wireUpgradeBanner`'s
   confirm callback with: create order -> open gateway checkout -> on
   verified webhook, write the unlock/premium record (ideally server-side,
   via Firestore from step above, not localStorage, so it survives device
   loss).

### Monetization (ads + premium) — added in this pass
- `monetization.js` interleaves a simulated **ad card** every 4 feed posts
  for free users only (`Monetization.adSlotHTML`).
- A **"Go Premium" banner** appears on Feed + Profile for non-premium users;
  upgrading removes ads, shows a profile badge, and is wired through the same
  coin-based simulated payment as paid-post unlocks.
- To use a **real ad network**: swap `Monetization.adSlotHTML()`'s returned
  markup for the ad network's tag (e.g. AdSense `<ins class="adsbygoogle">`
  or AdMob's WebView bridge for the Capacitor build), behind the same
  "only show if `!isPremium(user)`" check.

---

## 7. Notes & limits (be upfront with users)

- This demo's auth is for prototyping — password hashing is client-side
  SHA-256, fine for a local demo, **not** a substitute for a real backend.
- "Coins" = XP, used as a stand-in currency. No real money moves until you
  wire a payment gateway per the roadmap above.
- Drive embeds require the file/folder to be shared as "Anyone with the
  link" — private Drive links will fail to preview (the app still stores
  the link and shows an "Open in Drive" fallback button).
