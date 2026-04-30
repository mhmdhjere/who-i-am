## Who Am I? (16-player guessing game)

Simple full-stack MVP:

- Next.js (App Router) frontend
- Firebase Auth (anonymous) + Firestore backend
- Admin panel at `/admin` (secret-protected) to end/reset game

### Features

- **Registration**: up to exactly 16 unique names (auto-closes at 16)
- **Questions**: all players answer the same questions
- **Guessing**: each player sees 15 answer-sets (not their own), stable order for everyone
  - each name can be selected only once (duplicates disabled)
  - progress indicator `x / 15`
- **Waiting**: after submitting guesses
- **Results**: admin ends game, scores computed (0–15), leaderboard shown

### Data model (Firestore)

- `games/current`
  - `phase`: `"registration" | "questions" | "guessing" | "waiting" | "results"`
  - `questions`: `string[]`
  - `registeredCount`: number
  - `registeredNamesLower`: `string[]`
  - `playerOrder`: `string[]` (frozen when guessing starts)
- `games/current/players/{uid}`
  - `name`, `answers[]`, `guesses{ ownerId -> guessedId }`, `score`

## Run locally

### 1) Create Firebase project

- Enable **Authentication → Sign-in method → Anonymous**
- Create **Firestore Database** (test mode is fine for local MVP)
- Add a **Web App** and copy the config values
- Create a **Service Account** key JSON (for admin scoring API)

### 2) Configure env vars

Copy `.env.local.example` to `.env.local` and fill it in.

Recommended for the admin service account:
- Set `FIREBASE_SERVICE_ACCOUNT_PATH` to the downloaded JSON file path, **or**
- Set `FIREBASE_SERVICE_ACCOUNT_B64` to the base64 of the JSON contents.

### 3) Start the dev server

```bash
npm run dev
```

Open `http://localhost:3000`

### Admin

- Visit `/admin`
- Paste the same value you set in `ADMIN_SECRET`
- Use **End Game** to compute scores and switch to results
- Use **Reset game** to clear all players and start over

## Notes / MVP constraints

- Registration is one-time per device/session (renames are disabled to keep uniqueness simple).
- Phase transitions are mostly automatic:
  - registration → questions when 16 register
  - questions → guessing when all 16 answered
  - guessing → waiting when all 16 submitted guesses
- Only “End Game” and “Reset” require server-side admin access.

## Deploy live on Firebase Hosting (App Hosting)

This project is a Next.js app with API routes, so the recommended Firebase way is **App Hosting**.

### Option A (recommended): Deploy via Firebase Console (GitHub)

- In Firebase Console: **Hosting & Serverless → App Hosting → Get started**
- Connect your GitHub repo and select the repo/branch
- Root directory: the `who-am-i` folder (the one containing `package.json`)
- Set required env vars/secrets:
  - **Env (public)**: `NEXT_PUBLIC_FIREBASE_*`
  - **Secrets**: `ADMIN_SECRET`, `FIREBASE_SERVICE_ACCOUNT_B64`

### Option B: Deploy via Firebase CLI (local deploy)

1) Login + select project:

```bash
firebase login
firebase use who-am-i-f7237
```

2) Deploy:

```bash
firebase deploy
```

### Production service account

For App Hosting, prefer `FIREBASE_SERVICE_ACCOUNT_B64` (base64 of your service account JSON).
Do **not** use `FIREBASE_SERVICE_ACCOUNT_PATH` in production.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# who-i-am
