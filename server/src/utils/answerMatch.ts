/**
 * Smart answer matching utility for comparing student typed answers with quiz answers.
 * Supports formulas, mathematical operators (×, *, ·), option letters (A, B, C, D),
 * case-insensitive matching, and semantic word token overlap.
 */
export function isAnswerMatch(
  studentAnswer: string | number,
  correctAnswerText: string,
  options?: string[],
  correctAnswerIndex?: number
): boolean {
  if (studentAnswer === undefined || studentAnswer === null) return false;

  // Numeric index matching
  if (typeof studentAnswer === 'number') {
    if (correctAnswerIndex !== undefined && studentAnswer === correctAnswerIndex) return true;
    if (options && options[studentAnswer]) {
      return isAnswerMatch(options[studentAnswer], correctAnswerText);
    }
    return false;
  }

  const rawStudent = String(studentAnswer).trim();
  if (!rawStudent || !correctAnswerText) return false;

  // Exact or normalized case-insensitive equality
  const sLower = rawStudent.toLowerCase().trim();
  const cLower = correctAnswerText.toLowerCase().trim();
  if (sLower === cLower) return true;

  // Option letter matching: "A", "B", "C", "D", "Option A", "Option 1"
  const letterMatch = sLower.match(/^(?:option\s+)?([a-d])$/i);
  if (letterMatch && options && options.length > 0) {
    const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (correctAnswerIndex !== undefined && idx === correctAnswerIndex) return true;
    if (options[idx]) {
      return isAnswerMatch(options[idx], correctAnswerText);
    }
  }

  const numberOptionMatch = sLower.match(/^(?:option\s+)?([1-4])$/i);
  if (numberOptionMatch && options && options.length > 0) {
    const idx = parseInt(numberOptionMatch[1], 10) - 1;
    if (correctAnswerIndex !== undefined && idx === correctAnswerIndex) return true;
    if (options[idx]) {
      return isAnswerMatch(options[idx], correctAnswerText);
    }
  }

  // Formula & math expression normalization
  // replace ×, *, · with x, remove spaces and brackets
  const normalizeMath = (str: string) =>
    str
      .toLowerCase()
      .replace(/[×*·•]/g, 'x')
      .replace(/\s+/g, '')
      .replace(/[\(\)\[\]\{\}]/g, '')
      .replace(/[^a-z0-9x=+-]/g, '');

  const sMath = normalizeMath(sLower);
  const cMath = normalizeMath(cLower);

  if (sMath && cMath && sMath === cMath) return true;
  if (sMath.length >= 3 && (cMath.includes(sMath) || sMath.includes(cMath))) return true;

  // Semantic keyword token overlap for descriptive answers
  const sWords = sLower.split(/[\s,.;:!?\(\)\-\/]+/).filter((w) => w.length > 2);
  const cWords = cLower.split(/[\s,.;:!?\(\)\-\/]+/).filter((w) => w.length > 2);

  if (cWords.length > 0 && sWords.length > 0) {
    const matchingCount = sWords.filter((w) => cWords.includes(w)).length;
    // If student mentions at least 60% of key words in the correct answer
    if (matchingCount / cWords.length >= 0.6) return true;
    // Or if all student words are in correct answer and there are at least 2 words
    if (sWords.length >= 2 && matchingCount === sWords.length) return true;
  }

  return false;
}
