import db from './supabase/database';
import geminiService, { GeminiError } from './gemini/gemini.service';

export async function processLectureWithAI(lectureId: string, userId: string) {
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
    const transcript = lecture.transcript;

    // 4. Extract concepts
    console.log(`[AI Pipeline] Extracting concepts for lecture ${lectureId}...`);
    const conceptsData = await geminiService.extractConcepts(transcript);

    // 5. Save concepts
    const savedConcepts = await db.saveConcepts(lectureId, conceptsData);

    // 6. Generate Summary
    console.log(`[AI Pipeline] Generating summary for lecture ${lectureId}...`);
    const summaryData = await geminiService.generateSummary(transcript);
    await db.saveSummary(lectureId, summaryData);

    // 7. Generate Concept Explanations
    console.log(`[AI Pipeline] Generating concept explanations for lecture ${lectureId}...`);
    const explanationsData = await geminiService.generateConceptExplanations(
      transcript,
      savedConcepts.map((c) => ({ name: c.name, description: c.description }))
    );
    await db.updateConceptExplanations(lectureId, explanationsData);

    // 8. Generate Flashcards
    console.log(`[AI Pipeline] Generating flashcards for lecture ${lectureId}...`);
    const flashcardsData = await geminiService.generateFlashcards(
      transcript,
      savedConcepts.map((c) => ({ name: c.name }))
    );
    const savedFlashcards = await db.saveFlashcards(
      lectureId,
      flashcardsData.map((f) => ({
        question: f.question,
        answer: f.answer,
        conceptName: f.conceptName,
        difficulty: f.difficulty,
      })),
      savedConcepts
    );

    // 9. Generate Quiz
    console.log(`[AI Pipeline] Generating quiz for lecture ${lectureId}...`);
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
