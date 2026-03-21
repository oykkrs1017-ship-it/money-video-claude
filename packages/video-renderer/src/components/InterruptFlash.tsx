import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ScriptSegment, AudioSegment} from '../types';

interface InterruptFlashProps {
  audioSegments: AudioSegment[];
  scriptSegments: ScriptSegment[];
}

export const InterruptFlash: React.FC<InterruptFlashProps> = ({
  audioSegments,
  scriptSegments,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const currentMs = (frame / fps) * 1000;

  // interrupt_atを持つセグメントの割り込みイベントを収集
  const interruptEvents: number[] = [];
  scriptSegments.forEach((seg, i) => {
    if (seg.interrupt_at !== null && audioSegments[i]) {
      const interruptMs = audioSegments[i].start_ms + seg.interrupt_at;
      interruptEvents.push(interruptMs);
    }
  });

  // 最も近い過去の割り込みイベントからの経過フレーム
  let flashIntensity = 0;
  for (const eventMs of interruptEvents) {
    const eventFrame = Math.round((eventMs / 1000) * fps);
    const elapsed = frame - eventFrame;
    if (elapsed >= 0 && elapsed < 20) {
      const intensity = interpolate(elapsed, [0, 20], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      flashIntensity = Math.max(flashIntensity, intensity);
    }
  }

  if (flashIntensity === 0) return null;

  return (
    <AbsoluteFill
      style={{
        background: `rgba(255, 255, 255, ${flashIntensity * 0.15})`,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  );
};
