export function getFlashcardPrompt(transcript: string, concepts: Array<{ name: string }>): string {
  const conceptNames = concepts.map((c) => c.name).join(', ');

  return `You are an expert AI educational assistant specialized in active recall testing.
Generate 5 to 12 active-recall multiple-choice flashcards based on the provided lecture transcript and key concepts.

CRITICAL INSTRUCTIONS:
1. Avoid exact sentence copying, trivial wording, and duplicate questions.
2. For each flashcard, provide exactly 4 multiple-choice options ("options").
3. One option must be strictly correct and Supported by the transcript. The other 3 must be plausible but incorrect distractors.
4. Set "correctAnswer" to the 0-indexed integer (0, 1, 2, or 3) corresponding to the correct option in the "options" array.
5. Provide a clear "explanation" explaining why the correct answer is right.
6. Assign a difficulty rating ("EASY", "MEDIUM", or "HARD").
7. Return ONLY a valid JSON array of flashcard objects with NO extra text or markdown wrap.

Target Concepts: ${conceptNames}

Schema:
[
  {
    "question": "Targeted active-recall question",
    "answer": "Option A text",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": 0,
    "explanation": "Clear explanation of why this answer is correct",
    "conceptName": "Matching concept name from list",
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }
]

Transcript:
"""
${transcript}
"""`;
}
