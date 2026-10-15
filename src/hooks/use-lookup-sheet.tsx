import * as React from "react";
import { LookupSheet } from "@/components/dictionary/LookupSheet";
import { isLookupable } from "@/lib/lang";

export interface LookupSheetControls {
  /** Mở phiếu tra nhanh cho một chữ (bỏ qua ký tự không tra được như dấu câu). */
  openLookup: (query: string) => void;
  /** Phiếu tra nhanh — render một lần trong màn hình. */
  lookupSheet: React.ReactNode;
}

/**
 * Gắn tính năng "nhấn giữ để tra nhanh" vào màn hình nào cũng chỉ 1 dòng:
 *
 *   const { openLookup, lookupSheet } = useLookupSheet();
 *   <LookupText text={câu} onLookup={openLookup} />
 *   ...
 *   {lookupSheet}
 */
export function useLookupSheet(): LookupSheetControls {
  const [query, setQuery] = React.useState<string | null>(null);

  const openLookup = React.useCallback((next: string) => {
    const value = next.trim();
    // Ký tự không tra được (dấu câu, ký hiệu) -> không mở phiếu (giống web lọc isLookupable)
    if (!isLookupable(value)) return;
    setQuery(value);
  }, []);

  const closeLookup = React.useCallback(() => setQuery(null), []);

  const lookupSheet = <LookupSheet query={query} onClose={closeLookup} />;

  return { openLookup, lookupSheet };
}
