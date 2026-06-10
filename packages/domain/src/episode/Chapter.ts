import type { ChapterType } from './primitives';
import type { ScriptLine } from './ScriptLine';

export interface Chapter {
  type: ChapterType;
  duration: number;
  lines: ScriptLine[];
  topic?: string;
}
