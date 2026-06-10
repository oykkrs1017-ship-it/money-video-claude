import React from 'react';
import { ScriptLine, CharacterLayoutType } from '../utils/types';
import { ZundamonStage } from './ZundamonStage';
import { MetanStage } from './MetanStage';

interface CharacterLayerProps {
  currentLine: ScriptLine | null | undefined;
  characterLayout: CharacterLayoutType;
  height: number;
  /** キャラ登場アニメーションの開始フレーム。負値を渡すと frame 0 から表示済み状態になる（デフォルト: 0） */
  startFrame?: number;
}

export const CharacterLayer: React.FC<CharacterLayerProps> = ({
  currentLine,
  characterLayout,
  height,
  startFrame = 0,
}) => {
  const isSpeakingZunda = currentLine?.speaker === 'maro';
  const isSpeakingMetan = currentLine?.speaker === 'ponchan';

  if (characterLayout === 'left-right') {
    return (
      <>
        <MetanStage
          emotion={currentLine?.speaker === 'ponchan' ? currentLine.emotion : 'normal'}
          isSpeaking={isSpeakingMetan}
          startFrame={startFrame}
          position="left"
          height={height * 0.38}
        />
        <ZundamonStage
          emotion={currentLine?.speaker === 'maro' ? currentLine.emotion : 'normal'}
          isSpeaking={isSpeakingZunda}
          startFrame={startFrame}
          position="right"
          height={height * 0.38}
        />
      </>
    );
  }

  if (characterLayout === 'bottom-center') {
    return (
      <>
        <MetanStage
          emotion={currentLine?.speaker === 'ponchan' ? currentLine.emotion : 'normal'}
          isSpeaking={isSpeakingMetan}
          startFrame={startFrame}
          position="left"
          height={height * 0.35}
        />
        <ZundamonStage
          emotion={currentLine?.speaker === 'maro' ? currentLine.emotion : 'normal'}
          isSpeaking={isSpeakingZunda}
          startFrame={startFrame}
          position="right"
          height={height * 0.35}
        />
      </>
    );
  }

  // その他のレイアウトは left-right で代替
  return (
    <>
      <MetanStage
        emotion={currentLine?.speaker === 'ponchan' ? currentLine.emotion : 'normal'}
        isSpeaking={isSpeakingMetan}
        startFrame={startFrame}
        position="left"
        height={height * 0.42}
      />
      <ZundamonStage
        emotion={currentLine?.speaker === 'maro' ? currentLine.emotion : 'normal'}
        isSpeaking={isSpeakingZunda}
        startFrame={startFrame}
        position="right"
        height={height * 0.42}
      />
    </>
  );
};

export default CharacterLayer;
