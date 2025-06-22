import { 
  PERSONALITY_PRESETS, 
  PERSONALITY_TAGS,
  getLocalizedLabel,
  getLocalizedDescription
} from '@/constants/personality';

/**
 * 性格プリセットの値から翻訳されたラベルを取得
 */
export function translatePersonalityPreset(value: string, locale: string): string {
  const preset = PERSONALITY_PRESETS.find(p => p.value === value);
  return preset ? getLocalizedLabel(preset, locale) : value;
}

/**
 * 性格プリセットの値から翻訳された説明を取得
 */
export function translatePersonalityPresetDescription(value: string, locale: string): string {
  const preset = PERSONALITY_PRESETS.find(p => p.value === value);
  return preset ? getLocalizedDescription(preset, locale) : '';
}

/**
 * 性格タグの配列を翻訳
 */
export function translatePersonalityTags(tags: string[], locale: string): string[] {
  return tags.map(tagValue => {
    const tag = PERSONALITY_TAGS.find(t => t.value === tagValue);
    return tag ? getLocalizedLabel(tag, locale) : tagValue;
  });
}

/**
 * 単一の性格タグを翻訳
 */
export function translatePersonalityTag(value: string, locale: string): string {
  const tag = PERSONALITY_TAGS.find(t => t.value === value);
  return tag ? getLocalizedLabel(tag, locale) : value;
}

/**
 * 性格タグの説明を取得
 */
export function translatePersonalityTagDescription(value: string, locale: string): string {
  const tag = PERSONALITY_TAGS.find(t => t.value === value);
  return tag ? getLocalizedDescription(tag, locale) : '';
}