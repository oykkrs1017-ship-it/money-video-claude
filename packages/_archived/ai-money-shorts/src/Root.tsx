import React from 'react';
import { Composition } from 'remotion';
import { TypeAMystery } from './compositions/TypeA-Mystery';
import { TypeBRanking } from './compositions/TypeB-Ranking';
import { TypeCVersus } from './compositions/TypeC-Versus';
import { TypeDQuiz } from './compositions/TypeD-Quiz';
import { TypeEStory } from './compositions/TypeE-Story';
import { TypeFNewsFlash } from './compositions/TypeF-NewsFlash';
import { TypeGMythBuster } from './compositions/TypeG-MythBuster';
import type { Episode, CompositionType } from './types/episode';
import { buildTimeline } from './compositions/shared/buildTimeline';
import { SETTINGS } from './settings.generated';
import { MAX_FRAMES, FPS } from './utils/frameCalculator';
import EP_SAMPLE_001 from './data/episodes/ep-sample-001.json';
import EP_SAMPLE_005 from './data/episodes/ep-sample-005.json';
import EP_VISUAL_TEST from './data/episodes/ep-visual-test.json';
import EP_TEST_SHORTS from './data/episodes/ep-test-shorts.json';

// Remotion の Composition コンポーネント型に合わせるためのキャスト用エイリアス
type AnyComp = React.ComponentType<Record<string, unknown>>;

const DEFAULT_EPISODE: Episode = EP_SAMPLE_001 as Episode;
const EP005: Episode = EP_SAMPLE_005 as Episode;
const EP_VT: Episode = EP_VISUAL_TEST as Episode;
const EP_TS: Episode = EP_TEST_SHORTS as Episode;

function calculateDuration(episode: Episode): number {
  try {
    const { totalFrames } = buildTimeline(episode);
    return Math.min(totalFrames, MAX_FRAMES);
  } catch {
    return 900; // フォールバック 30 秒
  }
}

function makeEpisode(type: CompositionType): Episode {
  return { ...DEFAULT_EPISODE, compositionType: type };
}

export const Root: React.FC = () => {
  const defaultDuration = calculateDuration(DEFAULT_EPISODE);

  const compositions: Array<{
    id: string;
    component: AnyComp;
    type: CompositionType;
  }> = [
    { id: 'TypeA-Mystery',    component: TypeAMystery    as unknown as AnyComp, type: 'TypeA-Mystery'    },
    { id: 'TypeB-Ranking',    component: TypeBRanking    as unknown as AnyComp, type: 'TypeB-Ranking'    },
    { id: 'TypeC-Versus',     component: TypeCVersus     as unknown as AnyComp, type: 'TypeC-Versus'     },
    { id: 'TypeD-Quiz',       component: TypeDQuiz       as unknown as AnyComp, type: 'TypeD-Quiz'       },
    { id: 'TypeE-Story',      component: TypeEStory      as unknown as AnyComp, type: 'TypeE-Story'      },
    { id: 'TypeF-NewsFlash',  component: TypeFNewsFlash  as unknown as AnyComp, type: 'TypeF-NewsFlash'  },
    { id: 'TypeG-MythBuster', component: TypeGMythBuster as unknown as AnyComp, type: 'TypeG-MythBuster' },
  ];

  return (
    <>
      {/* エピソード別プレビュー */}
      <Composition
        id="ep-sample-005"
        component={TypeEStory as unknown as AnyComp}
        durationInFrames={calculateDuration(EP005)}
        fps={FPS}
        width={SETTINGS.video.width}
        height={SETTINGS.video.height}
        defaultProps={{ episode: EP005 } as Record<string, unknown>}
        calculateMetadata={({ props }) => ({
          durationInFrames: calculateDuration(
            (props as { episode: Episode }).episode,
          ),
        })}
      />

      {/* ビジュアルテスト（flow-chart / infographic QC用） */}
      <Composition
        id="ep-visual-test"
        component={TypeAMystery as unknown as AnyComp}
        durationInFrames={calculateDuration(EP_VT)}
        fps={FPS}
        width={SETTINGS.video.width}
        height={SETTINGS.video.height}
        defaultProps={{ episode: EP_VT } as Record<string, unknown>}
        calculateMetadata={({ props }) => ({
          durationInFrames: calculateDuration(
            (props as { episode: Episode }).episode,
          ),
        })}
      />

      {/* ep-test-shorts（米中半導体戦争 TypeC-Versus） */}
      <Composition
        id="ep-test-shorts"
        component={TypeCVersus as unknown as AnyComp}
        durationInFrames={calculateDuration(EP_TS)}
        fps={FPS}
        width={SETTINGS.video.width}
        height={SETTINGS.video.height}
        defaultProps={{ episode: EP_TS } as Record<string, unknown>}
        calculateMetadata={({ props }) => ({
          durationInFrames: calculateDuration(
            (props as { episode: Episode }).episode,
          ),
        })}
      />

      {/* コンポジションタイプ別テンプレート */}
      {compositions.map(({ id, component, type }) => {
        const episode = makeEpisode(type);
        return (
          <Composition
            key={id}
            id={id}
            component={component}
            durationInFrames={defaultDuration}
            fps={FPS}
            width={SETTINGS.video.width}
            height={SETTINGS.video.height}
            defaultProps={{ episode } as Record<string, unknown>}
            calculateMetadata={({ props }) => ({
              durationInFrames: calculateDuration(
                (props as { episode: Episode }).episode,
              ),
            })}
          />
        );
      })}
    </>
  );
};
