import React from 'react';
import {Composition} from 'remotion';
import {DebateComposition} from './Debate';

// AudioManifest data from: 20260320_131834_AIは人間の仕事を奪うか_manifest.json
// total_duration_ms: 198798
// fps: 30
// durationFrames: Math.ceil(198798 / 1000 * 30) = 5964

const FPS = 30;
const TOTAL_DURATION_MS = 198798;
const DURATION_FRAMES = Math.ceil((TOTAL_DURATION_MS / 1000) * FPS); // 5964

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DebateComposition"
        component={DebateComposition}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
