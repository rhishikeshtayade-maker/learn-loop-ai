export function getRelationshipPrompt(
  transcript: string,
  concepts: Array<{ id: string; name: string; description: string }>
): string {
  const conceptList = concepts
    .map((c, i) => `${i + 1}. ID: "${c.id}" | Name: "${c.name}" | Description: "${c.description}"`)
    .join('\n');

  return `You are an expert AI educational curriculum and knowledge graph architect.
Analyze the provided lecture transcript and the extracted concepts.
Identify meaningful directed relationships between these concepts based STRICTLY on the lecture content.

CRITICAL INSTRUCTIONS:
1. ONLY establish relationships between the concepts in the provided list. Use their EXACT IDs provided below.
2. Supported relationship types:
   - "PREREQUISITE": Source concept must be understood before target concept can be grasped (e.g. Electric Current is a PREREQUISITE for Magnetic Field).
   - "RELATED_TO": Source and target concepts share core conceptual principles or are applied together.
   - "PART_OF": Source concept is a sub-component or mechanism of target concept.
   - "LEADS_TO": Understanding source concept directly introduces or logically progresses to target concept.
   - "APPLICATION_OF": Source concept is a practical use-case or demonstration of target concept.
3. Do NOT invent relationships between unrelated concepts just to make the graph larger.
4. Only create relationships that are firmly supported by the lecture. Aim for 3 to 15 meaningful connections depending on concept count.
5. In "description", provide a clear 1-sentence pedagogical reason for why this relationship exists.
6. Provide "confidence" as a float between 0.6 and 1.0.
7. Return ONLY a valid JSON array of relationship objects with NO extra text or markdown wrap.

Concepts in this lecture:
${conceptList}

JSON Schema:
[
  {
    "sourceConceptId": "id-from-list-above",
    "targetConceptId": "id-from-list-above",
    "relationshipType": "PREREQUISITE" | "RELATED_TO" | "PART_OF" | "LEADS_TO" | "APPLICATION_OF",
    "confidence": 0.95,
    "description": "Clear 1-sentence reason why this relationship holds in this lecture"
  }
]

Transcript:
"""
${transcript}
"""`;
}

export function getExploreConceptPrompt(
  conceptName: string,
  conceptDesc: string,
  lectureTitle: string,
  transcriptSnippet: string
): string {
  return `You are an expert AI tutor. A student is exploring the concept "${conceptName}" from the lecture "${lectureTitle}".
Provide deep discovery insights to help them understand this concept thoroughly.

Instructions:
1. "summary": A concise 2-sentence intuition on what makes this concept vital.
2. "prerequisites": 2-4 foundational ideas required to grasp this concept.
3. "realWorldApplications": 2-4 concrete, exciting real-world applications or engineering use cases.
4. "suggestedQuestions": 2-3 thought-provoking questions to test their conceptual intuition.
5. "keyInsights": 2-3 counter-intuitive takeaways or crucial principles.
6. Return ONLY valid JSON adhering to the schema below.

JSON Schema:
{
  "conceptName": "${conceptName}",
  "summary": "...",
  "prerequisites": ["..."],
  "realWorldApplications": ["..."],
  "suggestedQuestions": ["..."],
  "keyInsights": ["..."]
}

Concept Description: ${conceptDesc}
Lecture Context:
"""
${transcriptSnippet}
"""`;
}
