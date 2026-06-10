/**
 * Episode primitive types — narrow string unions and leaf types.
 * No business logic, no I/O.
 */

export type SpeakerType = 'maro' | 'ponchan';

export type EmotionType =
  | 'normal'
  | 'happy'
  | 'surprised'
  | 'thinking'
  | 'serious'
  | 'sad';

export type ChapterType =
  | 'hook'
  | 'explanation'
  | 'explanation_2'
  | 'analysis'
  | 'analysis_2'
  | 'summary'
  | 'cta'
  | 'chapter'
  | 'outro';

export type ChartType = 'line' | 'bar' | 'pie' | 'area';

export type SlideLayout =
  | 'bullets'
  | 'compare'
  | 'numbers'
  | 'quote'
  | 'steps'
  | 'highlight';

export type ImagePosition =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'center-right'
  | 'center';

export type ImageAnimation = 'fade' | 'slide-right' | 'slide-left' | 'zoom';
