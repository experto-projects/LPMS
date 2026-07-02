# Lesson Plan Monitoring System (LPMS) - Phase 1 MVP

The **Lesson Plan Monitoring System (LPMS)** is a professional, high-performance full-stack web application designed to monitor teachers' lesson plan submissions using Google Drive and Google Docs.

Teachers continue using Google Docs as they normally do—the system never edits documents or stores content. Instead, it scans the configured Google Drive folder, lists Google Documents (each titled with a teacher's name), inspects the document tabs (each representing a lesson date), and dynamically compiles an elegant submission tracking grid.

---

## 🎨 System Architecture & Design

Following clean code and software architecture principles, the LPMS codebase is highly modular, extensible, and scalable:

```
├── lpms.db                   # SQLite database (SQLite file)
├── server.ts                 # Master Express backend entry point
├── package.json              # Dependency and lifecycle scripts
├── src/
│   ├── backend/              # Clean Backend Architecture
│   │   ├── controllers/      # Controls REST request/response flow (settings, scan)
│   │   ├── database/         # Database layer & swaps (SQLite with IDatabase interface)
│   │   ├── google/           # Isolates pure Google service integration API handlers
│   │   ├── routes/           # REST endpoints mapping
│   │   ├── utils/            # Shared utilities (ID regex parser, clean dates sorter)
│   ├── components/           # Reusable React components (Grid, Panels, Login, Alerter)
│   ├── services/             # Frontend services connecting to Firebase and REST APIs
│   ├── types.ts              # Global centralized types schema definitions
│   ├── App.tsx               # Primary React entry controller
│   ├── main.tsx              # React mounting root
│   └── index.css             # Tailwind global style configuration
```

### Key Separation of Concerns
1. **Google Service Isolation**: All Google API logic resides strictly inside the Google service layer. The frontend never communicates directly with Google.
2. **Database Abstraction Layer**: The application utilizes a clean `IDatabase` abstraction interface. SQLite is configured for Phase 1, but it is ready to be swapped with PostgreSQL (or any other relational database) without changing any controller or route files.
3. **In-Memory Security**: Google OAuth access tokens are managed strictly in-memory during active authenticated client sessions. They are never written to unsecure browser `localStorage`.

---

## ⚙️ Google Drive & Docs Structure

For the LPMS to scan and monitor files successfully, the administrator should establish the following simple structure in Google Drive:

1. **The Core Folder**: Create exactly one Google Drive folder.
2. **Teacher Documents**: Inside that folder, create one standard **Google Document** per teacher.
   - **Document Title**: Set the document name to the teacher's full name (e.g., *Juan Dela Cruz*).
3. **Lesson Plan Tabs (Dates)**: Inside each Google Doc, use the native **Google Doc Tabs** feature to create a tab for each lesson.
   - **Tab Title**: Set the tab title to the execution date (e.g., *July 1, 2026*, *July 8, 2026*). LPMS automatically parses common dates, aggregates all unique dates as dynamic grid columns, and marks a green check (`✓`) for matches!

---

## 🚀 Running the Application

### 1. Prerequisites & OAuth
LPMS integrates Google Workspace APIs. When logging in, the system uses Firebase Auth Google Sign-in to prompt teachers or administrators to grant permission for:
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/documents.readonly`

Ensure your environment variables in `.env` match `.env.example`.

### 2. Available Commands

- **Start Development Server**: Runs both Express backend and Vite frontend dynamically on the unified port 3000.
  ```bash
  npm run dev
  ```
- **Build for Production**: Compiles Vite assets and bundles the backend server into a single standalone `dist/server.cjs` file with `esbuild`.
  ```bash
  npm run build
  ```
- **Start Production Server**: Launches the production compiled CJS server.
  ```bash
  npm run start
  ```

---

## 🛡️ Error Handling Details

LPMS includes robust error handling to guide users smoothly:
- **Invalid URL**: Directs the user to verify the URL pattern or paste a folder ID.
- **Access Denied**: Prompts authentication updates if permissions are missing or revoked.
- **Empty Folder**: Displays a beautiful empty state when no files exist inside the designated folder.
- **Tab Read Failure**: Displays a localized alert inside the grid for specific teacher files while preserving the overall matrix render.
