package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func main() {
	// Initialize database
	var err error
	db, err = gorm.Open(sqlite.Open("readability.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate the schema
	err = db.AutoMigrate(
		&Participant{},
		&StudySession{},
		&CalibrationData{},
		&AccuracyMeasurement{},
		&QuizResponse{},
		&GazePoint{},
		&ReadingEvent{},
		&StudyText{},
		&Passage{},
		&QuizQuestion{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	fmt.Println("Database initialized successfully")

	// Setup Echo router
	e := echo.New()

	// Configure CORS middleware
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5173", "http://localhost:4173", "http://localhost:3000"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{"Content-Type"},
	}))

	// API routes
	api := e.Group("/api")
	{
		api.POST("/participant", handleParticipant)
		api.POST("/session", handleSession)
		api.POST("/quiz-response", handleQuizResponse)
		api.POST("/calibration", handleCalibration)
		api.POST("/gaze-point", handleGazePoint)
		api.POST("/reading-event", handleReadingEvent)
		api.POST("/accuracy", handleAccuracy)
		api.GET("/study-text", handleStudyText)
		api.GET("/quiz-questions", handleQuizQuestions)
		api.GET("/health", handleHealth)

		// Admin routes
		admin := api.Group("/admin")
		{
			admin.POST("/study-text", handleAdminStudyText)
			admin.PUT("/study-text", handleAdminStudyText)
			admin.GET("/study-text", handleAdminStudyText)
			admin.POST("/passage", handleAdminPassage)
			admin.PUT("/passage", handleAdminPassage)
			admin.DELETE("/passage", handleAdminPassage)
			admin.GET("/passage", handleAdminPassage)
			admin.POST("/quiz-question", handleAdminQuizQuestion)
			admin.PUT("/quiz-question", handleAdminQuizQuestion)
			admin.DELETE("/quiz-question", handleAdminQuizQuestion)
			admin.GET("/quiz-question", handleAdminQuizQuestion)
			admin.GET("/statistics", handleAdminStatistics)
		}
	}

	// Seed initial data if database is empty
	seedInitialData()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(e.Start(":" + port))
}

func handleHealth(c echo.Context) error {
	return c.JSON(200, map[string]string{"status": "ok"})
}

func handleParticipant(c echo.Context) error {
	var participant Participant
	if err := c.Bind(&participant); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Set default source if not provided
	if participant.Source == "" {
		participant.Source = "web"
	}

	// Create participant in database
	if err := db.Create(&participant).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save participant: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success": true,
		"id":      participant.ID,
		"source":  participant.Source,
	})
}

func handleSession(c echo.Context) error {
	var session StudySession
	if err := c.Bind(&session); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Create session in database
	if err := db.Create(&session).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save session: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success":    true,
		"session_id": session.SessionID,
		"id":         session.ID,
	})
}

func handleQuizResponse(c echo.Context) error {
	var quizResponse QuizResponse
	if err := c.Bind(&quizResponse); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Set timestamp if not provided
	if quizResponse.Timestamp.IsZero() {
		quizResponse.Timestamp = time.Now()
	}

	// Create quiz response in database
	if err := db.Create(&quizResponse).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save quiz response: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success": true,
		"id":      quizResponse.ID,
	})
}

func handleCalibration(c echo.Context) error {
	var calibration CalibrationData
	if err := c.Bind(&calibration); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Set timestamp if not provided
	if calibration.Timestamp.IsZero() {
		calibration.Timestamp = time.Now()
	}

	// Create calibration data in database
	if err := db.Create(&calibration).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save calibration data: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success": true,
		"id":      calibration.ID,
	})
}

func handleGazePoint(c echo.Context) error {
	var gazePoint GazePoint
	if err := c.Bind(&gazePoint); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Set timestamp if not provided
	if gazePoint.Timestamp.IsZero() {
		gazePoint.Timestamp = time.Now()
	}

	// Create gaze point in database
	if err := db.Create(&gazePoint).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save gaze point: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success": true,
		"id":      gazePoint.ID,
	})
}

func handleReadingEvent(c echo.Context) error {
	var readingEvent ReadingEvent
	if err := c.Bind(&readingEvent); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Set timestamp if not provided
	if readingEvent.Timestamp.IsZero() {
		readingEvent.Timestamp = time.Now()
	}

	// Create reading event in database
	if err := db.Create(&readingEvent).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save reading event: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success": true,
		"id":      readingEvent.ID,
	})
}

func handleAccuracy(c echo.Context) error {
	var accuracy AccuracyMeasurement
	if err := c.Bind(&accuracy); err != nil {
		return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
	}

	// Set timestamp if not provided
	if accuracy.Timestamp.IsZero() {
		accuracy.Timestamp = time.Now()
	}

	// Create accuracy measurement in database
	if err := db.Create(&accuracy).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to save accuracy measurement: " + err.Error()})
	}

	return c.JSON(201, map[string]interface{}{
		"success": true,
		"id":      accuracy.ID,
	})
}

func handleStudyText(c echo.Context) error {
	// Get version from query parameter, default to "default"
	version := c.QueryParam("version")
	if version == "" {
		version = "default"
	}

	var studyText StudyText
	if err := db.Preload("Passages", func(db *gorm.DB) *gorm.DB {
		return db.Order("`order` ASC")
	}).Where("version = ? AND active = ?", version, true).First(&studyText).Error; err != nil {
		// If not found, try to get any active study text
		if err := db.Preload("Passages", func(db *gorm.DB) *gorm.DB {
			return db.Order("`order` ASC")
		}).Where("active = ?", true).First(&studyText).Error; err != nil {
			return c.JSON(404, map[string]string{"error": "No study text found"})
		}
	}
	
	// Sort passages by order to ensure correct ordering (backup sorting)
	if len(studyText.Passages) > 1 {
		// Use bubble sort for simple ordering
		for i := 0; i < len(studyText.Passages); i++ {
			for j := i + 1; j < len(studyText.Passages); j++ {
				if studyText.Passages[i].Order > studyText.Passages[j].Order {
					studyText.Passages[i], studyText.Passages[j] = studyText.Passages[j], studyText.Passages[i]
				}
			}
		}
	}

	// Build response - include passages if they exist, otherwise use legacy content
	response := map[string]interface{}{
		"id":        studyText.ID,
		"version":   studyText.Version,
		"font_left": studyText.FontLeft,
		"font_right": studyText.FontRight,
	}

	// If passages exist, return them; otherwise return legacy content for backward compatibility
	if len(studyText.Passages) > 0 {
		response["passages"] = studyText.Passages
	} else {
		response["content"] = studyText.Content
	}

	return c.JSON(200, response)
}

func handleQuizQuestions(c echo.Context) error {
	// Get study_text_id and passage_id from query parameters
	studyTextID := c.QueryParam("study_text_id")
	passageID := c.QueryParam("passage_id")

	var questions []QuizQuestion
	query := db.Order("`order` ASC")

	// If passage_id is provided, filter by passage (most specific)
	if passageID != "" {
		query = query.Where("passage_id = ?", passageID)
	} else if studyTextID != "" {
		// If study_text_id provided but no passage_id, get questions for study text (not linked to specific passage)
		query = query.Where("study_text_id = ? AND passage_id IS NULL", studyTextID)
	} else {
		// If no parameters provided, get questions for active study text (not linked to specific passage)
		var studyText StudyText
		if err := db.Where("active = ?", true).First(&studyText).Error; err != nil {
			return c.JSON(404, map[string]string{"error": "No active study text found"})
		}
		query = query.Where("study_text_id = ? AND passage_id IS NULL", studyText.ID)
	}

	if err := query.Find(&questions).Error; err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to fetch quiz questions: " + err.Error()})
	}

	// Format response to match frontend expectations
	type QuizQResponse struct {
		ID      string   `json:"id"`
		Prompt  string   `json:"prompt"`
		Choices []string `json:"choices"`
		Answer  int      `json:"answer"`
	}

	response := make([]QuizQResponse, len(questions))
	for i, q := range questions {
		var choices []string
		if err := json.Unmarshal([]byte(q.Choices), &choices); err != nil {
			log.Printf("Error unmarshaling choices for question %s: %v", q.QuestionID, err)
			continue
		}

		response[i] = QuizQResponse{
			ID:      q.QuestionID,
			Prompt:  q.Prompt,
			Choices: choices,
			Answer:  q.Answer,
		}
	}

	return c.JSON(200, response)
}

// Admin endpoints for managing study text, passages, and quiz questions

func handleAdminPassage(c echo.Context) error {
	switch c.Request().Method {
	case "POST":
		// Create new passage
		var passage Passage
		if err := c.Bind(&passage); err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
		}

		// Validate required fields
		if passage.StudyTextID == 0 || passage.Content == "" {
			return c.JSON(400, map[string]string{"error": "study_text_id and content are required"})
		}

		// Verify study text exists
		var studyText StudyText
		if err := db.First(&studyText, passage.StudyTextID).Error; err != nil {
			return c.JSON(404, map[string]string{"error": "Study text not found"})
		}

		// If order not specified, set it to the next available order
		if passage.Order == 0 {
			var maxOrder int
			db.Model(&Passage{}).Where("study_text_id = ?", passage.StudyTextID).Select("COALESCE(MAX(`order`), -1)").Scan(&maxOrder)
			passage.Order = maxOrder + 1
		}

		if err := db.Create(&passage).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to create passage: " + err.Error()})
		}

		return c.JSON(201, map[string]interface{}{
			"success": true,
			"id":      passage.ID,
			"message": "Passage created successfully",
		})

	case "PUT":
		// Update existing passage
		var updateData struct {
			ID        uint   `json:"id"`
			Order     *int   `json:"order,omitempty"`
			Content   string `json:"content,omitempty"`
			Title     string `json:"title,omitempty"`
			FontLeft  string `json:"font_left,omitempty"`
			FontRight string `json:"font_right,omitempty"`
		}

		if err := c.Bind(&updateData); err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
		}

		if updateData.ID == 0 {
			return c.JSON(400, map[string]string{"error": "ID is required"})
		}

		var passage Passage
		if err := db.First(&passage, updateData.ID).Error; err != nil {
			return c.JSON(404, map[string]string{"error": "Passage not found"})
		}

		// Update fields
		if updateData.Content != "" {
			passage.Content = updateData.Content
		}
		if updateData.Title != "" {
			passage.Title = updateData.Title
		}
		if updateData.Order != nil {
			passage.Order = *updateData.Order
		}
		if updateData.FontLeft != "" {
			passage.FontLeft = updateData.FontLeft
		}
		if updateData.FontRight != "" {
			passage.FontRight = updateData.FontRight
		}

		if err := db.Save(&passage).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to update passage: " + err.Error()})
		}

		return c.JSON(200, map[string]interface{}{
			"success": true,
			"id":      passage.ID,
			"message": "Passage updated successfully",
		})

	case "DELETE":
		// Delete passage
		id := c.QueryParam("id")
		if id == "" {
			return c.JSON(400, map[string]string{"error": "ID parameter is required"})
		}

		if err := db.Delete(&Passage{}, id).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to delete passage: " + err.Error()})
		}

		return c.JSON(200, map[string]interface{}{
			"success": true,
			"message": "Passage deleted successfully",
		})

	case "GET":
		// Get passages - either by study_text_id or by id
		studyTextID := c.QueryParam("study_text_id")
		id := c.QueryParam("id")

		if id != "" {
			// Get single passage by ID
			var passage Passage
			if err := db.First(&passage, id).Error; err != nil {
				return c.JSON(404, map[string]string{"error": "Passage not found"})
			}

			return c.JSON(200, map[string]interface{}{
				"success": true,
				"data":    passage,
			})
		} else if studyTextID != "" {
			// Get all passages for a study text
			var passages []Passage
			if err := db.Where("study_text_id = ?", studyTextID).Order("`order` ASC").Find(&passages).Error; err != nil {
				return c.JSON(500, map[string]string{"error": "Failed to fetch passages: " + err.Error()})
			}

			return c.JSON(200, map[string]interface{}{
				"success": true,
				"data":    passages,
			})
		} else {
			return c.JSON(400, map[string]string{"error": "Either id or study_text_id parameter is required"})
		}

	default:
		return c.JSON(405, map[string]string{"error": "Method not allowed"})
	}
}

func handleAdminStudyText(c echo.Context) error {
	switch c.Request().Method {
	case "POST":
		// Create new study text
		var studyText StudyText
		if err := c.Bind(&studyText); err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
		}

		// Set defaults
		if studyText.Version == "" {
			studyText.Version = "default"
		}
		if studyText.FontLeft == "" {
			studyText.FontLeft = "serif"
		}
		if studyText.FontRight == "" {
			studyText.FontRight = "sans"
		}

		// Check if version already exists (idempotent behavior)
		var existingStudyText StudyText
		if err := db.Where("version = ?", studyText.Version).First(&existingStudyText).Error; err == nil {
			// Version exists, return existing study text
			return c.JSON(200, map[string]interface{}{
				"success": true,
				"id":      existingStudyText.ID,
				"message": "Study text with this version already exists",
			})
		}

		// If this is set to active, deactivate all others
		if studyText.Active {
			db.Model(&StudyText{}).Where("active = ?", true).Update("active", false)
		}

		if err := db.Create(&studyText).Error; err != nil {
			// Check for unique constraint violation (fallback check)
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				return c.JSON(409, map[string]string{
					"error": fmt.Sprintf("Study text with version '%s' already exists", studyText.Version),
				})
			}
			return c.JSON(500, map[string]string{"error": "Failed to create study text: " + err.Error()})
		}

		return c.JSON(201, map[string]interface{}{
			"success": true,
			"id":      studyText.ID,
			"message": "Study text created successfully",
		})

	case "PUT":
		// Update existing study text
		var updateData struct {
			ID        uint   `json:"id"`
			Version   string `json:"version,omitempty"`
			Content   string `json:"content,omitempty"`
			FontLeft  string `json:"font_left,omitempty"`
			FontRight string `json:"font_right,omitempty"`
			Active    *bool  `json:"active,omitempty"`
		}

		if err := c.Bind(&updateData); err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
		}

		if updateData.ID == 0 {
			return c.JSON(400, map[string]string{"error": "ID is required"})
		}

		var studyText StudyText
		if err := db.First(&studyText, updateData.ID).Error; err != nil {
			return c.JSON(404, map[string]string{"error": "Study text not found"})
		}

		// Update fields
		if updateData.Version != "" {
			studyText.Version = updateData.Version
		}
		if updateData.Content != "" {
			studyText.Content = updateData.Content
		}
		if updateData.FontLeft != "" {
			studyText.FontLeft = updateData.FontLeft
		}
		if updateData.FontRight != "" {
			studyText.FontRight = updateData.FontRight
		}
		if updateData.Active != nil {
			// If setting to active, deactivate all others first
			if *updateData.Active {
				db.Model(&StudyText{}).Where("active = ? AND id != ?", true, updateData.ID).Update("active", false)
			}
			studyText.Active = *updateData.Active
		}

		if err := db.Save(&studyText).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to update study text: " + err.Error()})
		}

		return c.JSON(200, map[string]interface{}{
			"success": true,
			"id":      studyText.ID,
			"message": "Study text updated successfully",
		})

	case "GET":
		// List all study texts
		var studyTexts []StudyText
		if err := db.Order("created_at DESC").Find(&studyTexts).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to fetch study texts: " + err.Error()})
		}

		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    studyTexts,
		})

	default:
		return c.JSON(405, map[string]string{"error": "Method not allowed"})
	}
}

func handleAdminQuizQuestion(c echo.Context) error {
	switch c.Request().Method {
	case "POST":
		// Create new quiz question
		var questionData struct {
			StudyTextID uint     `json:"study_text_id"`
			PassageID   *uint    `json:"passage_id,omitempty"`  // Optional: link to specific passage
			QuestionID  string   `json:"question_id"`
			Prompt      string   `json:"prompt"`
			Choices     []string `json:"choices"`
			Answer      int      `json:"answer"`
			Order       int      `json:"order"`
		}

		if err := c.Bind(&questionData); err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
		}

		// Validate required fields
		if questionData.StudyTextID == 0 || questionData.QuestionID == "" || questionData.Prompt == "" {
			return c.JSON(400, map[string]string{"error": "study_text_id, question_id, and prompt are required"})
		}

		// If passage_id is provided, verify it exists and belongs to the study_text_id
		if questionData.PassageID != nil && *questionData.PassageID > 0 {
			var passage Passage
			if err := db.Where("id = ? AND study_text_id = ?", *questionData.PassageID, questionData.StudyTextID).First(&passage).Error; err != nil {
				return c.JSON(404, map[string]string{"error": "Passage not found or does not belong to the specified study text"})
			}
		}

		// Convert choices to JSON string
		choicesJSON, err := json.Marshal(questionData.Choices)
		if err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid choices format: " + err.Error()})
		}

		question := QuizQuestion{
			StudyTextID: questionData.StudyTextID,
			PassageID:   questionData.PassageID,
			QuestionID:  questionData.QuestionID,
			Prompt:      questionData.Prompt,
			Choices:     string(choicesJSON),
			Answer:      questionData.Answer,
			Order:       questionData.Order,
		}

		if err := db.Create(&question).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to create quiz question: " + err.Error()})
		}

		return c.JSON(201, map[string]interface{}{
			"success": true,
			"id":      question.ID,
			"message": "Quiz question created successfully",
		})

	case "PUT":
		// Update existing quiz question
		var updateData struct {
			ID         uint      `json:"id"`
			PassageID  *uint     `json:"passage_id,omitempty"`  // Optional: can update passage link
			QuestionID string    `json:"question_id,omitempty"`
			Prompt     string    `json:"prompt,omitempty"`
			Choices    []string  `json:"choices,omitempty"`
			Answer     *int      `json:"answer,omitempty"`
			Order      *int      `json:"order,omitempty"`
		}

		if err := c.Bind(&updateData); err != nil {
			return c.JSON(400, map[string]string{"error": "Invalid JSON: " + err.Error()})
		}

		if updateData.ID == 0 {
			return c.JSON(400, map[string]string{"error": "ID is required"})
		}

		var question QuizQuestion
		if err := db.First(&question, updateData.ID).Error; err != nil {
			return c.JSON(404, map[string]string{"error": "Quiz question not found"})
		}

		// If passage_id is being updated, verify it exists and belongs to the study_text_id
		if updateData.PassageID != nil {
			if *updateData.PassageID > 0 {
				var passage Passage
				if err := db.Where("id = ? AND study_text_id = ?", *updateData.PassageID, question.StudyTextID).First(&passage).Error; err != nil {
					return c.JSON(404, map[string]string{"error": "Passage not found or does not belong to the study text"})
				}
			}
			question.PassageID = updateData.PassageID
		}

		// Update fields
		if updateData.QuestionID != "" {
			question.QuestionID = updateData.QuestionID
		}
		if updateData.Prompt != "" {
			question.Prompt = updateData.Prompt
		}
		if updateData.Choices != nil {
			choicesJSON, err := json.Marshal(updateData.Choices)
			if err != nil {
				return c.JSON(400, map[string]string{"error": "Invalid choices format: " + err.Error()})
			}
			question.Choices = string(choicesJSON)
		}
		if updateData.Answer != nil {
			question.Answer = *updateData.Answer
		}
		if updateData.Order != nil {
			question.Order = *updateData.Order
		}

		if err := db.Save(&question).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to update quiz question: " + err.Error()})
		}

		return c.JSON(200, map[string]interface{}{
			"success": true,
			"id":      question.ID,
			"message": "Quiz question updated successfully",
		})

	case "DELETE":
		// Delete quiz question
		id := c.QueryParam("id")
		if id == "" {
			return c.JSON(400, map[string]string{"error": "ID parameter is required"})
		}

		if err := db.Delete(&QuizQuestion{}, id).Error; err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to delete quiz question: " + err.Error()})
		}

		return c.JSON(200, map[string]interface{}{
			"success": true,
			"message": "Quiz question deleted successfully",
		})

	case "GET":
		// Get quiz question(s) - by id, passage_id, or study_text_id
		id := c.QueryParam("id")
		passageID := c.QueryParam("passage_id")
		studyTextID := c.QueryParam("study_text_id")

		if id != "" {
			// Get single quiz question by ID
			var question QuizQuestion
			if err := db.First(&question, id).Error; err != nil {
				return c.JSON(404, map[string]string{"error": "Quiz question not found"})
			}

			// Parse choices JSON
			var choices []string
			json.Unmarshal([]byte(question.Choices), &choices)

			return c.JSON(200, map[string]interface{}{
				"success": true,
				"data": map[string]interface{}{
					"id":           question.ID,
					"study_text_id": question.StudyTextID,
					"passage_id":   question.PassageID,
					"question_id":  question.QuestionID,
					"prompt":       question.Prompt,
					"choices":      choices,
					"answer":       question.Answer,
					"order":        question.Order,
				},
			})
		} else if passageID != "" {
			// Get all quiz questions for a passage
			var questions []QuizQuestion
			if err := db.Where("passage_id = ?", passageID).Order("`order` ASC").Find(&questions).Error; err != nil {
				return c.JSON(500, map[string]string{"error": "Failed to fetch quiz questions: " + err.Error()})
			}

			// Format response
			type QuestionResponse struct {
				ID          uint      `json:"id"`
				StudyTextID uint      `json:"study_text_id"`
				PassageID   *uint     `json:"passage_id"`
				QuestionID  string    `json:"question_id"`
				Prompt      string    `json:"prompt"`
				Choices     []string  `json:"choices"`
				Answer      int       `json:"answer"`
				Order       int       `json:"order"`
			}

			response := make([]QuestionResponse, len(questions))
			for i, q := range questions {
				var choices []string
				json.Unmarshal([]byte(q.Choices), &choices)
				response[i] = QuestionResponse{
					ID:          q.ID,
					StudyTextID: q.StudyTextID,
					PassageID:   q.PassageID,
					QuestionID:  q.QuestionID,
					Prompt:      q.Prompt,
					Choices:     choices,
					Answer:      q.Answer,
					Order:       q.Order,
				}
			}

			return c.JSON(200, map[string]interface{}{
				"success": true,
				"data":    response,
			})
		} else if studyTextID != "" {
			// Get all quiz questions for a study text (including those linked to passages)
			var questions []QuizQuestion
			if err := db.Where("study_text_id = ?", studyTextID).Order("`order` ASC").Find(&questions).Error; err != nil {
				return c.JSON(500, map[string]string{"error": "Failed to fetch quiz questions: " + err.Error()})
			}

			// Format response
			type QuestionResponse struct {
				ID          uint      `json:"id"`
				StudyTextID uint      `json:"study_text_id"`
				PassageID   *uint     `json:"passage_id"`
				QuestionID  string    `json:"question_id"`
				Prompt      string    `json:"prompt"`
				Choices     []string  `json:"choices"`
				Answer      int       `json:"answer"`
				Order       int       `json:"order"`
			}

			response := make([]QuestionResponse, len(questions))
			for i, q := range questions {
				var choices []string
				json.Unmarshal([]byte(q.Choices), &choices)
				response[i] = QuestionResponse{
					ID:          q.ID,
					StudyTextID: q.StudyTextID,
					PassageID:   q.PassageID,
					QuestionID:  q.QuestionID,
					Prompt:      q.Prompt,
					Choices:     choices,
					Answer:      q.Answer,
					Order:       q.Order,
				}
			}

			return c.JSON(200, map[string]interface{}{
				"success": true,
				"data":    response,
			})
		} else {
			return c.JSON(400, map[string]string{"error": "Either id, passage_id, or study_text_id parameter is required"})
		}

	default:
		return c.JSON(405, map[string]string{"error": "Method not allowed"})
	}
}

func handleAdminStatistics(c echo.Context) error {
	type Statistics struct {
		Participants struct {
			Total   int64            `json:"total"`
			BySource map[string]int64 `json:"by_source"`
		} `json:"participants"`
		Sessions struct {
			Total int64 `json:"total"`
		} `json:"sessions"`
		FontPreferences struct {
			Serif int64 `json:"serif"`
			Sans  int64 `json:"sans"`
			Total int64 `json:"total"`
		} `json:"font_preferences"`
		QuizPerformance struct {
			TotalResponses   int64   `json:"total_responses"`
			CorrectAnswers   int64   `json:"correct_answers"`
			AverageAccuracy  float64 `json:"average_accuracy"`
			ByQuestion       map[string]struct {
				Total    int64   `json:"total"`
				Correct  int64   `json:"correct"`
				Accuracy float64 `json:"accuracy"`
			} `json:"by_question"`
		} `json:"quiz_performance"`
		ReadingTimes struct {
			AverageSerif float64 `json:"average_serif_ms"`
			AverageSans  float64 `json:"average_sans_ms"`
			TotalSessions int64  `json:"total_sessions"`
		} `json:"reading_times"`
		AccuracyMeasurements struct {
			Total          int64   `json:"total"`
			AverageAccuracy float64 `json:"average_accuracy"`
			Passed         int64   `json:"passed"`
			Failed         int64   `json:"failed"`
		} `json:"accuracy_measurements"`
		GazePoints struct {
			Total      int64            `json:"total"`
			ByPhase    map[string]int64 `json:"by_phase"`
			ByPanel    map[string]int64 `json:"by_panel"`
		} `json:"gaze_points"`
		CalibrationData struct {
			Total int64 `json:"total"`
		} `json:"calibration_data"`
	}

	var stats Statistics

	// Initialize maps
	stats.Participants.BySource = make(map[string]int64)
	stats.QuizPerformance.ByQuestion = make(map[string]struct {
		Total    int64   `json:"total"`
		Correct  int64   `json:"correct"`
		Accuracy float64 `json:"accuracy"`
	})
	stats.GazePoints.ByPhase = make(map[string]int64)
	stats.GazePoints.ByPanel = make(map[string]int64)

	// Participants
	if err := db.Model(&Participant{}).Count(&stats.Participants.Total).Error; err != nil {
		log.Printf("Error counting participants: %v", err)
	}
	var participantSources []struct {
		Source string
		Count  int64
	}
	if err := db.Model(&Participant{}).Select("source, COUNT(*) as count").Group("source").Scan(&participantSources).Error; err != nil {
		log.Printf("Error getting participant sources: %v", err)
	} else {
		for _, ps := range participantSources {
			stats.Participants.BySource[ps.Source] = ps.Count
		}
	}

	// Sessions
	db.Model(&StudySession{}).Count(&stats.Sessions.Total)

	// Font Preferences
	var serifCount, sansCount int64
	db.Model(&StudySession{}).Where("preferred_font_type = ?", "serif").Count(&serifCount)
	db.Model(&StudySession{}).Where("preferred_font_type = ?", "sans").Count(&sansCount)
	stats.FontPreferences.Serif = serifCount
	stats.FontPreferences.Sans = sansCount
	stats.FontPreferences.Total = serifCount + sansCount

	// Quiz Performance
	db.Model(&QuizResponse{}).Count(&stats.QuizPerformance.TotalResponses)
	var correctCount int64
	db.Model(&QuizResponse{}).Where("is_correct = ?", true).Count(&correctCount)
	stats.QuizPerformance.CorrectAnswers = correctCount
	if stats.QuizPerformance.TotalResponses > 0 {
		stats.QuizPerformance.AverageAccuracy = float64(correctCount) / float64(stats.QuizPerformance.TotalResponses) * 100
	}

	// Quiz by question
	var quizResults []struct {
		QuestionID string
		Total      int64
		Correct    int64
	}
	if err := db.Model(&QuizResponse{}).Select("question_id, COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct").Group("question_id").Scan(&quizResults).Error; err != nil {
		log.Printf("Error getting quiz results: %v", err)
	} else {
		for _, result := range quizResults {
			accuracy := 0.0
			if result.Total > 0 {
				accuracy = float64(result.Correct) / float64(result.Total) * 100
			}
			stats.QuizPerformance.ByQuestion[result.QuestionID] = struct {
				Total    int64   `json:"total"`
				Correct  int64   `json:"correct"`
				Accuracy float64 `json:"accuracy"`
			}{Total: result.Total, Correct: result.Correct, Accuracy: accuracy}
		}
	}

	// Reading Times
	var avgSerif, avgSans float64
	var sessionCount int64
	db.Model(&StudySession{}).Where("time_left_ms > 0 OR time_right_ms > 0").Count(&sessionCount)
	if sessionCount > 0 {
		// Calculate average serif reading time
		var serifTimes []int
		db.Model(&StudySession{}).Where("font_left = ? AND time_left_ms > 0", "serif").Pluck("time_left_ms", &serifTimes)
		db.Model(&StudySession{}).Where("font_right = ? AND time_right_ms > 0", "serif").Pluck("time_right_ms", &serifTimes)
		if len(serifTimes) > 0 {
			var sum int
			for _, t := range serifTimes {
				sum += t
			}
			avgSerif = float64(sum) / float64(len(serifTimes))
		}
		// Calculate average sans reading time
		var sansTimes []int
		db.Model(&StudySession{}).Where("font_left = ? AND time_left_ms > 0", "sans").Pluck("time_left_ms", &sansTimes)
		db.Model(&StudySession{}).Where("font_right = ? AND time_right_ms > 0", "sans").Pluck("time_right_ms", &sansTimes)
		if len(sansTimes) > 0 {
			var sum int
			for _, t := range sansTimes {
				sum += t
			}
			avgSans = float64(sum) / float64(len(sansTimes))
		}
	}
	stats.ReadingTimes.AverageSerif = avgSerif
	stats.ReadingTimes.AverageSans = avgSans
	stats.ReadingTimes.TotalSessions = sessionCount

	// Accuracy Measurements
	var avgAccuracy float64
	var passedCount, failedCount int64
	db.Model(&AccuracyMeasurement{}).Count(&stats.AccuracyMeasurements.Total)
	db.Model(&AccuracyMeasurement{}).Select("AVG(accuracy)").Scan(&avgAccuracy)
	db.Model(&AccuracyMeasurement{}).Where("passed = ?", true).Count(&passedCount)
	db.Model(&AccuracyMeasurement{}).Where("passed = ?", false).Count(&failedCount)
	stats.AccuracyMeasurements.AverageAccuracy = avgAccuracy
	stats.AccuracyMeasurements.Passed = passedCount
	stats.AccuracyMeasurements.Failed = failedCount

	// Gaze Points
	if err := db.Model(&GazePoint{}).Count(&stats.GazePoints.Total).Error; err != nil {
		log.Printf("Error counting gaze points: %v", err)
	}
	var phaseCounts []struct {
		Phase string
		Count int64
	}
	if err := db.Model(&GazePoint{}).Select("phase, COUNT(*) as count").Where("phase IS NOT NULL AND phase != ''").Group("phase").Scan(&phaseCounts).Error; err != nil {
		log.Printf("Error getting phase counts: %v", err)
	} else {
		for _, pc := range phaseCounts {
			stats.GazePoints.ByPhase[pc.Phase] = pc.Count
		}
	}
	var panelCounts []struct {
		Panel string
		Count int64
	}
	if err := db.Model(&GazePoint{}).Select("panel, COUNT(*) as count").Where("panel IS NOT NULL AND panel != ''").Group("panel").Scan(&panelCounts).Error; err != nil {
		log.Printf("Error getting panel counts: %v", err)
	} else {
		for _, pc := range panelCounts {
			stats.GazePoints.ByPanel[pc.Panel] = pc.Count
		}
	}

	// Calibration Data
	db.Model(&CalibrationData{}).Count(&stats.CalibrationData.Total)

	return c.JSON(200, map[string]interface{}{
		"success": true,
		"data":    stats,
	})
}

