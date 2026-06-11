# Student Participation Tracker — Setup Guide

## Prerequisites

- Node.js 18+
- A Firebase project
- A Vercel account (for deployment)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Firebase Setup

### 2.1 Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project** → give it a name → Continue
3. Disable Google Analytics (optional) → Create project

### 2.2 Enable Authentication

1. In Firebase Console → **Authentication** → Get started
2. Sign-in method → Enable **Email/Password**

### 2.3 Create Firestore Database

1. **Firestore Database** → Create database
2. Choose **production mode** → Next
3. Select a location closest to your users → Done

### 2.4 Firestore Security Rules

Paste these rules in **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read their own profile; trainers can read all
    match /users/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer');
      allow write: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer');
    }

    // Classes — trainers only
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer';
    }

    // Participation — trainers write; students read own
    match /participation/{recordId} {
      allow read: if request.auth != null &&
        (resource.data.studentId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer');
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer';
    }
  }
}
```

### 2.5 Get Firebase Config

1. Project settings (gear icon) → General → Your apps → **Add app** → Web (`</>`)
2. Register app → copy the config object

---

## 3. Environment Variables

Create `.env` in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 4. Run Locally

```bash
npm run dev
```

Open http://localhost:5173

---

## 5. Seed Sample Data (optional)

Add a temporary button in any page:

```jsx
import { seedSampleData } from '../utils/seedData'

<button onClick={seedSampleData}>Seed Demo Data</button>
```

This creates:
- **Trainer**: `trainer@demo.com` / `demo123`
- **Students**: `ava@demo.com`, `ben@demo.com`, etc. / `demo123`
- 2 classes with 6 weeks of participation data

---

## 6. Build for Production

```bash
npm run build
```

---

## 7. Deploy on Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow prompts. When asked for env vars, add all `VITE_FIREBASE_*` variables.

### Option B — Vercel Dashboard

1. Push code to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Framework preset: **Vite**
4. Add environment variables (same as `.env`)
5. Deploy

---

## 8. Firestore Indexes

If you see "requires an index" errors, the Firebase console will show a direct link to create the required index. Typically needed for:

- `participation` collection: `studentId ASC, createdAt ASC`

---

## Project Structure

```
src/
├── components/
│   ├── charts/       # Recharts wrappers
│   ├── layout/       # Sidebar, Header, Layout
│   ├── shared/       # ProtectedRoute
│   └── ui/           # Card, Button, Modal, Badge, Input, StatCard
├── context/          # AuthContext, ThemeContext
├── firebase/         # config.js, auth.js, firestore.js
├── pages/
│   ├── auth/         # Login, Register
│   ├── trainer/      # Dashboard, Classes, Students, Participation, Reports
│   └── student/      # Dashboard
└── utils/            # calculations.js, exportUtils.js, constants.js, seedData.js
```

---

## Rubric Weights

| Criterion            | Weight |
|----------------------|--------|
| Engagement           | 25%    |
| Lab & Hands-on       | 30%    |
| Teamwork             | 20%    |
| Punctuality          | 15%    |
| Professionalism      | 10%    |

Formula: `((E×0.25 + L×0.30 + T×0.20 + P×0.15 + Pr×0.10) / 4) × 100`
