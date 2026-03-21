export interface AudioSegment {
  segment_index: number;
  speaker: 'agent_a' | 'agent_b';
  file_path: string;
  start_ms: number;
  duration_ms: number;
  emotion: number;
}

export interface ScriptSegment {
  speaker: 'agent_a' | 'agent_b';
  text: string;
  emotion: number;
  interrupt_at: number | null;
  data_visual: DataVisual | null;
}

export interface DataVisual {
  type: 'bar_chart' | 'line_chart' | 'pie_chart';
  title: string;
  data: Array<{label: string; value: number}>;
}

export interface AudioManifest {
  script_title: string;
  total_duration_ms: number;
  segments: AudioSegment[];
}

export interface Script {
  title: string;
  topic: string;
  agents: Array<{id: string; name: string; position: string}>;
  segments: ScriptSegment[];
}
