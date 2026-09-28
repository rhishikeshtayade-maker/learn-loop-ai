export function getQuizPrompt(transcript: string, concepts: Array<{ name: string }>): string {
  const conceptNames = concepts.map((c) => c.name).join(', ');

  return `You are an expert AI educational test author.
Generate 5 to 10 multiple-choice quiz questions based on the provided lecture transcript.

CRITICAL INSTRUCTIONS:
1. Every question must have EXACTLY 4 options array: ["Option A", "Option B", "Option C", "Option D"].
2. Exactly ONE option must be correct. Specify "correctAnswer" as the 0-indexed integer (0 for first option, 1 for second option, 2 for third option, 3 for fourth option).
3. Do NOT produce duplicate options.
4. Ensure the correct answer is firmly supported by the transcript text.
5. Provide a thorough "explanation" describing why the correct answer is right.
6. Return ONLY a valid JSON array of quiz question objects with NO extra text or markdown wrap.

Target Concepts: ${conceptNames}

Schema:
[
  {
    "question": "Clear, precise multiple choice question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct",
    "conceptName": "Matching concept name",
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }
]

Transcript:
"""
${transcript}
"""`;
}
