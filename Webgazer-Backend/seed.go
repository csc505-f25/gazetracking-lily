package main

import (
	"log"
)

// seedInitialData populates the database with initial study text and quiz questions
func seedInitialData() {
	// Check if study text already exists
	var count int64
	db.Model(&StudyText{}).Count(&count)
	if count > 0 {
		return // Data already seeded
	}

	// Create study text
	studyText := StudyText{
		Version:   "default",
		Content:   `Reading is a complex cognitive process that involves decoding symbols to derive meaning.
This brief passage is used purely for testing font readability and basic comprehension.
Try to read at a natural pace without skimming, and focus on understanding the content.`,
		FontLeft:  "serif",
		FontRight: "sans",
		Active:    true,
	}

	if err := db.Create(&studyText).Error; err != nil {
		log.Printf("Error creating study text: %v", err)
		return
	}

	// Create quiz questions
	questions := []QuizQuestion{
		{
			StudyTextID: studyText.ID,
			QuestionID:  "q1",
			Prompt:      "What is the purpose of this passage?",
			Choices:     `["To teach advanced speed-reading","To test font readability and comprehension","To explain eye-tracking algorithms","To measure typing accuracy"]`,
			Answer:      1,
			Order:       1,
		},
		{
			StudyTextID: studyText.ID,
			QuestionID:  "q2",
			Prompt:      "How should you read the passage?",
			Choices:     `["As quickly as possible without understanding","Only the first sentence","At a natural pace focusing on understanding","Backwards to test attention"]`,
			Answer:      2,
			Order:       2,
		},
		{
			StudyTextID: studyText.ID,
			QuestionID:  "q3",
			Prompt:      "According to the passage, what does reading involve?",
			Choices:     `["Only recognizing letters","Decoding symbols to derive meaning","Memorizing text word-for-word","Counting words per minute"]`,
			Answer:      1,
			Order:       3,
		},
		{
			StudyTextID: studyText.ID,
			QuestionID:  "q4",
			Prompt:      "What should you avoid when reading this passage?",
			Choices:     `["Reading at a natural pace","Focusing on understanding","Skimming through the content","Decoding the symbols"]`,
			Answer:      2,
			Order:       4,
		},
		{
			StudyTextID: studyText.ID,
			QuestionID:  "q5",
			Prompt:      "What is described as a \"complex cognitive process\"?",
			Choices:     `["Writing","Reading","Speaking","Listening"]`,
			Answer:      1,
			Order:       5,
		},
	}

	for _, q := range questions {
		if err := db.Create(&q).Error; err != nil {
			log.Printf("Error creating quiz question %s: %v", q.QuestionID, err)
		}
	}

	log.Println("Initial study data seeded successfully")
}

