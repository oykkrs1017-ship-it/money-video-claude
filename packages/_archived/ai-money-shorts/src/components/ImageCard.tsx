import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { DESIGN } from '../styles/designSystem';

interface ImageCardProps {
  /** public/ 以下の相対パス */
  imagePath: string;
  /** 出典URL（Pexels帰属表示） */
  credit?: string;
  /** このSequence内でのフレーム数（フェード計算用） */
  durationFrames: number;
}

/**
 * ケンバーンズ（ゆっくりズーム＋パン）付き画像カード
 * セクションのビジュアルエリア（上部コンテンツ域）に配置する
 */
export const ImageCard: React.FC<ImageCardProps> = ({
  imagePath,
  credit,
  durationFrames,
}) => {
  const frame = useCurrentFrame();

  // ── フェードイン（0-12フレーム）
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── フェードアウト（終了前12フレーム）
  const fadeOut = interpolate(
    frame,
    [durationFrames - 14, durationFrames - 2],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const opacity = Math.min(fadeIn, fadeOut);

  // ── ケンバーンズ：ゆっくりズームイン（1.0x → 1.08x）+ 右方向パン
  const zoomProgress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(zoomProgress, [0, 1], [1.0, 1.08]);
  const translateX = interpolate(zoomProgress, [0, 1], [0, -2]); // %単位

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        overflow: 'hidden',
        borderRadius: 20,
      }}
    >
      {/* 画像本体 */}
      <Img
        src={staticFile(imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}%)`,
          transformOrigin: 'center center',
        }}
      />

      {/* 上部グラデーション（タイトルと合成するための暗め） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        }}
      />

      {/* 下部グラデーション（吹き出しとの境界） */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(to top, rgba(10,14,39,0.92) 0%, transparent 100%)',
        }}
      />

      {/* Pexels帰属表示（右下・極小） */}
      {credit && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 10,
            fontFamily: DESIGN.fonts.body,
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
          }}
        >
          Photo: Pexels
        </div>
      )}
    </div>
  );
};
