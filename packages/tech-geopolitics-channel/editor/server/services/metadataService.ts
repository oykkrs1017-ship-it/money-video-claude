import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const ROOT_DIR = path.resolve(process.cwd(), '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'public', 'images');
const CHARACTERS_YAML_PATH = path.join(ROOT_DIR, 'config', 'characters.yaml');

export interface CharacterInfo {
  id: string;
  name: string;
  speakerId: number | null;
}

export interface Metadata {
  characters: CharacterInfo[];
  emotions: Record<string, string[]>;
  animations: string[];
  visualTypes: string[];
}

interface CharacterConfig {
  name: string;
  speakerId: number | null;
  position: string;
  color: string;
  defaultPauseAfter: number;
}

// Animation types
const ANIMATIONS = ['none', 'fadeIn', 'slideUp', 'slideLeft', 'zoomIn', 'bounce'];

// Visual types
const VISUAL_TYPES = ['none', 'image', 'text'];

// Load characters from YAML
function loadCharacters(): Record<string, CharacterConfig> {
  const content = fs.readFileSync(CHARACTERS_YAML_PATH, 'utf-8');
  return yaml.parse(content);
}

// Scan available emotions (image files) for each character
function scanEmotions(): Record<string, string[]> {
  const emotions: Record<string, string[]> = {};

  if (!fs.existsSync(IMAGES_DIR)) {
    return emotions;
  }

  const dirs = fs.readdirSync(IMAGES_DIR).filter((name) => {
    const stat = fs.statSync(path.join(IMAGES_DIR, name));
    return stat.isDirectory() && !name.startsWith('.');
  });

  for (const dir of dirs) {
    const charDir = path.join(IMAGES_DIR, dir);
    const files = fs.readdirSync(charDir).filter(f => f.endsWith('.png'));

    const emotionSet = new Set<string>();

    for (const file of files) {
      const baseName = file.replace('.png', '');

      if (baseName === 'mouth_open' || baseName === 'mouth_close') {
        emotionSet.add('normal');
      } else {
        const match = baseName.match(/^(.+)_(open|close)$/);
        if (match) {
          emotionSet.add(match[1]);
        }
      }
    }

    emotions[dir] = Array.from(emotionSet);
  }

  return emotions;
}

export function getCharacters(): CharacterInfo[] {
  const characters = loadCharacters();
  return Object.entries(characters).map(([id, config]) => ({
    id,
    name: config.name,
    speakerId: config.speakerId,
  }));
}

export function getEmotions(characterId: string): string[] {
  const all = scanEmotions();
  return all[characterId] || ['normal'];
}

export function getAnimations(): string[] {
  return ANIMATIONS;
}

export function getVisualTypes(): string[] {
  return VISUAL_TYPES;
}

export function getAllMetadata(): Metadata {
  return {
    characters: getCharacters(),
    emotions: scanEmotions(),
    animations: ANIMATIONS,
    visualTypes: VISUAL_TYPES,
  };
}
