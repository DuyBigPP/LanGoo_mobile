/** Nhãn tiếng Việt/Anh cho dữ liệu từ điển (backend trả mã tiếng Anh) */
import { translate } from "@/i18n"

const POS_KEYS: Record<string, string> = {
  noun: "labels.pos.noun",
  verb: "labels.pos.verb",
  adjective: "labels.pos.adjective",
  "adj-na": "labels.pos.adjNa",
  "adj-i": "labels.pos.adjI",
  adverb: "labels.pos.adverb",
  particle: "labels.pos.particle",
  pronoun: "labels.pos.pronoun",
  conjunction: "labels.pos.conjunction",
  interjection: "labels.pos.interjection",
  prefix: "labels.pos.prefix",
  suffix: "labels.pos.suffix",
  counter: "labels.pos.counter",
  expression: "labels.pos.expression",
  auxiliary: "labels.pos.auxiliary",
  determiner: "labels.pos.determiner",
  preposition: "labels.pos.preposition",
}

export function posLabel(pos: string | null | undefined): string | null {
  if (!pos) return null
  const key = POS_KEYS[pos.toLowerCase()]
  return key ? translate(key) : pos
}

const SURFACE_KIND_KEYS: Record<string, string> = {
  lemma: "labels.surfaceKind.lemma",
  kanji: "labels.surfaceKind.kanji",
  kana: "labels.surfaceKind.kana",
  romaji: "labels.surfaceKind.romaji",
  inflection: "labels.surfaceKind.inflection",
  form: "labels.surfaceKind.inflection",
}

export function surfaceKindLabel(kind: string | null | undefined): string | null {
  if (!kind) return null
  const key = SURFACE_KIND_KEYS[kind.toLowerCase()]
  return key ? translate(key) : kind
}

const FORM_KIND_KEYS: Record<string, string> = {
  kanji: "labels.formKind.kanji",
  kana: "labels.formKind.kana",
  romaji: "labels.formKind.romaji",
  past: "labels.formKind.past",
  te: "labels.formKind.te",
  masu: "labels.formKind.masu",
  negative: "labels.formKind.negative",
}

export function formKindLabel(kind: string | null | undefined): string | null {
  if (!kind) return null
  const key = FORM_KIND_KEYS[kind.toLowerCase()]
  return key ? translate(key) : kind
}

const ITEM_STATUS_KEYS: Record<string, string> = {
  learning: "labels.itemStatus.learning",
  paused: "labels.itemStatus.paused",
  known: "labels.itemStatus.known",
}

export function itemStatusLabel(status: string | null | undefined): string {
  if (!status) return translate("labels.itemStatus.learning")
  const key = ITEM_STATUS_KEYS[status.toLowerCase()]
  return key ? translate(key) : status
}

const COLLECTION_KIND_KEYS: Record<string, string> = {
  personal: "labels.collectionKind.personal",
  cloned: "labels.collectionKind.cloned",
  shared: "labels.collectionKind.shared",
}

export function collectionKindLabel(kind: string | null | undefined): string {
  if (!kind) return translate("labels.collectionKind.personal")
  const key = COLLECTION_KIND_KEYS[kind.toLowerCase()]
  return key ? translate(key) : kind
}
