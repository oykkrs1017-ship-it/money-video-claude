import type { EmotionType, SpeakerType } from './primitives';
import type { Visual } from './Visual';

export interface ScriptLine {
  speaker: SpeakerType;
  text: string;
  emotion: EmotionType;
  audioFile?: string;
  audioDuration?: number;
  frameCount?: number;
  visual?: Visual;
  se?: string;
}
