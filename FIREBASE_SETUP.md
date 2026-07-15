# 🌾 PoleLigth Firebase Integration Guide

## Overview

This guide walks you through migrating PoleLigth from local JSON file storage to **Firebase Realtime Database** for persistent, scalable cloud storage.

## Why Firebase?

✅ **Scalability** — Handle thousands of visions without disk limits  
✅ **Real-time sync** — Automatic data replication across instances  
✅ **Backup & recovery** — Automatic daily backups  
✅ **Security** — Built-in authentication and rules  
✅ **Free tier** — 100GB storage, 100 concurrent connections  
✅ **Easy deployment** — Works seamlessly with Cloud Run, Vercel, etc.

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Project name: `poligth` (or your choice)
4. Accept the default settings and create
5. Wait for provisioning to complete

---

## Step 2: Enable Realtime Database

1. In Firebase Console, go to **Build** → **Realtime Database**
2. Click **"Create Database"**
3. Choose location: closest to your users (e.g., `europe-west1`)
4. Start in **Test mode** (we'll secure it later)
5. Click **"Enable"**

Your database URL will appear: `https://poligth-abc123.firebaseio.com`

---

## Step 3: Generate Service Account Key

1. In Firebase Console, go to **⚙️ Project Settings** (top-left)
2. Click **Service Accounts** tab
3. Click **"Generate New Private Key"**
4. A JSON file downloads automatically
5. Move it to your project root:
   ```bash
   mv ~/Downloads/poligth-abc123-firebase-adminsdk-xyz.json ./firebase-service-account.json
   ```

**⚠️ Security:** Add to `.gitignore` (never commit this file):
```bash
echo "firebase-service-account.json" >> .gitignore
```

---

## Step 4: Configure Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Firebase details:
```env
GEMINI_API_KEY=your_gemini_key_here
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_DATABASE_URL=https://poligth-abc123.firebaseio.com
NODE_ENV=development
```

---

## Step 5: Install Dependencies

```bash
npm install
```

This adds `firebase-admin` SDK to your project.

---

## Step 6: Migrate Existing Data (Optional)

If you have existing visions in `data/visions.json`, you can migrate them:

```bash
# Copy your old visions to a backup
cp data/visions.json data/visions.backup.json

# Create a migration script (see below)
```

**Migration Script** (`scripts/migrate-to-firebase.ts`):
```typescript
import firebaseService, { initializeFirebase } from '../src/services/firebaseService';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    initializeFirebase();
    
    const visionsPath = path.join(process.cwd(), 'data', 'visions.json');
    const visions = JSON.parse(fs.readFileSync(visionsPath, 'utf-8'));
    
    console.log(`Migrating ${visions.length} visions to Firebase...`);
    await firebaseService.batchSaveVisions(visions);
    
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

Run:
```bash
npx tsx scripts/migrate-to-firebase.ts
```

---

## Step 7: Run the Application

```bash
# Development mode
npm run dev

# The app will start at http://localhost:3000
```

Check the console output:
```
✅ Firebase Realtime Database initialized successfully
🌾 PoleLigth server running at http://0.0.0.0:3000
```

---

## Step 8: Secure Your Database

By default, Firebase runs in **Test mode** (anyone can read/write). Let's secure it.

In Firebase Console → **Realtime Database** → **Rules**, replace with:

```json
{
  "rules": {
    "visions": {
      ".read": true,
      ".write": true,
      "$visionsId": {
        ".validate": "newData.hasChildren(['id', 'text', 'whisper', 'x', 'y', 'color', 'size', 'createdAt'])"
      }
    },
    "rootSystem": {
      ".read": true,
      ".write": true,
      "$runeId": {
        ".validate": "newData.hasChildren(['id', 'text', 'decayedAt'])"
      }
    }
  }
}
```

Click **"Publish"** to apply.

---

## Firebase Database Structure

Your Realtime Database will look like:

```
poligth-abc123 (root)
├── visions/
│   ├── vision-abc123/
│   │   ├── id: "vision-abc123"
│   │   ├── text: "Мне всегда казалось..."
│   │   ├── whisper: "Они смотрят вниз..."
│   │   ├── x: 25
│   │   ├── y: 35
│   │   ├── color: "#f59e0b"
│   │   ├── size: 15
│   │   ├── createdAt: "2026-07-13T12:00:00Z"
│   │   ├── modelUsed: "gemini-3.5-flash"
│   │   └── messages: [...]
│   └── vision-def456/ ...
└── rootSystem/
    ├── fossil-1/
    │   ├── id: "fossil-1"
    │   ├── text: "Когда-то здесь бушевал океан..."
    │   ├── decayedAt: "2026-07-13T10:00:00Z"
    │   ├── runeShape: "◈"
    │   └── runeX: 45
    └── fossil-2/ ...
```

---

## API Changes

All API endpoints now use Firebase instead of local JSON files:

| Endpoint | Method | Changes |
|----------|--------|---------|
| `/api/visions` | GET | Returns from Firebase |
| `/api/visions` | POST | Saves to Firebase |
| `/api/visions/:id/chat` | POST | Updates messages in Firebase |
| `/api/visions/:id/decay` | POST | Moves vision to rootSystem in Firebase |
| `/api/root_system` | GET | Returns from Firebase |

**No frontend changes needed** — all API contracts remain the same!

---

## Firebase Service Methods

Available in `src/services/firebaseService.ts`:

```typescript
// Get all visions
const visions = await firebaseService.getVisions();

// Get a single vision
const vision = await firebaseService.getVision(id);

// Save a vision
await firebaseService.saveVision(vision);

// Update specific fields
await firebaseService.updateVision(id, { whisper: "new whisper" });

// Delete a vision
await firebaseService.deleteVision(id);

// Get root system (decayed visions)
const runes = await firebaseService.getRootSystem();

// Save a rune
await firebaseService.saveRootRune(rune);

// Batch operations
await firebaseService.batchSaveVisions(visions);

// Real-time listeners
const unsubscribe = firebaseService.onVisionsChange((visions) => {
  console.log('Visions updated:', visions);
});
unsubscribe(); // Stop listening
```

---

## Troubleshooting

### "Firebase not initialized"
- Check `FIREBASE_SERVICE_ACCOUNT_PATH` points to the correct file
- Verify `firebase-service-account.json` exists in project root

### "Permission denied" errors
- Check Firebase Rules allow read/write operations
- Verify service account has proper permissions in Firebase Console

### "Cannot find module 'firebase-admin'"
- Run `npm install` to install dependencies

### "FIREBASE_DATABASE_URL not set"
- Copy `.env.example` to `.env.local`
- Fill in your actual Firebase database URL

### Data not persisting
- Check Firebase Realtime Database is enabled in Console
- Look at Firebase Console → Logs for errors
- Verify the API responses include data

---

## Deployment

### Deploy to Vercel

1. Add environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_SERVICE_ACCOUNT_PATH` (or upload the JSON)

2. Deploy:
   ```bash
   vercel deploy
   ```

### Deploy to Google Cloud Run

```bash
# Build Docker image
gcloud builds submit --tag gcr.io/PROJECT-ID/poligth

# Deploy
gcloud run deploy poligth \
  --image gcr.io/PROJECT-ID/poligth \
  --platform managed \
  --region europe-west1 \
  --set-env-vars FIREBASE_DATABASE_URL=https://poligth-abc123.firebaseio.com,GEMINI_API_KEY=your_key
```

---

## Monitoring & Analytics

In Firebase Console:

- **Realtime Database** → **Usage** — see read/write operations
- **Rules Playground** — test your security rules
- **Backups** — automatic daily backups (retention: 35 days)

---

## Next Steps

✅ Enable Firebase Authentication (optional)  
✅ Add Firestore for complex queries  
✅ Set up Cloud Functions for scheduled tasks  
✅ Enable Firebase Analytics for user insights

---

## Questions?

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
