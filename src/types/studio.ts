export type AspectRatioKey = '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | '4:3' | '3:4' | '3:2' | '2:3';
export type ResolutionKey = '720p' | '1080p' | '2K' | '4K';
export type FormatKey = 'MP4' | 'WebM' | 'MOV';
export type BgModeKey = 'code' | 'transparent' | 'solid';
export type TargetSizeMode = 'auto' | 'custom';
export type CodeMode = 'js' | 'html';
export type AutoCsvMode = 'both' | 'adobe' | 'vecteezy' | 'none';

export interface StudioSettings {
  ratio: AspectRatioKey;
  res: ResolutionKey;
  width: number;
  height: number;
  duration: number;
  fps: number;
  format: FormatKey;
  bgMode: BgModeKey;
  solidColor: string;
  bitrateMbps: number;
  targetSizeMode: TargetSizeMode;
  targetSizeMB: number;
  lightMode: boolean;
  loop: boolean;
  gridVisible: boolean;
  videoTitle: string;
  codeMode: CodeMode;
  rawHtmlCode: string;
  jsCode: string;
  lastPromptTitle: string;
}

export interface MetaState {
  title: string;
  desc: string;
  keywords: string;
  cat: number;
  embed: boolean;
  shortName: boolean;
  autoCsv: AutoCsvMode;
  touched: boolean;
}

export interface MetaSnapshot {
  title: string;
  desc: string;
  keywords: string[];
  cat: number;
  catName: string;
}

export interface DownloadLogEntry {
  filename: string;
  live: boolean;
  snap: MetaSnapshot;
}

export interface ExtractedMeta {
  title: string;
  description: string;
  keywords: string[];
  cat: number;
  found: boolean;
  fields: string[];
  derived: string[];
  brandRemoved: boolean;
}

export interface BatchItem {
  id: number;
  code: string;
  name: string;
  status: 'wait' | 'run' | 'done' | 'fail';
  pct: number;
  msg: string;
  meta: ExtractedMeta;
}

export interface PromptConfig {
  inputMode: 'template' | 'manual';
  catId: string;
  tplIndex: number;
  manualTitle: string;
  manualDesc: string;
  bgStyle: string;
  customBgText: string;
  colorStyle: string;
  sceneCount: number;
  customNote: string;
  textOverlay: string;
  typoStyle: string;
}

export interface EncoderSupportInfo {
  ext: string;
  engineLabel: string;
  note: string;
  alphaWarning: string;
  alphaSupported: boolean;
}

export const RATIOS: Record<AspectRatioKey, Record<ResolutionKey, [number, number]>> = {
  '16:9': { '720p': [1280, 720], '1080p': [1920, 1080], '2K': [2560, 1440], '4K': [3840, 2160] },
  '9:16': { '720p': [720, 1280], '1080p': [1080, 1920], '2K': [1440, 2560], '4K': [2160, 3840] },
  '1:1': { '720p': [720, 720], '1080p': [1080, 1080], '2K': [1440, 1440], '4K': [2160, 2160] },
  '4:5': { '720p': [720, 900], '1080p': [1080, 1350], '2K': [1440, 1800], '4K': [2160, 2700] },
  '21:9': { '720p': [1680, 720], '1080p': [2560, 1080], '2K': [3440, 1440], '4K': [5120, 2160] },
  '4:3': { '720p': [960, 720], '1080p': [1440, 1080], '2K': [1920, 1440], '4K': [2880, 2160] },
  '3:4': { '720p': [720, 960], '1080p': [1080, 1440], '2K': [1440, 1920], '4K': [2160, 2880] },
  '3:2': { '720p': [1080, 720], '1080p': [1620, 1080], '2K': [2160, 1440], '4K': [3240, 2160] },
  '2:3': { '720p': [720, 1080], '1080p': [1080, 1620], '2K': [1440, 2160], '4K': [2160, 3240] },
};
