import type {
  ChartType,
  ImageAnimation,
  ImagePosition,
  SlideLayout,
} from './primitives';

export interface SlideCompareColumn {
  label: string;
  color?: string;
  items: string[];
}

export interface SlideNumber {
  value: string;
  label: string;
  subtext?: string;
}

export interface StatCardData {
  value: string;
  label: string;
  subtext?: string;
  metrics?: { key: string; value: string }[];
}

export interface CompareItemData {
  label: string;
  value?: string;
  subtext?: string;
  color?: string;
  items?: string[];
}

export interface FlowNode {
  label: string;
  sublabel?: string;
  icon?: string;
  highlight?: boolean;
  children?: FlowNode[];
  detail?: { title?: string; items: string[]; color?: string };
}

export interface ScaleBalanceSide {
  label: string;
  sublabel?: string;
  direction: 'up' | 'down';
  box?: { title?: string; items: string[] };
}

export interface IsoLayer {
  label: string;
  sublabel?: string;
  color: string;
  icon?: string;
}

export interface IsoCorner {
  position: 'tl' | 'tr' | 'bl' | 'br';
  label: string;
  sublabel?: string;
  color?: string;
}

export interface TimelineEventData {
  year: string;
  label: string;
  description?: string;
  highlight?: boolean;
  color?: string;
}

/**
 * Visual — discriminated union rendered per script line.
 *
 * This replaces the legacy `VisualLegacy` interface. The legacy
 * big-Visual-with-sub-data-objects shape is intentionally not exported
 * from domain; tech-geopolitics-channel retains its own compatibility
 * shim until all call sites are migrated.
 */
export type Visual =
  | {
      type: 'chart';
      key: string;
      chartType?: ChartType;
      title?: string;
    }
  | {
      type: 'image';
      src?: string;
      url?: string;
      caption?: string;
      position?: ImagePosition;
      width?: number;
      duration?: number;
      animation?: ImageAnimation;
    }
  | {
      type: 'slide';
      layout?: SlideLayout;
      title?: string;
      bullets?: string[];
      highlight?: string;
      subtext?: string;
      quote?: string;
      attribution?: string;
      numbers?: SlideNumber[];
      left?: SlideCompareColumn;
      right?: SlideCompareColumn;
      color?: string;
    }
  | {
      type: 'stat';
      value: string;
      label: string;
      subtext?: string;
      metrics?: { key: string; value: string }[];
    }
  | { type: 'highlight'; text: string }
  | { type: 'keyword'; text: string }
  | {
      type: 'timeline';
      events: TimelineEventData[];
      title?: string;
      activeIndex?: number;
      scrollSpeed?: number;
    }
  | {
      type: 'split';
      left: CompareItemData;
      right: CompareItemData;
      title?: string;
    }
  | {
      type: 'rich-panel';
      number?: number;
      title: string;
      icon?: string;
      body?: string;
      emphasis?: string;
      points?: (string | { text: string; body?: string; value?: string; unit?: string; source?: string })[];
      color?: string;
    }
  | {
      type: 'ai-infographic';
      key: string;
      prompt: string;
      caption?: string;
      position?: ImagePosition;
      duration?: number;
    }
  | {
      type: 'comparison-table';
      title?: string;
      columns: { label: string; winner?: boolean }[];
      rows: { label: string; values: string[] }[];
      badge?: string;
      footer?: string;
    }
  | {
      type: 'flow-chart';
      title?: string;
      root: FlowNode;
      footer?: string;
    }
  | {
      type: 'traffic-light';
      title?: string;
      items: { signal: 'go' | 'stop'; label: string; sublabel?: string; items?: string[] }[];
      footer?: string;
    }
  | {
      type: 'cycle-loop';
      title?: string;
      steps: { label: string; sublabel?: string; icon?: string }[];
      centerText?: string;
      footer?: string;
    }
  | {
      type: 'scale-balance';
      title?: string;
      left: ScaleBalanceSide;
      right: ScaleBalanceSide;
      footer?: string;
    }
  | {
      type: 'isometric-stack';
      title?: string;
      layers: IsoLayer[];
      corners?: IsoCorner[];
      topLabel?: string;
    }
  | {
      type: 'graph-catalog';
      title?: string;
      subtitle?: string;
      sections: {
        heading: string;
        color?: string;
        charts: {
          name: string;
          description?: string;
          chartHint?: 'pie' | 'bar' | 'line' | 'scatter' | 'heatmap';
        }[];
      }[];
      tips?: string[];
      decisions?: { label: string; highlight?: boolean }[];
    }
  | {
      type: 'z-layout';
      title?: string;
      rules: { number: number; heading: string; description?: string }[];
      diagramLabels?: {
        tl?: string;
        tr?: string;
        bl?: string;
        br?: string;
        center?: string;
      };
    }
  | {
      type: 'number-context';
      title?: string;
      before: { label: string; value: string; description?: string };
      after: {
        label: string;
        metrics: { key: string; value: string; highlight?: boolean }[];
        description?: string;
      };
    }
  | {
      type: 'fact-insight';
      title?: string;
      bad: { label: string; items: string[] };
      good: { label: string; items: string[] };
      tip?: string;
    }
  | {
      type: 'audience-table';
      title?: string;
      rows: {
        icon?: string;
        role: string;
        interests: string[];
        metrics: string[];
      }[];
    }
  | {
      type: 'pyramid';
      title: string;
      direction?: 'up' | 'down';
      layers: { label: string; sublabel?: string; value?: string }[];
      footer?: string;
    }
  | {
      type: 'venn';
      title: string;
      sets: { label: string; items?: string[]; color?: string }[];
      overlapLabel?: string;
      footer?: string;
    }
  | {
      type: 'map';
      title: string;
      region: 'asia' | 'world' | 'japan';
      points: { label: string; x: number; y: number; highlight?: boolean; note?: string }[];
      routes?: { from: number; to: number; label?: string }[];
      footer?: string;
    }
  | {
      type: 'data-table';
      title: string;
      subtitle?: string;
      labelHeader?: string;
      columns: (string | { label: string; color?: string; highlight?: boolean })[];
      rows: {
        label: string;
        labelColor?: string;
        cells: (string | { value: string; color?: string; bold?: boolean })[];
      }[];
      maxRowsPerSlide?: number;
      note?: string;
    };

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartDataSet {
  title?: string;
  chartType?: ChartType;
  data: ChartDataPoint[];
}
