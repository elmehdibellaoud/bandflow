# BandFlow

BandFlow is a full-stack band management platform built for musicians and band managers. It handles everything a working band needs to stay organized: managing members and roles, building a song repertoire, scheduling performances, and planning rehearsals. The project includes a web application and a cross-platform mobile application.

---

## What It Does

### Band Workspaces
Each band gets its own isolated workspace. A manager creates a band and receives a unique invite code (e.g. `ABCD-1234`) that they share with their musicians. Members join by entering the code and selecting their role from a list the manager defines. Data is strictly scoped per band, so nothing leaks between different band spaces.

### Roles and Permissions
Roles are dynamic, not hardcoded. When a band is created, it is seeded with standard musical roles (Vocalist, Guitarist, Bassist, Drummer, Keyboardist). Managers can add or remove custom roles at any time. The system distinguishes between managers (full write access) and members (read-only access).

### Song Bank
A central repository for the band's repertoire. Managers can add tracks with a title, key, tempo, and a Spotify or YouTube reference link. Members can browse and search the library. No other link formats are accepted.

### Performances
Managers schedule gigs with a title, venue, date, and a setlist pulled from the song bank. Each song on a setlist can be assigned specific performing members, giving a clear picture of who plays what on the night.

### Rehearsals
Rehearsals can be standalone or linked to an upcoming performance. When linked, the rehearsal inherits the performance's setlist. The manager then marks specific songs as focus items for that session.

---

## Tech Stack

### Backend
- Node.js with Express
- MySQL database
- JWT authentication
- REST API with role-based access control

### Web Frontend
- React 19 with Vite
- Tailwind CSS v4
- React Router v7
- Lucide React for icons

### Mobile App
- React Native with Expo (SDK 57)
- AsyncStorage for local session persistence
- Lucide React Native for icons
- Compatible with Android and iOS

---

## Project Structure

```
BandFlow/
├── src/                  # Express backend
│   ├── config/           # Database connection
│   └── routes/           # auth, bands, songs, performances, rehearsals
├── frontend/             # React web app
│   └── src/
│       ├── components/   # Modals, views, date picker
│       ├── context/      # BandContext (auth + band state)
│       └── pages/        # Login, Register, Launchpad, Dashboard
├── mobile/               # Expo React Native app
│   └── src/
│       ├── context/      # BandContext (AsyncStorage-backed)
│       ├── screens/      # Login, Register, Launchpad, Home, Songs, Schedule
│       └── config.js     # API base URL per platform
└── schema.sql            # Full database schema
```

---

## Getting Started

### Prerequisites
- Node.js 18 or later
- MySQL 8 or later
- Expo CLI (for mobile development)

### 1. Database Setup

Create a MySQL database and run the schema:

```bash
mysql -u root -p < schema.sql
```

### 2. Backend

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=bandflow
JWT_SECRET=your_secret_key
PORT=5000
```

Install dependencies and start the server:

```bash
npm install
npm start
```

The API will be available at `http://localhost:5000`.

### 3. Web Frontend

```bash
cd frontend
npm install
npm run dev
```

The web app will be available at `http://localhost:5173`.

### 4. Mobile App

```bash
cd mobile
npm install
npm start
```

Open the Expo Go app on your phone and scan the QR code, or press `a` for Android emulator / `i` for iOS simulator.

**Note:** By default the mobile app connects to `10.0.2.2:5000` on Android emulators and `localhost:5000` on iOS simulators. If running on a physical device, update the `API_BASE_URL` in `mobile/src/config.js` to your machine's local IP address.

---

## API Overview

All routes except `/api/auth` require a `Bearer` token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive a JWT |
| POST | `/api/bands/create` | Create a new band |
| POST | `/api/bands/join` | Join a band with an invite code |
| GET | `/api/bands/my-bands` | List bands the user belongs to |
| GET | `/api/bands/verify/:code` | Verify a band invite code |
| GET/POST | `/api/bands/:id/roles` | List or create custom roles |
| DELETE | `/api/bands/:id/roles/:roleId` | Delete a custom role |
| GET/POST | `/api/songs` | List or add songs |
| PUT/DELETE | `/api/songs/:id` | Update or delete a song |
| GET/POST | `/api/performances` | List or schedule performances |
| PUT/DELETE | `/api/performances/:id` | Update or delete a performance |
| GET/POST | `/api/rehearsals` | List or schedule rehearsals |
| PUT/DELETE | `/api/rehearsals/:id` | Update or delete a rehearsal |

---

## Design

The interface uses a high-contrast dark theme throughout:

- Background: `#080808`
- Cards and containers: `#141414`
- Borders: `#262626`
- Primary text: `#F4F4F5`
- Accent: `#FFD700` (used for active states, buttons, and highlights only)

The same color system is applied consistently across both the web and mobile interfaces.
