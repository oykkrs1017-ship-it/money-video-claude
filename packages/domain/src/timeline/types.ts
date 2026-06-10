import type { ScriptLine } from '../episode/ScriptLine';

export interface TimelineEntry {
  chapterIndex: number;
  lineIndex: number;
  line: ScriptLine;
  startFrame: number;
  endFrame: number;
}

export interface TimelineResult {
  timeline: TimelineEntry[];
  totalFrames: number;
  titleFrames: number;
}
