import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const ROOT_DIR = path.resolve(process.cwd(), '..');
const SCRIPT_YAML_PATH = path.join(ROOT_DIR, 'config', 'script.yaml');
const DEFAULTS_YAML_PATH = path.join(ROOT_DIR, 'config', 'defaults.yaml');
const DURATIONS_PATH = path.join(ROOT_DIR, 'public', 'voices', 'durations.json');

export interface ScriptLine {
  id: number;
  character: string;
  text: string;
  displayText?: string;
  scene: number;
  voiceFile?: string;
  durationInFrames?: number;
  pauseAfter: number;
  emotion?: string;
  visual?: {
    type: "image" | "text" | "none";
    src?: string;
    text?: string;
    fontSize?: number;
    color?: string;
    animation?: string;
  };
  se?: {
    src: string;
    volume?: number;
  };
}

interface Defaults {
  newLine: {
    character: string;
    pauseAfter: number;
    durationInFrames: number;
    scene: number;
  };
  automation: {
    voiceOnSave: boolean;
    autoVoiceFileName: boolean;
  };
}

function loadDefaults(): Defaults {
  const content = fs.readFileSync(DEFAULTS_YAML_PATH, 'utf-8');
  return yaml.parse(content);
}

function loadDurations(): Record<string, number> {
  if (fs.existsSync(DURATIONS_PATH)) {
    const content = fs.readFileSync(DURATIONS_PATH, 'utf-8');
    return JSON.parse(content);
  }
  return {};
}

function processLine(line: ScriptLine, defaults: Defaults, durations: Record<string, number>): ScriptLine {
  const voiceFile = `${String(line.id).padStart(2, '0')}_${line.character}.wav`;
  const durationInFrames = durations[voiceFile] || defaults.newLine.durationInFrames;

  return {
    ...line,
    voiceFile,
    durationInFrames,
    pauseAfter: line.pauseAfter ?? defaults.newLine.pauseAfter,
  };
}

export function getScript(): ScriptLine[] {
  const content = fs.readFileSync(SCRIPT_YAML_PATH, 'utf-8');
  const rawScript: ScriptLine[] = yaml.parse(content) || [];
  const defaults = loadDefaults();
  const durations = loadDurations();

  return rawScript.map(line => processLine(line, defaults, durations));
}

export function getScriptLine(id: number): ScriptLine | undefined {
  const script = getScript();
  return script.find(line => line.id === id);
}

export function updateScriptLine(id: number, data: Partial<ScriptLine>): ScriptLine {
  const content = fs.readFileSync(SCRIPT_YAML_PATH, 'utf-8');
  const script: ScriptLine[] = yaml.parse(content) || [];

  const index = script.findIndex(line => line.id === id);
  if (index === -1) {
    throw new Error(`Script line with id ${id} not found`);
  }

  // Update only allowed fields (don't store computed fields)
  const { voiceFile, durationInFrames, ...updateData } = data;
  script[index] = { ...script[index], ...updateData, id };

  // Write back to YAML
  const yamlContent = yaml.stringify(script, { lineWidth: 0 });
  fs.writeFileSync(SCRIPT_YAML_PATH, `# スクリプトデータ\n# 編集後 npm run sync-script で反映\n\n${yamlContent}`);

  // Return processed line
  const defaults = loadDefaults();
  const durations = loadDurations();
  return processLine(script[index], defaults, durations);
}

export function createScriptLine(data: Omit<ScriptLine, 'id'>): ScriptLine {
  const content = fs.readFileSync(SCRIPT_YAML_PATH, 'utf-8');
  const script: ScriptLine[] = yaml.parse(content) || [];
  const defaults = loadDefaults();

  // Generate new id
  const maxId = Math.max(0, ...script.map(line => line.id));
  const newLine: ScriptLine = {
    id: maxId + 1,
    character: data.character || defaults.newLine.character,
    text: data.text || '',
    scene: data.scene ?? defaults.newLine.scene,
    pauseAfter: data.pauseAfter ?? defaults.newLine.pauseAfter,
  };

  // Add optional fields if present
  if (data.displayText) newLine.displayText = data.displayText;
  if (data.emotion) newLine.emotion = data.emotion;
  if (data.visual) newLine.visual = data.visual;
  if (data.se) newLine.se = data.se;

  script.push(newLine);

  // Write back to YAML
  const yamlContent = yaml.stringify(script, { lineWidth: 0 });
  fs.writeFileSync(SCRIPT_YAML_PATH, `# スクリプトデータ\n# 編集後 npm run sync-script で反映\n\n${yamlContent}`);

  // Return processed line
  const durations = loadDurations();
  return processLine(newLine, defaults, durations);
}

export function deleteScriptLine(id: number): void {
  const content = fs.readFileSync(SCRIPT_YAML_PATH, 'utf-8');
  const script: ScriptLine[] = yaml.parse(content) || [];

  const index = script.findIndex(line => line.id === id);
  if (index === -1) {
    throw new Error(`Script line with id ${id} not found`);
  }

  script.splice(index, 1);

  // Write back to YAML
  const yamlContent = yaml.stringify(script, { lineWidth: 0 });
  fs.writeFileSync(SCRIPT_YAML_PATH, `# スクリプトデータ\n# 編集後 npm run sync-script で反映\n\n${yamlContent}`);
}

export function reorderScript(ids: number[]): ScriptLine[] {
  const content = fs.readFileSync(SCRIPT_YAML_PATH, 'utf-8');
  const script: ScriptLine[] = yaml.parse(content) || [];
  const defaults = loadDefaults();
  const durations = loadDurations();

  // Create a map of id to script line
  const scriptMap = new Map(script.map(line => [line.id, line]));

  // Reorder based on provided ids
  const reordered: ScriptLine[] = [];
  for (const id of ids) {
    const line = scriptMap.get(id);
    if (line) {
      reordered.push(line);
    }
  }

  // Add any remaining lines
  for (const line of script) {
    if (!ids.includes(line.id)) {
      reordered.push(line);
    }
  }

  // Write back to YAML
  const yamlContent = yaml.stringify(reordered, { lineWidth: 0 });
  fs.writeFileSync(SCRIPT_YAML_PATH, `# スクリプトデータ\n# 編集後 npm run sync-script で反映\n\n${yamlContent}`);

  return reordered.map(line => processLine(line, defaults, durations));
}
