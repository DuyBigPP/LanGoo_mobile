import * as React from "react";
import { subscribeUserCopy } from "@/lib/clipboard";
import { normalizeSelection } from "@/lib/lang";
import { useLookupSheet } from "@/hooks/use-lookup-sheet";

/**
 * Bôi đen chữ ở bất cứ đâu trong app → Copy → hiện phiếu tra nhanh (bản mobile của LookupProvider trên web).
 * Gắn một lần trong NavigationContainer. `openLookup` tự lọc văn bản không tra được (dài, toàn ký hiệu…).
 */
export function ClipboardLookup() {
  const { openLookup, lookupSheet } = useLookupSheet();

  React.useEffect(
    () => subscribeUserCopy(text => openLookup(normalizeSelection(text))),
    [openLookup],
  );

  return <>{lookupSheet}</>;
}
