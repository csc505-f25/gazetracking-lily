# Webgazer Readability Study

This project implements a readability study that combines font preference evaluation through a double elimination tournament with passage reading and comprehension assessment.

## Overview

The study has two main components that work together:

1. **Font Comparison Tournament**: A double elimination tournament where users compare fonts side-by-side to determine their preferred reading font
2. **Passage Reading Process**: Users read passages multiple times, then answer comprehension questions to validate their understanding

## User Flow

### Complete Study Flow

```
1. Calibration (if needed)
   ↓
2. Reading Phase
   ├─ Passage 1: Screen 1 → Screen 2 → Screen 3 → Screen 4
   │  └─ Each screen shows font comparison (tournament continues)
   │  └─ After 4 screens → Comprehension Quiz for Passage 1
   │
   ├─ Passage 2: Screen 1 → Screen 2 → Screen 3 → Screen 4
   │  └─ Font tournament continues across passages
   │  └─ After 4 screens → Comprehension Quiz for Passage 2
   │
   └─ ... (continues for all passages)
   ↓
3. Completion
```

## Font Comparison Method: Double Elimination Tournament

### How It Works

The system uses a **double elimination tournament** to determine font preferences. This ensures fairness - no font is eliminated after just one loss.

#### Basic Rules

- **6 fonts** compete in the tournament
- Fonts are paired and shown **side-by-side** with the same passage text
- User selects their preferred font
- A font needs to lose **twice** before being eliminated
- The tournament continues across all passages and screens

#### Tournament Structure

**Winners Bracket** (fonts with 0 losses):

- Round 1: 3 matches (6 fonts → 3 winners, 3 losers)
- Round 2: 1 match (2 winners compete, 1 gets bye)
- Round 3: Winners Final (determines Winners Champion)

**Losers Bracket** (fonts with 1 loss):

- Round 1: 1 match (2 losers compete, 1 gets bye)
- Round 2: 2 matches (losers from later rounds join)
- Round 3: Losers Final (determines Losers Champion)

**Grand Final**:

- Winners Champion vs Losers Champion
- If Losers Champion wins, a second match is required (bracket reset)

#### Tournament Flow Example

```
Winners Bracket:
Round 1: [A vs B] [C vs D] [E vs F] → 3 winners, 3 losers
         ↓
Round 2: [Winner vs Winner] (1 bye) → 1 winner, 1 loser
         ↓
Round 3: [Winner vs Bye] → Winners Champion
         ↓
         └─→ Loser → Losers Final

Losers Bracket:
Round 1: [Loser vs Loser] (1 bye) → 1 winner, 1 eliminated
         ↓
Round 2: [Loser from W2 vs Winner from L1]
         ↓
         [Winner vs Bye] → 1 winner, 1 eliminated
         ↓
Round 3: [Loser from W3 vs Winner from L2] → Losers Champion
         ↓
         └─→ Loser eliminated

Grand Final:
Match 1: [Winners Champion vs Losers Champion]
         ↓
         If Winners wins → Done!
         If Losers wins → Match 2 needed
         ↓
Match 2: [Same two fonts] → Overall Winner
```

**Total Matches**: 9-10 font comparisons

## Passage Reading Process

### Reading Flow

For each passage in the database:

1. **4 Reading Screens**: The same passage is shown 4 times

   - Each screen presents a font comparison (part of the tournament)
   - User reads the passage in both fonts and selects their preference
   - Progress indicator shows: "Passage X of Y — Screen Z of 4"

2. **Transition Modal**: After the 4th screen

   - Modal appears: "Ready for Comprehension Questions"
   - Explains they'll answer questions about the passage
   - User clicks "Continue to Quiz"

3. **Comprehension Quiz**:

   - Multiple-choice questions about the passage content
   - Validates that the user actually read and understood the material
   - Questions are associated with the study text (not individual passages)

4. **Next Passage**: After quiz submission
   - If more passages exist → Automatically moves to next passage
   - Screen counter resets to 1
   - Font tournament continues from where it left off
   - If all passages complete → Study completion screen

### Key Features

- **Progress Tracking**: System tracks which passage and screen the user is on
- **State Persistence**: Progress saved in sessionStorage (survives page refreshes)
- **Gaze Data Collection**: Eye-tracking data collected during reading (every 100ms)
- **Reading Time Tracking**: Time spent reading each font panel is recorded

## Technical Details

### State Management

The system tracks:

- **Tournament State**: Current match, completed matches, eliminated fonts
- **Passage State**: Current passage index, current screen (1-4)
- **Reading State**: Started, completed panels, reading times
- **Gaze Data**: Buffered and submitted in batches

### Data Collection

**Gaze Points**:

- Collected every 100ms during reading
- Batched in groups of 10 before submission
- Includes: x, y coordinates, panel (A/B), phase (reading_A/reading_B)

**Match Results**:

- Font preferences for each match
- Reading times for each font panel
- Tournament progression data

**Quiz Responses**:

- Individual question answers
- Correctness calculated server-side
- Associated with session

### Session Storage Keys

- `current_passage_index`: Current passage (0-based)
- `current_screen`: Current screen for passage (1-4)
- `total_passages`: Total number of passages
- `current_passage_id`: Database ID of current passage
- `study_text_id`: ID of the study text
- `session_db_id`: Database session ID
- Tournament match data: `match_<matchId>_winner`, `match_<matchId>_timeA`, etc.

## Implementation Files

### Frontend

- **`src/routes/read/+page.svelte`**: Main reading interface

  - Manages tournament state
  - Handles passage progression
  - Collects gaze data
  - Tracks reading times

- **`src/routes/quiz/+page.svelte`**: Comprehension quiz

  - Fetches questions for study text
  - Handles quiz submission
  - Manages passage progression after quiz

- **`src/lib/fonts.ts`**: Tournament logic
  - Tournament initialization
  - Match generation
  - Elimination checking
  - Winner determination

### Backend

- **`models.go`**: Data models

  - `StudyText`: Contains passages and quiz questions
  - `Passage`: Individual reading passages
  - `QuizQuestion`: Comprehension questions

- **`main.go`**: API endpoints
  - `/api/study-text`: Fetch passages
  - `/api/quiz-questions`: Fetch questions
  - `/api/gaze-point`: Submit gaze data
  - `/api/session`: Submit complete session

## User Experience

### Reading Screen

- Two side-by-side panels showing the same passage in different fonts
- "Font A" and "Font B" labels
- "Choose Font A" and "Choose Font B" buttons
- Progress indicator: "Passage X of Y — Screen Z of 4"
- Gaze indicator (red dot) shows current eye position (development mode)

### Quiz Screen

- Multiple-choice questions
- Paginated (5 questions per page)
- Previous/Next navigation
- Submit button on last page
- Automatic progression to next passage after submission

### Modals

1. **Initial Instructions**: Shown at start

   - "Please read the passage carefully..."
   - "You will be asked comprehension questions..."

2. **Quiz Transition**: Shown after 4th screen
   - "Ready for Comprehension Questions"
   - "You have completed reading this passage..."

## Data Flow

```
User Action → State Update → Data Collection → API Submission
     ↓              ↓              ↓                ↓
Select Font → Tournament → Match Result → sessionStorage
     ↓              ↓              ↓                ↓
Read Passage → Screen Count → Gaze Points → Batch Submit
     ↓              ↓              ↓                ↓
Complete 4 → Show Modal → Quiz → Next Passage
```

## Future Enhancements

- Passage-specific quiz questions
- Adaptive passage selection based on performance
- Real-time tournament visualization
- Font preference analytics dashboard
