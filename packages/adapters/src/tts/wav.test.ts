/**
 * parseWavDuration / durationToFrameCount のユニットテスト
 *
 * - 既知の byteRate / dataSize を埋めた Buffer を渡したときに想定どおりの秒数になる
 * - バッファが短すぎる場合に DomainError を投げる
 * - byteRate=0（不正ヘッダー）で DomainError を投げる
 * - durationToFrameCount のフロア + バッファフレーム加算ロジック
 */

import { describe, expect, it } from 'vitest';
import { DomainError } from '@money-video/shared-ts';
import { durationToFrameCount, parseWavDuration } from './wav';

/** 44 バイト WAV ヘッダーを合成する（byteRate / dataSize のみ設定、他は 0 で十分） */
function craftWavHeader(byteRate: number, dataSize: number): Buffer {
  const buf = Buffer.alloc(44);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

describe('parseWavDuration', () => {
  it('dataSize / byteRate で秒数を返す（24kHz, 16bit, mono → byteRate=48000）', () => {
    // 1 秒分のデータ: byteRate 48000 × 1 sec = 48000 bytes
    const buf = craftWavHeader(48_000, 48_000);
    expect(parseWavDuration(buf)).toBe(1);
  });

  it('小数秒も正確に返す（2.5 秒相当）', () => {
    const buf = craftWavHeader(48_000, 120_000);
    expect(parseWavDuration(buf)).toBeCloseTo(2.5, 5);
  });

  it('バッファが 44 バイト未満なら DomainError を投げる', () => {
    const tiny = Buffer.alloc(43);
    expect(() => parseWavDuration(tiny)).toThrow(DomainError);
    expect(() => parseWavDuration(tiny)).toThrow(/too small/);
  });

  it('byteRate=0 なら DomainError を投げる（ゼロ除算防止）', () => {
    const buf = craftWavHeader(0, 48_000);
    expect(() => parseWavDuration(buf)).toThrow(DomainError);
    expect(() => parseWavDuration(buf)).toThrow(/ByteRate is 0/);
  });

  it('最小ヘッダー長ちょうど（44 バイト）で動作する', () => {
    const buf = craftWavHeader(1000, 500);
    expect(parseWavDuration(buf)).toBe(0.5);
  });
});

describe('durationToFrameCount', () => {
  it('秒 × fps を floor し bufferFrames を加算する（デフォルト 5）', () => {
    // 1.0 秒 × 30fps = 30、+5 = 35
    expect(durationToFrameCount(1.0, 30)).toBe(35);
  });

  it('端数は切り捨てられる', () => {
    // 1.99 秒 × 30fps = 59.7 → floor=59、+5 = 64
    expect(durationToFrameCount(1.99, 30)).toBe(64);
  });

  it('bufferFrames を上書きできる', () => {
    expect(durationToFrameCount(2.0, 60, 0)).toBe(120);
    expect(durationToFrameCount(2.0, 60, 10)).toBe(130);
  });

  it('0 秒でも bufferFrames は加算される', () => {
    expect(durationToFrameCount(0, 30, 5)).toBe(5);
  });
});
