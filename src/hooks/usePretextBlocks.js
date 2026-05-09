import { useRef, useCallback } from "react";
import { computePretextLayout, warmupPretext } from "../utils/pretextLayout";

export function usePretextBlocks() {
  const pretextReadyRef = useRef(false);

  const applyPretextLayout = useCallback((blocks, canvasWidth, canvasHeight) => {
    try {
      const result = computePretextLayout(blocks, canvasWidth, canvasHeight);
      pretextReadyRef.current = true;
      return result;
    } catch (e) {
      console.warn("[Pretext] 레이아웃 실패, DOM fallback:", e);
      pretextReadyRef.current = false;
      return blocks;
    }
  }, []);

  const warmup = useCallback((textPool) => {
    const ok = warmupPretext(textPool);
    pretextReadyRef.current = ok;
  }, []);

  return {
    applyPretextLayout,
    warmup,
    isPretextReady: () => pretextReadyRef.current,
  };
}