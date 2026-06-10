import type { Episode, Section, DialogueLine } from '../../types/episode';
import { TRANSITION_FRAMES, CTA_FRAMES } from '../../utils/frameCalculator';

export interface TimelineEntry {
  sectionIndex: number;
  lineIndex: number;
  section: Section;
  line: DialogueLine;
  startFrame: number;
  endFrame: number;
}

export interface SectionTiming {
  sectionIndex: number;
  section: Section;
  startFrame: number;
  endFrame: number;
  /** セクションの役割（role フィールドまたはセクション名から推定） */
  role: string;
}

export interface TimelineResult {
  entries: TimelineEntry[];
  sectionTimings: SectionTiming[];
  totalFrames: number;
  ctaStartFrame: number;
}

/** セクション名からロールを推定（section.role が未設定の場合のフォールバック） */
function inferRole(section: Section, index: number): string {
  if (section.role) return section.role;
  if (index === 0) return 'hook';
  const name = section.name.toLowerCase();
  if (name.includes('hook') || name.includes('フック')) return 'hook';
  if (name.includes('data') || name.includes('データ') || name.includes('グラフ')) return 'data';
  if (name.includes('conclu') || name.includes('まとめ') || name.includes('結論')) return 'conclusion';
  if (name.includes('cta') || name.includes('告知')) return 'cta';
  return 'explanation';
}

export function buildTimeline(episode: Episode): TimelineResult {
  const entries: TimelineEntry[] = [];
  const sectionTimings: SectionTiming[] = [];
  let currentFrame = 0;

  episode.sections.forEach((section, si) => {
    const sectionStart = currentFrame;

    section.lines.forEach((line, li) => {
      const durationFrames = line.durationFrames ?? 60;
      entries.push({
        sectionIndex: si,
        lineIndex: li,
        section,
        line,
        startFrame: currentFrame,
        endFrame: currentFrame + durationFrames,
      });
      currentFrame += durationFrames;
    });

    sectionTimings.push({
      sectionIndex: si,
      section,
      startFrame: sectionStart,
      endFrame: currentFrame,
      role: inferRole(section, si),
    });

    // セクション間トランジション（最後のセクション除く）
    if (si < episode.sections.length - 1) {
      currentFrame += TRANSITION_FRAMES;
    }
  });

  const ctaStartFrame = currentFrame;
  currentFrame += CTA_FRAMES;

  return { entries, sectionTimings, totalFrames: currentFrame, ctaStartFrame };
}
