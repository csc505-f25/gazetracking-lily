# Admin Interface Documentation

## Overview

The Admin Interface is a web-based UI for managing study content in the Readability Study application. It provides an interface for creating, editing, and deleting passages and quiz questions.

**Access:** Navigate to `/admin` in your browser when the frontend is running.

## What is a Study Text?

A **Study Text** is the top-level container that groups together all the content for a study. Think of it as a "study version" or "experiment configuration."

### Study Text Purpose

1. **Container for Content**: All passages and quiz questions belong to a Study Text
2. **Version Management**: Each Study Text has a version identifier (e.g., "default", "v1", "v2") so you can have multiple versions of the same study
3. **Default Settings**: Sets default fonts for reading panels (`font_left`, `font_right`) that passages can inherit or override
4. **Active Flag**: Only one Study Text can be "active" at a time - this determines which study content is shown to participants

### Hierarchy

```
Study Text (e.g., "default" or "v1")
  ├── Passage 1 (order: 0)
  │     └── Quiz Question (optional, linked to this passage)
  ├── Passage 2 (order: 1)
  │     └── Quiz Question (optional, linked to this passage)
  └── Quiz Question (study-level, not linked to a specific passage)
```

### Why Study Texts Aren't in the Admin UI

The Study Text section was removed from the admin interface because:

- Study Texts are typically created once and rarely changed
- They're usually managed via the CLI tool (`admin-cli.sh`) or directly via API
- The admin UI focuses on the content that changes more frequently: **Passages** and **Quiz Questions**

However, Study Texts are still **required** because:

- Every Passage must belong to a Study Text (you select it in the form)
- Every Quiz Question must belong to a Study Text (you select it in the form)
- The frontend needs to know which Study Text is "active" to display to participants

### Creating a Study Text

If you need to create a Study Text, use one of these methods:

1. **CLI Tool** (recommended):

   ```bash
   cd Webgazer-Backend
   ./admin-cli.sh
   # Select option 2: Create new study text
   ```

2. **API directly**:
   ```bash
   curl -X POST http://localhost:8080/api/admin/study-text \
     -H "Content-Type: application/json" \
     -d '{
       "version": "default",
       "font_left": "serif",
       "font_right": "sans",
       "active": true
     }'
   ```

### Component Architecture

The admin interface is built as a single-page Svelte component (`+page.svelte`) with the following structure:

1. **State Management**: Reactive variables for data, forms, and UI state
2. **API Integration**: Functions that call admin API endpoints
3. **UI Components**: Tabbed interface with modals for forms
4. **Data Grouping**: Reactive computed values for organizing quiz questions by passage

## Interface Sections

### 1. Passages Tab

**Purpose**: Manage reading passages that belong to study texts.

**Features**:

- List all passages across all study texts
- Create new passages
- Edit existing passages
- Delete passages (with confirmation)

**Fields**:

- **Study Text**: Required - Select which study text this passage belongs to
- **Order**: Display order (0, 1, 2, ...)
- **Title**: Optional title for the passage
- **Content**: Required - The actual passage text
- **Left Font**: Optional - Override study text default (serif/sans)
- **Right Font**: Optional - Override study text default (serif/sans)

**Usage**:

1. Click the "Passages" tab
2. Click "+ New Passage" to create, or "Edit" on an existing passage
3. Fill in the form fields
4. Click "Save" to submit changes
5. The list automatically refreshes to show your changes

### 2. Quiz Questions Tab

**Purpose**: Manage comprehension questions for study texts and passages.

**Features**:

- Questions grouped by passage (or "Study Text Questions" for non-passage questions)
- Create new quiz questions
- Edit existing questions
- Delete questions (with confirmation)
- Dynamic choice management (add/remove answer choices)
- Visual indicator for correct answer

**Fields**:

- **Study Text**: Required - Select which study text this question belongs to
- **Passage ID**: Optional - Link question to a specific passage (leave empty for study text-level questions)
- **Question ID**: Required - Unique identifier (e.g., "q1", "q2")
- **Prompt**: Required - The question text
- **Choices**: Required - At least 2 answer choices (add/remove dynamically)
- **Answer**: Required - Index of the correct answer (0-based)
- **Order**: Display order for the question

**Usage**:

1. Click the "Quiz Questions" tab
2. Questions are automatically grouped by passage
3. Click "+ New Question" to create, or "Edit" on an existing question
4. Fill in the form:
   - Select study text
   - Optionally enter a passage ID
   - Enter question ID and prompt
   - Add answer choices (click "+ Add Choice" to add more)
   - Select the correct answer by clicking the radio button
   - Set display order
5. Click "Save" to submit
6. The list automatically refreshes and groups questions by passage

**Question Types**:

- **Passage-specific**: Questions linked to a specific passage (set `passage_id`)
- **Study text-level**: Questions that apply to the entire study text (leave `passage_id` empty)

## API Integration

The admin interface uses the following API functions from `$lib/api.ts`:

### Passages

- `adminListPassages(studyTextId?)` - Get all passages
- `adminGetPassage(id)` - Get a single passage
- `adminCreatePassage(data)` - Create a new passage
- `adminUpdatePassage(data)` - Update an existing passage
- `adminDeletePassage(id)` - Delete a passage

### Quiz Questions

- `adminListQuizQuestions(studyTextId?, passageId?)` - Get quiz questions
- `adminGetQuizQuestion(id)` - Get a single question
- `adminCreateQuizQuestion(data)` - Create a new question
- `adminUpdateQuizQuestion(data)` - Update an existing question
- `adminDeleteQuizQuestion(id)` - Delete a question

### Study Texts (Background)

- `adminListStudyTexts()` - Load study texts (needed for dropdowns in forms)

## Backend API Endpoints

All admin operations use endpoints under `/api/admin/`:

### Passages

- `GET /api/admin/passage?study_text_id=X` - List passages
- `GET /api/admin/passage?id=X` - Get single passage
- `POST /api/admin/passage` - Create passage
- `PUT /api/admin/passage` - Update passage
- `DELETE /api/admin/passage?id=X` - Delete passage

### Quiz Questions

- `GET /api/admin/quiz-question?study_text_id=X` - List questions for study text
- `GET /api/admin/quiz-question?passage_id=X` - List questions for passage
- `GET /api/admin/quiz-question?id=X` - Get single question
- `POST /api/admin/quiz-question` - Create question
- `PUT /api/admin/quiz-question` - Update question
- `DELETE /api/admin/quiz-question?id=X` - Delete question

### Study Texts

- `GET /api/admin/study-text` - List all study texts (used for form dropdowns)

## Data Flow

1. **Page Load**:
   - Study texts are loaded automatically on mount
   - Passages/quiz questions load when switching to their respective tabs

2. **Create/Update**:
   - User fills form → Clicks "Save" → API call → Success message → List refreshes

3. **Delete**:
   - User clicks "Delete" → Confirmation dialog → API call → Success message → List refreshes

4. **Error Handling**:
   - API errors are caught and displayed as red error messages
   - Success messages appear in green and auto-dismiss after 5 seconds

## Form Validation

### Passages

- Content is required
- Study text must be selected
- Order defaults to 0 if not specified

### Quiz Questions

- Prompt is required
- Question ID is required
- At least 2 choices are required
- Answer index must be valid (0 to choices.length - 1)
- Study text must be selected

## Error Messages

The interface displays user-friendly error messages for:

- API connection failures
- Validation errors
- Backend errors (with error details)
- Missing required fields

## Success Messages

Success messages appear after successful operations:

- "Passage created successfully"
- "Passage updated successfully"
- "Passage deleted successfully"
- "Quiz question created successfully"
- "Quiz question updated successfully"
- "Quiz question deleted successfully"

Messages auto-dismiss after 5 seconds.

## Troubleshooting

### "Cannot connect to API" Error

- Ensure the backend server is running: `cd Webgazer-Backend && go run .`
- Check that the backend is on port 8080 (or update `VITE_API_URL` in your `.env` file)
- Verify CORS is configured correctly in the backend

### Data Not Loading

- Check browser console for API errors
- Verify the backend admin endpoints are accessible
- Ensure study texts exist before creating passages/questions

### Changes Not Appearing

- The list should auto-refresh after save/delete
- Try manually switching tabs to force a reload
- Check browser console for any JavaScript errors

### Form Not Submitting

- Check that all required fields are filled
- Verify the study text exists in the database
- Check browser console for validation errors

## Best Practices

1. **Create Study Texts First**: Use the CLI or API to create study texts before adding passages
2. **Use Meaningful Question IDs**: Use consistent naming like "q1", "q2", etc.
3. **Set Appropriate Order Values**: Use order to control question/passage display sequence
4. **Link Questions to Passages**: Use passage-specific questions for better organization
5. **Test After Changes**: Verify questions and passages appear correctly in the reading interface

## Related Documentation

- **Backend API**: See `Webgazer-Backend/ADMIN_API.md` for detailed API documentation
- **CLI Tool**: See `Webgazer-Backend/admin-cli.sh` for the terminal-based admin interface
- **System Overview**: See `SYSTEM_OVERVIEW.md` for overall system architecture

### API Response Handling

- All admin endpoints return `{success: boolean, data?: T, error?: string}`
- Create/Update operations return `{success: true, id: number, message: string}`
- The frontend fetches the created/updated item after submission to get complete data
