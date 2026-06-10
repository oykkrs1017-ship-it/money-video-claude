/**
 * AudioTrack.tsx
 * 音声トラック管理コンポーネント。
 * - 各セリフの WAV を Sequence でタイムライン配置
 * - bgmMap によるセクションロール別 BGM 自動選択
 * - BGM は隣接同一トラックをマージして余分なフェードを防ぐ
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import type { Section } from '../types/episode';
import type { TimelineResult, TimelineEntry } from '../compositions/shared/buildTimeline';

// ── デフォルト bgmMap ──────────────────────────────────────────────

const DEFAULT_BGM_MAP: Record<string, string> = {
  hook:        'bgm/tension_short.mp3',
  explanation: 'bgm/main_lofi.mp3',
  data:        'bgm/tech_ambient.mp3',
  conclusion:  'bgm/upbeat_short.mp3',
  cta:         'bgm/jingle.mp3',
};

const DEFAULT_BGM = 'bgm/main_lofi.mp3';
const BGM_VOLUME = 0.28;

// ── Props ──────────────────────────────────────────────────────────

interface AudioTrackProps {
  timeline: TimelineResult;
  sections: Section[];
  /** セクションロール別 BGM 上書き */
  bgmMap?: Record<string, string>;
  bgmVolume?: number;
}

// ── BGM セグメント計算 ─────────────────────────────────────────────

interface BgmSegment {
  src: string;
  startFrame: number;
  endFrame: number;
}

function buildBgmSegments(
  sections: Section[],
  sectionTimings: TimelineResult['sectionTimings'],
  bgmMap: Record<string, string>,
): BgmSegment[] {
  const raw: BgmSegment[] = sectionTimings.map((st) => {
    const section = sections[st.sectionIndex];
    const src =
      section?.bgm ??
      bgmMap[section?.role ?? ''] ??
      DEFAULT_BGM;
    return { src, startFrame: st.startFrame, endFrame: st.endFrame };
  });

  // 同一 src の隣接セグメントをマージ
  const merged: BgmSegment[] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.src === seg.src && last.endFrame >= seg.startFrame) {
      last.endFrame = seg.endFrame;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

// ── コンポーネント ────────────────────────────────────────────────

export const AudioTrack: React.FC<AudioTrackProps> = ({
  timeline,
  sections,
  bgmMap = DEFAULT_BGM_MAP,
  bgmVolume = BGM_VOLUME,
}) => {
  const { entries, sectionTimings } = timeline;
  const bgmSegments = buildBgmSegments(sections, sectionTimings, bgmMap);

  return (
    <>
      {/* セリフ音声 */}
      {entries.map((entry: TimelineEntry) => {
        if (!entry.line.audioFile) return null;
        const dur = entry.endFrame - entry.startFrame;
        if (dur <= 0) return null;

        return (
          <Sequence
            key={`voice-${entry.sectionIndex}-${entry.lineIndex}`}
            from={entry.startFrame}
            durationInFrames={dur}
          >
            <Audio src={staticFile(entry.line.audioFile)} volume={1.0} />
          </Sequence>
        );
      })}

      {/* BGM: フレーム0から全編ループ再生（セクション切替で途切れない） */}
      <Audio
        src={staticFile(DEFAULT_BGM)}
        volume={bgmVolume}
        loop
        startFrom={0}
      />
    </>
  );
};

export default AudioTrack;
