/** DTO domain từ điển — mirror backend (snake_case). */

export interface SearchHitDto {
  lexeme_id: string;
  language_id: number;
  lang_code: string;
  surface: string;
  reading: string | null;
  pos: string | null;
  frequency_rank: number | null;
  homograph_no: number | null;
  surface_kind: string;
  is_exact: boolean;
}

export interface SearchResultDto {
  data: SearchHitDto[];
  next_cursor: string | null;
}

export interface SenseCardDto {
  sense_id: string;
  lexeme_id: string;
  language_id: number;
  lemma: string;
  reading: string | null;
  romanization: string | null;
  pos: string | null;
  frequency_rank: number | null;
  homograph_no: number | null;
  sense_no: number;
  definition: string | null;
  definition_language_id: number | null;
  register: string | null;
  domain: string | null;
  is_primary: boolean;
  gloss_vi: string | null;
  gloss_vi_machine: boolean | null;
  gloss_vi_reviewed: boolean | null;
  gloss_en: string | null;
  concept_id: string | null;
  group_heading: string | null;
  sub_senses: SenseCardDto[];
  gloss_en_context: string[];
}

export interface LexemeSensesResultDto {
  data: SenseCardDto[];
  next_cursor: string | null;
}

export interface SenseGlossDto {
  id: string;
  language_id: number;
  text: string;
  detail: string | null;
  is_machine: boolean;
  reviewed: boolean;
  quality: number | null;
  rank: number;
}

export interface SenseExampleDto {
  id: string;
  language_id: number;
  text: string;
  translation: Record<string, string>;
  difficulty: string | null;
}

export interface SenseFormDto {
  id: string;
  kind: string;
  form_text: string;
  form_order: number;
  is_common: boolean;
}

export interface SenseDetailDto {
  card: SenseCardDto;
  glosses: SenseGlossDto[];
  examples: SenseExampleDto[];
  pronunciations: { id: string; ipa: string | null; audio_key: string | null; dialect: string | null }[];
  forms: SenseFormDto[];
}

export interface SenseLinkDto {
  sense_id: string;
  lexeme_id: string;
  lemma: string;
  reading: string | null;
  language_id: number;
  gloss_vi: string | null;
  gloss_en: string | null;
}

export interface SenseLinksResultDto {
  data: SenseLinkDto[];
}

export interface KanjiReadingItemDto {
  type: string;
  value: string;
}

export interface KanjiMeaningItemDto {
  lang: string;
  value: string;
}

export interface KanjiComponentDto {
  char: string;
  original: string | null;
  is_variant: boolean;
  position: string | null;
  is_radical: boolean;
  is_phonetic: boolean;
  part: number | null;
  strokes: number[];
  stroke_count: number;
  radical_number: number | null;
  name_vi: string | null;
  meaning_vi: string | null;
  children: KanjiComponentDto[];
}

export interface KanjiPartDto {
  char: string;
  position: number | null;
  is_radical: boolean;
  radical_number: number | null;
  name_vi: string | null;
  meaning_vi: string | null;
}

export interface KanjiCardDto {
  literal: string;
  codepoint_ucs: number;
  grade: number | null;
  stroke_count: number | null;
  frequency_rank: number | null;
  jlpt_old: number | null;
  jlpt_new: number | null;
  radical: { char: string; name_vi: string | null; meaning_vi: string | null } | null;
  readings: { groups: KanjiReadingItemDto[][] };
  meanings: { groups: KanjiMeaningItemDto[][] };
  nanori: string[] | null;
  used_in_forms: number;
  parts: KanjiPartDto[] | null;
  components: KanjiComponentDto | null;
}

export interface SearchHistoryItemDto {
  id: string;
  raw_query: string;
  normalized: string | null;
  language_id: number | null;
  matched_sense_id: string | null;
  result_count: number | null;
  created_at: string;
}

export interface SearchHistoryResultDto {
  data: SearchHistoryItemDto[];
}

// ===== Tra ngược VI → JA =====
export interface ReverseJaHitDto {
  text: string;
  sense_hint: string | null;
  via_lexeme_id: string;
  via_lemma: string;
  exact_sense: boolean;
}

export interface ReverseLookupResultDto {
  query: string;
  matched: boolean;
  en: { lexeme_id: string; lemma: string; pos: string | null; frequency_rank: number | null; sense_hint: string | null }[];
  ja: ReverseJaHitDto[];
}
