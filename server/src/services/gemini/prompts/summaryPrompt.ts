export function getSummaryPrompt(transcript: string): string {
  return `You are an expert AI educational assistant.
Generate a structured, comprehensive summary of the following lecture transcript.

CRITICAL INSTRUCTIONS:
1. Base all content strictly on the transcript. Do NOT invent facts or external information.
2. If a category (e.g., formulasOrRules or prerequisites) is not present or relevant, return an empty array [] for that category.
3. Return ONLY a valid JSON object with NO extra text or markdown wrap.

Schema:
{
  "overview": "Clear 2-4 sentence high-level overview of the entire lecture",
  "keyTakeaways": ["Bullet point 1", "Bullet point 2", ...],
  "importantDefinitions": ["Term: Definition...", ...],
  "importantFacts": ["Fact 1...", ...],
  "formulasOrRules": ["Formula/Rule 1...", ...],
  "prerequisites": ["Prerequisite 1...", ...]
}

Transcript:
"""
${transcript}
"""`;
}
