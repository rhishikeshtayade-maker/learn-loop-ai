export function getFlashcardPrompt(transcript: string, concepts: Array<{ name: string }>): string {
  const conceptNames = concepts.map((c) => c.name).join(', ');

  return `You are an expert AI educational assistant specialized in active recall testing.
Generate 5 to 12 active-recall flashcards based on the provided lecture transcript and key concepts.

CRITICAL INSTRUCTIONS:
1. Avoid exact sentence copying, trivial wording, and duplicate questions.
2. Ensure answers are clear, direct, concise, and unambiguously supported by the transcript.
3. Assign a difficulty rating ("EASY", "MEDIUM", or "HARD").
4. Return ONLY a valid JSON array of flashcard objects with NO extra text or markdown wrap.

Target Concepts: ${conceptNames}

Schema:
[
  {
    "question": "Targeted active-recall question",
    "answer": "Clear, concise, accurate answer",
    "conceptName": "Matching concept name from list",
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }
]

Transcript:
"""
${transcript}
"""`;
}
