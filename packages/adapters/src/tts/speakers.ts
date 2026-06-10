/**
 * VOICEVOX Speaker ID マッピング
 *
 * domain の SpeakerType（'maro' | 'ponchan' | 'narrator' | ...）を VOICEVOX の
 * speaker ID（整数）に解決する。プロジェクト全体で 1 箇所に寄せることで、
 * キャラ声質の変更影響範囲を限定する。
 */

import type { SpeakerType } from '@money-video/domain';
import { DomainError } from '@money-video/shared-ts';

/** まろくん（解説役）とぽんちゃん（聞き役）の speaker ID。ノーマル声。 */
export const DEFAULT_SPEAKER_IDS: Readonly<Record<string, number>> = {
  maro: 3,
  ponchan: 2,
};

/** 未登録スピーカーに対するフォールバック（まろ = 3）。 */
export const FALLBACK_SPEAKER_ID = 3;

/**
 * SpeakerType を VOICEVOX speaker ID に解決する。
 *
 * @param speaker - ドメインの SpeakerType
 * @param mapping - 上書き用マッピング（省略時は DEFAULT_SPEAKER_IDS）
 * @param strict - 未登録時に throw するか（デフォルト false = FALLBACK に落ちる）
 */
export function resolveSpeakerId(
  speaker: SpeakerType | string,
  mapping: Readonly<Record<string, number>> = DEFAULT_SPEAKER_IDS,
  strict = false,
): number {
  const id = mapping[speaker];
  if (id !== undefined) return id;
  if (strict) {
    throw new DomainError(`Unknown speaker: ${speaker}`);
  }
  return FALLBACK_SPEAKER_ID;
}
