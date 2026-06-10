import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';

interface AudioTrackProps {
  timeline: {
    startFrame: number;
    endFrame: number;
    line: {
      audioFile?: string;
      frameCount?: number;
      se?: string;
    };
  }[];
  bgm?: string;
  bgmMap?: {
    hook?: string;
    explanation?: string;
    analysis?: string;
    summary?: string;
    cta?: string;
  };
  bgmVolume?: number;
  seVolume?: number;
  totalFrames: number;
  chapters: {
    type: string;
  }[];
  chapterTimeline: {
    chapterIndex: number;
    startFrame: number;
    endFrame: number;
  }[];
}

export const AudioTrack: React.FC<AudioTrackProps> = ({
  timeline,
  bgm,
  bgmMap,
  bgmVolume,
  seVolume,
  totalFrames,
  chapters,
  chapterTimeline,
}) => {
  const { fps } = useVideoConfig();
  const baseVolume = bgmVolume ?? 0.12;
  const crossFade = fps * 1; // クロスフェード: 1秒

  // ---- BGM（チャプター別切り替え） ----
  const renderBgm = () => {
    // bgmMap がある場合はチャプター別に切り替え
    if (bgmMap) {
      type BgmSegment = { src: string; start: number; end: number };
      const segments: BgmSegment[] = [];

      chapters.forEach((chapter, ci) => {
        const src = bgmMap[chapter.type as keyof typeof bgmMap];
        if (!src) return;
        const chapterEntries = chapterTimeline.filter((e) => e.chapterIndex === ci);
        if (chapterEntries.length === 0) return;
        const firstEntry = chapterEntries[0];
        const lastEntry = chapterEntries[chapterEntries.length - 1];
        segments.push({ src, start: firstEntry.startFrame, end: lastEntry.endFrame });
      });

      // 同じBGMが連続する場合は結合（章をまたいでもループが途切れない）
      const merged: BgmSegment[] = [];
      for (const seg of segments) {
        const prev = merged[merged.length - 1];
        if (prev && prev.src === seg.src) {
          prev.end = seg.end;
        } else {
          merged.push({ ...seg });
        }
      }

      return merged.map((seg, i) => {
        const duration = seg.end - seg.start;
        return (
          <Sequence key={i} from={seg.start} durationInFrames={duration}>
            <Audio
              src={staticFile(seg.src)}
              loop
              volume={(f) => {
                // チャプター先頭でフェードイン
                const fadeIn = Math.min(f / crossFade, 1);
                // チャプター末尾でフェードアウト
                const fadeOut = Math.min((duration - f) / crossFade, 1);
                // 動画全体の末尾でもフェードアウト
                const globalFadeOut = Math.min((totalFrames - (seg.start + f)) / crossFade, 1);
                return Math.min(fadeIn, fadeOut, globalFadeOut) * baseVolume;
              }}
            />
          </Sequence>
        );
      });
    }

    // bgmMap なし → 全編共通BGM（後方互換）
    if (!bgm) return null;
    const fadeFrames = fps * 2;
    return (
      <Audio
        src={staticFile(bgm)}
        loop
        volume={(f) => {
          const fadeIn = Math.min(f / fadeFrames, 1);
          const fadeOut = Math.min((totalFrames - f) / fadeFrames, 1);
          return Math.min(fadeIn, fadeOut) * baseVolume;
        }}
      />
    );
  };

  // ---- SE（効果音） ----
  const renderSe = () => {
    const vol = seVolume ?? 0.5;
    return timeline
      .filter((entry) => entry.line.se)
      .map((entry, i) => (
        <Sequence key={`se-${i}`} from={entry.startFrame} durationInFrames={fps * 2}>
          <Audio src={staticFile(entry.line.se!)} volume={vol} />
        </Sequence>
      ));
  };

  // ---- 音声（セリフ） ----
  const renderAudio = () => {
    return timeline.map((entry, i) => {
      if (!entry.line.audioFile) return null;
      const duration = entry.line.frameCount ?? fps * 3;
      return (
        // Sequence で正しい開始フレームに配置し、staticFile() でパス解決
        <Sequence key={i} from={entry.startFrame} durationInFrames={duration}>
          <Audio src={staticFile(entry.line.audioFile)} />
        </Sequence>
      );
    });
  };

  return (
    <>
      {/* オープニングSE: フレーム0に固定挿入 */}
      <Audio src={staticFile('se/se_up.mp3')} startFrom={0} />
      {renderBgm()}
      {renderSe()}
      {renderAudio()}
    </>
  );
};

export default AudioTrack;
