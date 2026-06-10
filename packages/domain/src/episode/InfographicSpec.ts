export type InfographicType = 'donut_chart' | 'bar_chart' | 'stat_card' | 'flow_diagram';

export interface InfographicDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface InfographicFlowStep {
  label: string;
  icon?: string;
}

export interface InfographicSpec {
  id: string;
  type: InfographicType;
  title: string;
  /** "content/infographic_*.png" 形式 */
  outputPath: string;
  data?: InfographicDataItem[];
  steps?: InfographicFlowStep[];
  /** stat_card: 大きな数値テキスト */
  value?: string;
  /** stat_card: 説明ラベル */
  label?: string;
  /** stat_card / bar_chart: 補足テキスト */
  subtext?: string;
  accentColor?: string;
}
