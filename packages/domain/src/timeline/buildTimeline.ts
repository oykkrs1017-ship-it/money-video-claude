import type { ScriptInput } from '../episode/ScriptInput';
import type { TimelineEntry, TimelineResult } from './types';

const DEFAULT_AUDIO_DURATION_SEC = 3;
const FRAME_BUFFER = 5;
const TITLE_CHAR_FRAMES = 3;
const TITLE_MIN_SECONDS = 3;
const TAIL_SECONDS = 2;

export function buildTimeline(
  scriptInput: ScriptInput,
  fps: number,
): TimelineResult {
  const timeline: TimelineEntry[] = [];
  const titleFrames = scriptInput.hideTitleCard
    ? 0
    : Math.max(
        fps * TITLE_MIN_SECONDS,
        scriptInput.title.length * TITLE_CHAR_FRAMES + fps,
      );
  let cursor = titleFrames;

  scriptInput.chapters.forEach((chapter, chapterIndex) => {
    chapter.lines.forEach((line, lineIndex) => {
      const frameDuration =
        line.frameCount ??
        Math.floor((line.audioDuration ?? DEFAULT_AUDIO_DURATION_SEC) * fps) +
          FRAME_BUFFER;
      timeline.push({
        chapterIndex,
        lineIndex,
        line,
        startFrame: cursor,
        endFrame: cursor + frameDuration,
      });
      cursor += frameDuration;
    });
  });

  return {
    timeline,
    totalFrames: cursor + fps * TAIL_SECONDS,
    titleFrames,
  };
}
