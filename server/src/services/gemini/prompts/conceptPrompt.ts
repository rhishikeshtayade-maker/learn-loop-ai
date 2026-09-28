export function getConceptPrompt(transcript: string): string {
  return `You are an expert AI educational assistant.
Analyze the following lecture transcript and extract 5 to 15 key educational concepts.

CRITICAL INSTRUCTIONS:
1. Base all concepts strictly on the supplied transcript. Do NOT invent external concepts.
2. Identify core conceptual ideas rather than generic keywords.
3. For each concept, assign an importance level ("HIGH", "MEDIUM", or "LOW").
4. Return ONLY a valid JSON array of concept objects with NO extra text or markdown wrap.

Schema for each concept:
[
  {
    "name": "Concept Name",
    "description": "Clear 1-2 sentence description strictly grounded in transcript",
    "importance": "HIGH" | "MEDIUM" | "LOW",
    "timestampStart": null,
    "timestampEnd": null
  }
]

Transcript:
"""
${transcript}
"""`;
}
