# Webgazer Readability Study - System Overview

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technical Stack](#technical-stack)
4. [System Components](#system-components)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [API Architecture](#api-architecture)
8. [Frontend Architecture](#frontend-architecture)
9. [Backend Architecture](#backend-architecture)
10. [Font Comparison System](#font-comparison-system)
11. [Eye-Tracking Integration](#eye-tracking-integration)
12. [State Management](#state-management)
13. [User Journey](#user-journey)
14. [Data Collection](#data-collection)
15. [Deployment & Operations](#deployment--operations)

---

## Executive Summary

The Webgazer Readability Study is a web-based research platform that combines eye-tracking technology with systematic font comparison methodology to evaluate font readability preferences. The system presents users with reading passages in different fonts, collects eye-tracking data during reading, and uses a structured pairwise comparison approach to determine font preferences through repeated evaluations.

### Key Features

- **Systematic Font Comparison**: 6 fonts evaluated through structured pairwise comparisons to determine user preferences
- **Eye-Tracking Integration**: Real-time gaze data collection using WebGazer.js to measure reading behavior
- **Multi-Passage Reading**: Users read multiple passages, each shown 4 times with different font pair comparisons
- **Comprehension Validation**: Quiz questions validate that users actually read and understood the content
- **Progressive Data Collection**: Gaze points, reading times, and preferences collected throughout the study

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   SvelteKit  │  │  WebGazer.js │  │  Components  │      │
│  │   (Reactive) │  │  (Eye Track) │  │  (UI/State)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                    │            │
│         └──────────────────┼──────────────────┘            │
│                             │                                │
│                    ┌────────▼────────┐                      │
│                    │   API Client    │                      │
│                    │   (api.ts)      │                      │
│                    └────────┬────────┘                      │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTP/REST
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    ┌───────▼────────┐                      │
│                    │  Echo Router    │                      │
│                    │  (Go Backend)  │                      │
│                    └───────┬────────┘                      │
│                            │                                │
│                    ┌───────▼────────┐                      │
│                    │  GORM ORM      │                      │
│                    └───────┬────────┘                      │
│                            │                                │
│                    ┌───────▼────────┐                      │
│                    │  SQLite DB     │                      │
│                    │  (readability) │                      │
│                    └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Patterns

- **Client-Server Architecture**: Frontend (SvelteKit) communicates with backend (Go/Echo) via REST API
- **State Management**: Hybrid approach using Svelte stores and sessionStorage for persistence
- **Data Collection**: Event-driven with batched submissions for performance
- **Font Comparison Logic**: Pure functional logic in frontend, results stored in backend

---

## Technical Stack

### Frontend

- **Framework**: SvelteKit 2.x (Svelte 5)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.x
- **Eye-Tracking**: WebGazer.js 3.4.0
- **State Management**: Svelte stores + sessionStorage

### Backend

- **Language**: Go 1.21+
- **Web Framework**: Echo v4
- **ORM**: GORM v1.25
- **Database**: SQLite 3
- **Database Driver**: gorm.io/driver/sqlite

### Development Tools

- **Package Manager**: npm (frontend), Go modules (backend)
- **Linting**: ESLint, Prettier (frontend)
- **Type Checking**: TypeScript, svelte-check

---

## System Components

### Frontend Components

#### 1. **Routes** (`src/routes/`)

- **`+page.svelte`**: Landing/home page
- **`calibrate/+page.svelte`**: Eye-tracking calibration interface
- **`accuracy/+page.svelte`**: Accuracy measurement after calibration
- **`read/+page.svelte`**: Main reading interface with font comparisons
- **`quiz/+page.svelte`**: Comprehension quiz interface

#### 2. **Core Libraries** (`src/lib/`)

- **`api.ts`**: API client for backend communication
- **`fonts.ts`**: Font comparison logic and font management
- **`stores/webgazer.ts`**: WebGazer state management
- **`calibrationPoints.ts`**: Calibration point definitions

#### 3. **UI Components** (`src/lib/components/`)

- **`calibration/`**: Calibration grid and progress bar
- **`reading/`**: Reading panel with side-by-side font display
- **`quiz/`**: Quiz question and results components
- **`accuracy/`**: Accuracy measurement components
- **`shared/`**: Modal, WebGazerManager (shared utilities)

### Backend Components

#### 1. **Main Application** (`main.go`)

- HTTP server setup with Echo framework
- Route registration and middleware configuration
- CORS configuration for frontend communication
- Database initialization and migration

#### 2. **Data Models** (`models.go`)

- GORM model definitions
- Database relationships and constraints
- Model hooks (e.g., session ID generation)

#### 3. **API Handlers** (`main.go`)

- Participant management
- Session management
- Data collection endpoints (gaze, reading events, quiz responses)
- Study content endpoints (study text, passages, quiz questions)
- Admin endpoints for content management

#### 4. **Utilities** (`utils.go`)

- Session ID generation
- Helper functions

---

## Data Flow

### 1. Initialization Flow

```
User visits site
    ↓
Frontend creates/retrieves participant (sessionStorage)
    ↓
Frontend creates study session → POST /api/session
    ↓
Backend creates session record → Returns session_id
    ↓
Frontend stores session_id in sessionStorage
    ↓
User proceeds to calibration
```

### 2. Calibration Flow

```
User clicks calibration points
    ↓
Frontend collects click coordinates
    ↓
POST /api/calibration (for each point)
    ↓
Backend stores calibration data
    ↓
User completes accuracy measurement
    ↓
POST /api/accuracy
    ↓
Backend stores accuracy measurement
```

### 3. Reading Session Flow

```
Frontend fetches study text → GET /api/study-text
    ↓
Backend returns passages array
    ↓
Frontend initializes font comparison state
    ↓
For each passage (4 screens):
    ├─ Display current font pair comparison (2 fonts)
    ├─ Start gaze collection (every 100ms)
    ├─ User reads both panels
    ├─ Track reading times per panel
    ├─ User selects preferred font
    ├─ Record comparison result
    ├─ Generate next font pair comparison
    └─ Submit gaze points in batches (POST /api/gaze-point)
    ↓
After 4 screens → Show quiz transition modal
```

### 4. Quiz Flow

```
Frontend fetches quiz questions → GET /api/quiz-questions
    ↓
User answers questions
    ↓
On submit:
    ├─ POST /api/quiz-response (for each question)
    ├─ Backend calculates correctness
    └─ Backend stores quiz response
    ↓
If more passages → Return to reading
If all passages complete → Study complete
```

### 5. Gaze Data Collection Flow

```
WebGazer provides gaze coordinates (x, y)
    ↓
Frontend collects every 100ms
    ↓
Buffer in memory (up to 10 points)
    ↓
When buffer full → POST /api/gaze-point (batch)
    ↓
Backend stores each gaze point
    ↓
Repeat throughout reading session
```

---

## Database Schema

### Core Entities

#### **Participant**

- `id` (PK): Unique participant identifier
- `source`: Source of participant (e.g., "mturk", "prolific", "web")
- `created_at`: Timestamp
- **Relationships**: Has many StudySessions

#### **StudySession**

- `id` (PK): Database ID
- `session_id` (Unique): Client-generated session identifier
- `participant_id` (FK): Reference to Participant
- `created_at`: Timestamp
- Legacy fields: `calibration_points`, `font_left`, `font_right`, `time_left_ms`, etc.
- **Relationships**:
  - Belongs to Participant
  - Has many CalibrationData, AccuracyMeasurements, QuizResponses, GazePoints, ReadingEvents

#### **CalibrationData**

- `id` (PK)
- `session_id` (FK): Reference to StudySession
- `point_index`: Which calibration point (0-based)
- `click_number`: Which click on this point (1-5)
- `x`, `y`: Coordinates
- `timestamp`: When calibration occurred

#### **AccuracyMeasurement**

- `id` (PK)
- `session_id` (FK)
- `accuracy`: Percentage accuracy
- `duration`: Measurement duration (ms)
- `passed`: Boolean (passed threshold)
- `timestamp`

#### **GazePoint**

- `id` (PK)
- `session_id` (FK)
- `x`, `y`: Gaze coordinates
- `panel`: "A", "B", "left", "right", or empty
- `phase`: "reading_A", "reading_B", or empty
- `timestamp`: When gaze point was recorded

#### **ReadingEvent**

- `id` (PK)
- `session_id` (FK)
- `event_type`: "start", "pause", "resume", "complete"
- `panel`: "A", "B", "left", "right"
- `duration`: Duration in milliseconds (for complete events)
- `timestamp`

#### **QuizResponse**

- `id` (PK)
- `session_id` (FK)
- `question_id`: Question identifier (e.g., "q1")
- `answer_index`: Selected answer (0-based)
- `is_correct`: Boolean (nullable, calculated server-side)
- `response_time`: Time to answer (ms, optional)
- `timestamp`

#### **StudyText**

- `id` (PK)
- `version` (Unique): Version identifier (e.g., "default", "v1")
- `content`: Legacy single passage content (deprecated)
- `font_left`, `font_right`: Default fonts for panels
- `active`: Boolean (only one active at a time)
- `created_at`, `updated_at`: Timestamps
- **Relationships**:
  - Has many Passages
  - Has many QuizQuestions

#### **Passage**

- `id` (PK)
- `study_text_id` (FK): Reference to StudyText
- `order`: Display order (0, 1, 2, ...)
- `content`: Passage text
- `title`: Optional title
- `font_left`, `font_right`: Optional passage-specific fonts (fallback to StudyText)
- `created_at`, `updated_at`
- **Relationships**:
  - Belongs to StudyText
  - Has many QuizQuestions (optional)

#### **QuizQuestion**

- `id` (PK)
- `study_text_id` (FK): Required
- `passage_id` (FK): Optional (nullable) - links to specific passage
- `question_id`: Unique identifier (e.g., "q1")
- `prompt`: Question text
- `choices`: JSON array of answer choices (stored as text)
- `answer`: Index of correct answer (0-based)
- `order`: Display order
- `created_at`, `updated_at`
- **Relationships**:
  - Belongs to StudyText
  - Belongs to Passage (optional)

### Database Relationships Diagram

```
Participant
    │
    ├─── StudySession
    │       │
    │       ├─── CalibrationData
    │       ├─── AccuracyMeasurement
    │       ├─── GazePoint
    │       ├─── ReadingEvent
    │       └─── QuizResponse
    │
StudyText
    │
    ├─── Passage
    │       │
    │       └─── QuizQuestion (optional)
    │
    └─── QuizQuestion (study-level)
```

---

## API Architecture

### Base URL

- Default: `http://localhost:8080`
- Configurable via `VITE_API_URL` environment variable

### Public Endpoints

#### **Participant Management**

**POST `/api/participant`**

- Creates a new participant
- Request: `{ "source": "web" }`
- Response: `{ "success": true, "id": 1, "source": "web" }`

#### **Session Management**

**POST `/api/session`**

- Creates a new study session
- Request: `{ "participant_id": 1, "session_id": "...", ... }`
- Response: `{ "success": true, "session_id": "...", "id": 1 }`

#### **Data Collection**

**POST `/api/calibration`**

- Stores calibration point data
- Request: `{ "session_id": 1, "point_index": 0, "click_number": 1, "x": 100, "y": 200 }`

**POST `/api/accuracy`**

- Stores accuracy measurement
- Request: `{ "session_id": 1, "accuracy": 95.5, "duration": 5000, "passed": true }`

**POST `/api/gaze-point`**

- Stores individual gaze point
- Request: `{ "session_id": 1, "x": 500, "y": 300, "panel": "A", "phase": "reading_A" }`

**POST `/api/reading-event`**

- Stores reading event milestone
- Request: `{ "session_id": 1, "event_type": "start", "panel": "A" }`

**POST `/api/quiz-response`**

- Stores quiz answer
- Request: `{ "session_id": 1, "question_id": "q1", "answer_index": 0, "is_correct": true }`

#### **Content Retrieval**

**GET `/api/study-text?version=default`**

- Fetches study text with passages
- Response: `{ "id": 1, "version": "default", "passages": [...], "font_left": "serif", "font_right": "sans" }`

**GET `/api/quiz-questions?study_text_id=1&passage_id=2`**

- Fetches quiz questions
- Response: `[{ "id": "q1", "prompt": "...", "choices": [...], "answer": 0 }]`

**GET `/api/health`**

- Health check endpoint
- Response: `{ "status": "ok" }`

### Admin Endpoints

All admin endpoints are under `/api/admin/`:

#### **Study Text Management**

- `POST /api/admin/study-text`: Create study text
- `PUT /api/admin/study-text`: Update study text
- `GET /api/admin/study-text`: List all study texts

#### **Passage Management**

- `POST /api/admin/passage`: Create passage
- `PUT /api/admin/passage`: Update passage
- `DELETE /api/admin/passage?id=X`: Delete passage
- `GET /api/admin/passage?study_text_id=X`: Get passages for study text

#### **Quiz Question Management**

- `POST /api/admin/quiz-question`: Create quiz question
- `PUT /api/admin/quiz-question`: Update quiz question
- `DELETE /api/admin/quiz-question?id=X`: Delete question
- `GET /api/admin/quiz-question?study_text_id=X`: Get questions

### CORS Configuration

Backend allows requests from:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:4173` (Vite preview)
- `http://localhost:3000` (alternative dev port)

---

## Frontend Architecture

### Component Hierarchy

```
+page.svelte (Landing)
    │
    ├─── calibrate/+page.svelte
    │       ├─── CalibrationGrid
    │       └─── ProgressBar
    │
    ├─── accuracy/+page.svelte
    │       ├─── AccuracyMeasurer
    │       └─── GazeOverlay
    │
    ├─── read/+page.svelte (Main Reading Interface)
    │       ├─── WebGazerManager (initializes eye-tracking)
    │       ├─── ReadingPanel (side-by-side font display)
    │       ├─── Modal (instructions, transitions)
    │       └─── Font comparison state management
    │
    └─── quiz/+page.svelte
            ├─── QuizQuestion (individual question)
            └─── QuizResults
```

### State Management Strategy

#### 1. **Svelte Stores** (`src/lib/stores/`)

- **`webgazer.ts`**: Manages WebGazer instance state
  - `currentGaze`: Current gaze coordinates
  - `hasGaze`: Whether gaze is being tracked
  - `isInitialized`: WebGazer initialization status

#### 2. **SessionStorage** (Browser persistence)

Stored keys:

- `participant_id`: Participant database ID
- `session_id`: Client-generated session ID
- `session_db_id`: Database session ID
- `study_text_id`: Current study text ID
- `current_passage_index`: Current passage (0-based)
- `current_passage_id`: Current passage database ID
- `current_screen`: Current screen number (1-4)
- `total_passages`: Total number of passages
- `match_<matchId>_winner`: Font comparison results (note: storage key uses "match" terminology but stores user preferences)
- `match_<matchId>_timeA`, `match_<matchId>_timeB`: Reading times

#### 3. **Component State** (Reactive variables)

- Font comparison state (in-memory)
- Current comparison index
- Reading times
- Gaze buffer
- UI state (modals, loading, etc.)

### Font Comparison State Management

The font comparison state is managed in `src/lib/fonts.ts`:

```typescript
interface ComparisonState {
  fonts: FontName[]; // All 6 fonts being evaluated
  comparisons: Comparison[]; // All font pair comparisons (current + future)
  currentComparisonIndex: number; // Index of current comparison
  eliminated: FontName[]; // Fonts that have been eliminated from consideration
  finalPreference: FontName | null; // Final preferred font
}
```

**State Flow:**

1. Initialize comparison system with 6 fonts → Creates initial font pair comparisons
2. User completes comparison → `recordComparisonResult()` called
3. Function generates next comparisons based on comparison progress
4. State updated with new comparisons and current comparison index
5. Process repeats until final preference determined

### Gaze Data Collection

**Collection Strategy:**

- Interval: Every 100ms (`GAZE_COLLECTION_INTERVAL`)
- Buffer size: 10 points (`GAZE_BATCH_SIZE`)
- Submission: When buffer full or component unmounts

**Data Structure:**

```typescript
{
  x: number; // X coordinate
  y: number; // Y coordinate
  panel: string; // "A" or "B"
  phase: string; // "reading_A" or "reading_B"
  timestamp: number; // Unix timestamp
}
```

**Panel Detection:**

- Calculated based on screen midpoint
- `x < screenWidth / 2` → Panel A
- `x >= screenWidth / 2` → Panel B

---

## Backend Architecture

### Server Initialization

1. **Database Connection**

   - Opens SQLite database (`readability.db`)
   - Auto-migrates schema on startup
   - Creates tables if they don't exist

2. **Echo Router Setup**

   - Configures CORS middleware
   - Registers API routes
   - Registers admin routes
   - Seeds initial data if database empty

3. **Server Start**
   - Default port: 8080 (configurable via `PORT` env var)
   - Listens for HTTP requests

### Request Handling Flow

```
HTTP Request
    ↓
Echo Router (routes request)
    ↓
CORS Middleware (validates origin)
    ↓
Handler Function
    ├─ Bind JSON to struct
    ├─ Validate input
    ├─ Database operation (GORM)
    └─ Return JSON response
```

### Error Handling

- **400 Bad Request**: Invalid JSON or missing required fields
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Database or server error
- **409 Conflict**: Unique constraint violation (e.g., duplicate version)

### Database Operations

**GORM Features Used:**

- Auto-migration
- Preloading relationships (`Preload()`)
- Query building with conditions
- Transactions (implicit)

**Example Query:**

```go
db.Preload("Passages", func(db *gorm.DB) *gorm.DB {
    return db.Order("`order` ASC")
}).Where("version = ? AND active = ?", version, true).First(&studyText)
```

---

## Font Comparison System

### Systematic Font Evaluation Methodology

The system uses a structured pairwise comparison approach to evaluate font readability preferences. This methodology ensures that each font is evaluated multiple times before being eliminated from consideration, providing robust preference data.

#### Font Pool (6 fonts)

**Serif Fonts:**

- Georgia
- Times New Roman
- Merriweather

**Sans-Serif Fonts:**

- Inter
- Open Sans
- Roboto

#### Comparison Phases

**1. Initial Comparison Round**

- 3 font pair comparisons: 6 fonts → 3 preferred, 3 not preferred
- Comparison 1: Font[0] vs Font[1]
- Comparison 2: Font[2] vs Font[3]
- Comparison 3: Font[4] vs Font[5]

**2. Primary Evaluation Round 2**

- 1 comparison: 2 previously preferred fonts compared, 1 gets a pass
- Not preferred font moves to secondary evaluation

**3. Primary Evaluation Round 3 (Primary Final)**

- 1 comparison: Previously preferred font vs Pass recipient
- Determines primary preferred font
- Not preferred font moves to secondary final

**4. Secondary Evaluation Round 1**

- 1 comparison: 2 fonts from initial round that were not preferred, 1 gets a pass
- 1 font eliminated from further consideration (2 non-preferences)

**5. Secondary Evaluation Round 2**

- Comparison 1: Font from Primary Round 2 that was not preferred vs Font from Secondary Round 1 that was preferred
- Comparison 2: Preferred font from Comparison 1 vs Pass recipient from Secondary Round 1
- 1 font eliminated from further consideration

**6. Secondary Evaluation Round 3 (Secondary Final)**

- 1 comparison: Font from Primary Final that was not preferred vs Font from Secondary Round 2 that was preferred
- Determines secondary preferred font
- 1 font eliminated from further consideration

**7. Final Preference Determination**

- Comparison 1: Primary preferred font vs Secondary preferred font
  - If primary preferred font is selected → Final preference determined
  - If secondary preferred font is selected → Additional comparison needed
- Comparison 2 (if needed): Same two fonts compared again
  - Selected font is the final preferred font

#### Total Comparisons: 9-10

### Font Comparison Logic Implementation

**Key Functions** (`src/lib/fonts.ts`):

1. **`initializeTournament()`**: Creates initial state with first round comparisons (note: function name uses "tournament" terminology but implements comparison methodology)
2. **`recordMatchResult()`**: Records user preference, generates next comparisons (note: function name uses "match" terminology but implements font pair evaluation)
3. **`generateNextMatches()`**: Determines which font pairs to compare next (note: function name uses "matches" terminology but generates comparisons)
4. **`checkEliminations()`**: Identifies fonts that have been eliminated from consideration
5. **`checkTournamentComplete()`**: Determines if final preference has been determined (note: function name uses "tournament" terminology but checks comparison completion)

**Comparison Generation Rules:**

- Comparisons are generated progressively (only when previous comparisons complete)
- Pass assignments are automatically made when odd number of fonts remain
- Comparison state is deterministic (same inputs → same outputs)

### Comparison State Persistence

Comparison state is stored in sessionStorage:

- Comparison results: `match_<matchId>_winner` (note: storage key uses "match" terminology but stores comparison preferences)
- Reading times: `match_<matchId>_timeA`, `match_<matchId>_timeB`

This allows the font evaluation to continue across page refreshes.

---

## Eye-Tracking Integration

### WebGazer.js Integration

**Initialization:**

- WebGazerManager component initializes WebGazer
- Requests camera permission
- Calibrates using 9-point grid
- Hides video/overlays during reading

**Gaze Collection:**

- WebGazer provides `(x, y)` coordinates
- Frontend subscribes to gaze updates via Svelte store
- Coordinates collected every 100ms
- Panel detection based on screen midpoint

**Calibration Process:**

1. User clicks 9 calibration points (3x3 grid)
2. Each point clicked 5 times
3. WebGazer learns user's eye movement patterns
4. Calibration data sent to backend

**Accuracy Measurement:**

- After calibration, user clicks targets
- System measures accuracy of gaze predictions
- Must pass threshold to proceed

### Gaze Data Processing

**Collection:**

- Interval: 100ms
- Buffer: 10 points
- Submission: Batch API calls

**Data Enrichment:**

- Panel assignment (A/B based on x-coordinate)
- Phase assignment (reading_A/reading_B)
- Timestamp addition

**Storage:**

- Each gaze point stored as separate database record
- Linked to session via `session_id`
- Enables detailed analysis of reading patterns

---

## State Management

### Frontend State Layers

**1. Component State (Reactive)**

- UI state (modals, loading, etc.)
- Current comparison, passage, screen
- Reading times, preferences

**2. Svelte Stores (Global)**

- WebGazer state (gaze coordinates, initialization status)
- Shared across components

**3. SessionStorage (Persistence)**

- Survives page refreshes
- Font comparison results
- Progress tracking
- Session identifiers

**4. Backend State (Database)**

- Permanent storage
- All collected data
- Study content

### State Synchronization

**Frontend → Backend:**

- Real-time: Gaze points, reading events
- On action: Quiz responses, comparison results
- On completion: Full session data

**Backend → Frontend:**

- On load: Study text, passages, quiz questions
- Cached: Content rarely changes during session

### State Recovery

If user refreshes page:

1. Frontend checks sessionStorage for progress
2. Restores passage index, screen number
3. Restores font comparison results
4. Continues from where they left off

---

## User Journey

### Complete Study Flow

```
1. Landing Page
   ↓
2. Calibration
   ├─ Click 9 calibration points (5 clicks each)
   ├─ WebGazer learns eye patterns
   └─ Submit calibration data
   ↓
3. Accuracy Measurement
   ├─ Click targets to measure accuracy
   ├─ Must pass threshold
   └─ Submit accuracy data
   ↓
4. Reading Phase (for each passage)
   ├─ Screen 1: Font A vs Font B (font pair comparison)
   │   ├─ Read both panels
   │   ├─ Gaze data collected
   │   ├─ Reading times tracked
   │   └─ Select preferred font
   │
   ├─ Screen 2: Next font pair comparison
   ├─ Screen 3: Next font pair comparison
   ├─ Screen 4: Next font pair comparison
   │
   └─ Quiz Transition Modal
       └─ "Ready for Comprehension Questions"
   ↓
5. Comprehension Quiz
   ├─ Answer questions about passage
   ├─ Submit responses
   └─ Backend calculates correctness
   ↓
6. Next Passage? (if more passages exist)
   └─ Return to step 4 with next passage
   ↓
7. Study Complete
   └─ All data submitted to backend
```

### Progress Indicators

- **Passage Progress**: "Passage X of Y"
- **Screen Progress**: "Screen Z of 4"
- **Comparison Progress**: Implicit (comparisons completed)

---

## Data Collection

### Collected Data Types

#### 1. **Calibration Data**

- 9 points × 5 clicks = 45 calibration points
- X, Y coordinates for each click
- Point index and click number

#### 2. **Accuracy Measurements**

- Accuracy percentage
- Duration of measurement
- Pass/fail status

#### 3. **Gaze Points**

- X, Y coordinates (every 100ms during reading)
- Panel assignment (A/B)
- Phase assignment (reading_A/reading_B)
- Timestamp

#### 4. **Reading Events**

- Event type: start, pause, resume, complete
- Panel: A, B, left, right
- Duration (for complete events)
- Timestamp

#### 5. **Comparison Results**

- Font A and Font B
- User preference selection
- Reading time for Panel A
- Reading time for Panel B
- Comparison round and evaluation group information

#### 6. **Quiz Responses**

- Question ID
- Selected answer index
- Correctness (calculated server-side)
- Response time (optional)
- Timestamp

### Data Submission Strategy

**Real-time Submission:**

- Gaze points (batched)
- Reading events
- Quiz responses

**Batch Submission:**

- Gaze points: 10 at a time
- Comparison results: After each comparison

**Final Submission:**

- Complete session data
- All font comparison results
- All quiz responses

### Data Validation

**Frontend Validation:**

- Required fields present
- Data types correct
- Session ID exists

**Backend Validation:**

- JSON structure valid
- Required fields present
- Foreign key relationships valid
- Timestamps set if missing

---

## Deployment & Operations

### Development Setup

**Backend:**

```bash
cd Webgazer-Backend
go run .
# Server starts on http://localhost:8080
```

**Frontend:**

```bash
cd Webgazer-Frontend
npm install
npm run dev
# Dev server starts on http://localhost:5173
```

### Environment Variables

**Backend:**

- `PORT`: Server port (default: 8080)

**Frontend:**

- `VITE_API_URL`: Backend API URL (default: http://localhost:8080)

### Production Build

**Frontend:**

```bash
cd Webgazer-Frontend
npm run build
# Output in build/ directory
```

**Backend:**

```bash
cd Webgazer-Backend
go build -o readability-backend
./readability-backend
```

### Database Management

**View Data:**

```bash
sqlite3 Webgazer-Backend/readability.db
.tables
SELECT * FROM study_sessions;
```

**Backup:**

```bash
cp Webgazer-Backend/readability.db backup.db
```

**Reset:**

```bash
rm Webgazer-Backend/readability.db
# Database will be recreated on next server start
```

### Monitoring & Debugging

**Backend Logs:**

- Echo framework logs HTTP requests
- Database errors logged to console
- Check server console for errors

**Frontend Debugging:**

- Browser DevTools console
- Network tab for API calls
- Application tab for sessionStorage

**Common Issues:**

- CORS errors: Check backend CORS configuration
- Database locked: Only one process should access SQLite
- Gaze not working: Check camera permissions, WebGazer initialization

### Scaling Considerations

**Current Limitations:**

- SQLite: Single-file database (not suitable for high concurrency)
- No authentication/authorization
- No rate limiting
- No load balancing

**Future Improvements:**

- Migrate to PostgreSQL for production
- Add authentication for admin endpoints
- Implement rate limiting
- Add caching layer for study content
- Separate read/write database connections

---

## Conclusion

The Webgazer Readability Study is a sophisticated research platform that combines modern web technologies with eye-tracking capabilities to conduct font readability studies. The system's architecture supports:

- **Flexible Content Management**: Multiple passages, versioned study texts
- **Robust Data Collection**: Comprehensive gaze, reading, and preference data
- **Systematic Comparison Methodology**: Structured pairwise evaluation ensures accurate preference ranking
- **User-Friendly Interface**: Progressive flow with clear instructions
- **Data Persistence**: Survives page refreshes, permanent backend storage

The modular architecture allows for easy extension and modification, making it suitable for various readability research scenarios.
