import React from 'react';
import { Audio, staticFile, Sequence } from 'remotion';

interface SoundEffectProps {
  audioSrc: string;
  startFrame?: number;
  volume?: number;
}

export const SoundEffect: React.FC<SoundEffectProps> = ({
  audioSrc,
  startFrame = 0,
  volume = 0.6,
}) => {
  return (
    <Sequence from={startFrame} durationInFrames={90}>
      <Audio src={staticFile(audioSrc)} volume={volume} />
    </Sequence>
  );
};
