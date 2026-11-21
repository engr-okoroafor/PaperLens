export interface HighlightSegment {
  text: string;
  hit: boolean;
}

export function highlight(text: string, terms: readonly string[]): HighlightSegment[] {
  const needles = [...new Set(terms.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1))].sort(
    (left, right) => right.length - left.length,
  );
  if (!text || needles.length === 0) {
    return [{ text, hit: false }];
  }
  const lower = text.toLowerCase();
  const marks: Array<{ start: number; end: number }> = [];
  for (const needle of needles) {
    let index = 0;
    while (index < lower.length) {
      const found = lower.indexOf(needle, index);
      if (found < 0) {
        break;
      }
      marks.push({ start: found, end: found + needle.length });
      index = found + needle.length;
    }
  }
  marks.sort((left, right) => left.start - right.start || right.end - left.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const mark of marks) {
    const last = merged[merged.length - 1];
    if (!last || mark.start > last.end) {
      merged.push({ ...mark });
    } else {
      last.end = Math.max(last.end, mark.end);
    }
  }
  if (merged.length === 0) {
    return [{ text, hit: false }];
  }
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const mark of merged) {
    if (mark.start > cursor) {
      segments.push({ text: text.slice(cursor, mark.start), hit: false });
    }
    segments.push({ text: text.slice(mark.start, mark.end), hit: true });
    cursor = mark.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), hit: false });
  }
  return segments;
}
