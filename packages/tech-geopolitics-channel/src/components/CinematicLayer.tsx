import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { ScriptLine, TimelineEntry, ChapterType } from '../utils/types';

interface CinematicLayerProps {
  currentLine: ScriptLine | null;
  currentEntry: TimelineEntry | null;
  chapterType: ChapterType | null;
}

/**
 * CinematicLayer — 映像品質向上のためのシネマティック演出レイヤー
 *
 * - Vignette: 常時表示する周辺光量落ち（プロ映像らしい質感）
 * - Impact Flash: surprised/highlight 瞬間の白フラッシュ（衝撃演出）
 * - Cinematic Bars: hook・analysis チャプターのシネマレターボックス風グラデバー
 */
export const CinematicLayer: React.FC<CinematicLayerProps> = ({
  currentLine,
  currentEntry,
  chapterType,
}) => {
  const frame = useCurrentFrame();

  // ─── Impact Flash ────────────────────────────
  const isImpact =
    currentLine?.emotion === 'surprised' ||
    currentLine?.visual?.type === 'highlight';
  const localFrame = currentEntry ? frame - currentEntry.startFrame : 0;
  const flashOpacity = isImpact
    ? interpolate(localFrame, [0, 2, 10], [0.72, 0.35, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // ─── Cinematic Bars (hook / analysis のみ) ───
  const dramaticChapter = chapterType === 'hook' || chapterType === 'analysis';

  return (
    <>
      {/* Vignette — 常時。周辺光量落ちで映像らしい質感に */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 48,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 88% 82% at 50% 50%, transparent 42%, rgba(0,0,0,0.52) 100%)',
        }}
      />

      {/* Cinematic Bars — hook/analysis チャプターで映画的フレーミング */}
      {dramaticChapter && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 58,
              zIndex: 47,
              pointerEvents: 'none',
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 70%, transparent 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 58,
              zIndex: 47,
              pointerEvents: 'none',
              background:
                'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 70%, transparent 100%)',
            }}
          />
        </>
      )}

      {/* Impact Flash — surprised / highlight 瞬間の白フラッシュ */}
      {flashOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            pointerEvents: 'none',
            backgroundColor: `rgba(255,255,255,${flashOpacity})`,
          }}
        />
      )}
    </>
  );
};

export default CinematicLayer;
