export function getExplanationPrompt(transcript: string, concepts: Array<{ name: string; description: string }>): string {
  const conceptListStr = concepts.map((c) => `- ${c.name}: ${c.description}`).join('\n');

  return `You are an expert AI educational tutor.
For each concept listed below, provide an in-depth explanation grounded strictly in the provided lecture transcript.

CRITICAL INSTRUCTIONS:
1. Do NOT introduce unsupported technical claims.
2. Keep examples and explanations clearly derived from available lecture content.
3. Return ONLY a valid JSON array of objects with NO extra text or markdown wrap.

Concepts to explain:
${conceptListStr}

Schema:
[
  {
    "conceptName": "Exact Concept Name from list",
    "simpleExplanation": "Simple 1-2 sentence explanation an absolute beginner can understand",
    "detailedExplanation": "Comprehensive explanation breaking down the mechanics and importance",
    "example": "Clear example illustrating the concept based on the lecture",
    "commonMisconception": "Common student misunderstanding or pitfall related to this concept",
    "keyTakeaway": "Single core takeaway to remember"
  }
]

Transcript:
"""
${transcript}
"""`;
}
