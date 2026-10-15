import type { vi } from "./vi"

export type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> }

export type Messages = Widen<typeof vi>

export const LOCALES = ["vi", "en"] as const
export type Locale = (typeof LOCALES)[number]
