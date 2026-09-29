import db from './supabase/database';
import geminiService, { GeminiError } from './gemini/gemini.service';

const MAX_TRANSCRIPT_LENGTH = 50000;

export async function processLectureWithAI(lectureId: string, userId: string) {
  console.log(`[AI Pipeline] AI generation started for lectureId: ${lectureId}, userId: ${userId}`);

  // 1. Verify user owns lecture
  const lecture = await db.getLectureById(lectureId, userId);
  if (!lecture) {
    throw new Error('Lecture not found or access denied');
  }

  // 2. Verify transcript exists and status is COMPLETED or AI_COMPLETED
  if (!lecture.transcript || lecture.transcript.trim().length === 0) {
    throw new Error('Lecture transcript is empty or unavailable for AI processing');
  }

  if (lecture.status === 'AI_PROCESSING') {
    throw new Error('AI processing is already in progress for this lecture');
  }

  // 3. Mark status as AI_PROCESSING
  await db.updateLectureStatus(lectureId, 'AI_PROCESSING', null);

  try {
    let transcript = lecture.transcript;
    console.log(`[AI Pipeline] Transcript retrieved. Initial character count: ${transcript.length}`);

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      console.warn(
        `[AI Pipeline] Transcript character count (${transcript.length}) exceeds max limit (${MAX_TRANSCRIPT_LENGTH}). Truncating for AI model.`
      );
      transcript = transcript.slice(0, MAX_TRANSCRIPT_LENGTH);
    }

    // 4. Extract concepts
    console.log(`[AI Pipeline] Step 1/5: Extracting concepts for lecture ${lectureId}...`);
    const conceptsData = await geminiService.extractConcepts(transcript);

    // 5. Save concepts
    console.log(`[AI Pipeline] Saving ${conceptsData.length} concepts to database...`);
    const savedConcepts = await db.saveConcepts(lectureId, conceptsData);

    // 6. Generate Summary
    console.log(`[AI Pipeline] Step 2/5: Generating summary for lecture ${lectureId}...`);
    const summaryData = await geminiService.generateSummary(transcript);
    await db.saveSummary(lectureId, summaryData);

    // 7. Generate Concept Explanations
    console.log(`[AI Pipeline] Step 3/5: Generating concept explanations for lecture ${lectureId}...`);
    const explanationsData = await geminiService.generateConceptExplanations(
      transcript,
      savedConcepts.map((c) => ({ name: c.name, description: c.description }))
    );
    await db.updateConceptExplanations(lectureId, explanationsData);

    // 8. Generate Flashcards
    console.log(`[AI Pipeline] Step 4/5: Generating flashcards for lecture ${lectureId}...`);
    const flashcardsData = await geminiService.generateFlashcards(
      transcript,
      savedConcepts.map((c) => ({ name: c.name }))
    );
    const savedFlashcards = await db.saveFlashcards(
      lectureId,
      flashcardsData.map((f) => ({
        question: f.question,
        options: f.options,
        correctAnswer: f.correctAnswer,
        explanation: f.explanation,
        answer: f.options?.[f.correctAnswer] || '',
        conceptName: f.conceptName,
        difficulty: f.difficulty,
      })),
      savedConcepts
    );

    // 9. Generate Quiz
    console.log(`[AI Pipeline] Step 5/5: Generating quiz for lecture ${lectureId}...`);
    const quizData = await geminiService.generateQuiz(
      transcript,
      savedConcepts.map((c) => ({ name: c.name }))
    );
    const savedQuiz = await db.saveQuiz(
      lectureId,
      `Quiz: ${lecture.title}`,
      quizData.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        conceptName: q.conceptName,
        difficulty: q.difficulty,
      })),
      savedConcepts
    );

    // 10. Mark status as AI_COMPLETED
    await db.updateLectureStatus(lectureId, 'AI_COMPLETED', null);

    console.log(`[AI Pipeline] AI processing successfully completed for lecture ${lectureId}`);
    return {
      success: true,
      message: 'AI learning content generated successfully',
      counts: {
        concepts: savedConcepts.length,
        flashcards: savedFlashcards.length,
        quizQuestions: savedQuiz.questions.length,
      },
    };
  } catch (err: any) {
    const safeErrorMsg = err instanceof GeminiError ? err.message : (err?.message || 'AI generation failed');
    console.error(`[AI Pipeline Error] ${safeErrorMsg}`);

    // Revert status to COMPLETED so user can retry
    await db.updateLectureStatus(lectureId, 'COMPLETED', safeErrorMsg);

    throw new Error(safeErrorMsg);
  }
}
