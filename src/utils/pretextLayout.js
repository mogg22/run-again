import {
  prepare,
  layout,
  prepareWithSegments,
  measureLineStats,
} from "@chenglou/pretext";

/**
 * Pretext 래퍼
 *
 * prepare()  — 텍스트·폰트 분석 (한 번만, 비쌈)
 * layout()   — 순수 산술 계산 (매 프레임 가능, ~0.0002ms)
 *
 * 핵심 원칙:
 * - prepare()는 같은 text+font 조합에서 절대 재실행하지 않음
 * - layout()만 반복 호출 (width 변화 시)
 */

const BASE_FONT = '14px "Courier New", monospace';
const BASE_LINE_HEIGHT = 20;

// prepare 결과 캐시 (text+font 키)
const prepareCache = new Map();

function getCachedPrepare(text, font) {
  const key = `${text}||${font}`;
  if (!prepareCache.has(key)) {
    prepareCache.set(key, prepare(text, font));
  }
  return prepareCache.get(key);
}

function getCachedPrepareWithSegments(text, font) {
  const key = `seg||${text}||${font}`;
  if (!prepareCache.has(key)) {
    prepareCache.set(key, prepareWithSegments(text, font));
  }
  return prepareCache.get(key);
}

/**
 * 텍스트 하나의 height·lineCount 사전 계산
 * DOM 측정 없음, Reflow 없음
 */
export function measureBlock(text, maxWidth = 200, font = BASE_FONT) {
  try {
    const prepared = getCachedPrepare(text, font);
    const result = layout(prepared, maxWidth, BASE_LINE_HEIGHT);
    return {
      width: Math.min(maxWidth, result.lineCount > 0 ? maxWidth : 0),
      height: Math.max(BASE_LINE_HEIGHT, result.height),
      lineCount: Math.max(1, result.lineCount),
    };
  } catch (e) {
    console.warn("[Pretext] measureBlock 실패, fallback:", e);
    return { width: maxWidth, height: BASE_LINE_HEIGHT, lineCount: 1 };
  }
}

/**
 * 텍스트의 실제 최대 줄 너비 계산
 * measureLineStats() 사용 — 문자열 할당 없이 통계만 반환
 */
export function measureBlockStats(text, maxWidth = 200, font = BASE_FONT) {
  try {
    const prepared = getCachedPrepareWithSegments(text, font);
    const { lineCount, maxLineWidth } = measureLineStats(prepared, maxWidth);
    return {
      lineCount: Math.max(1, lineCount),
      maxLineWidth,
    };
  } catch (e) {
    return { lineCount: 1, maxLineWidth: maxWidth };
  }
}

/**
 * 블록 배열 전체를 Pretext로 사전 측정 후 baseX·baseY 안전 범위 재계산
 * → 블록 수 변화 시에만 호출 (매 프레임 X)
 */
export function computePretextLayout(blocks, canvasWidth, canvasHeight) {
  return blocks.map((block) => {
    const font = `${block.fontSize}px "Courier New", monospace`;

    try {
      const prepared = getCachedPrepare(block.text, font);

      // layout() — 순수 산술, DOM 접근 없음
      const result = layout(prepared, canvasWidth * 0.25, BASE_LINE_HEIGHT);
      const measuredH = Math.max(block.fontSize, result.height);

      // measureLineStats() — 실제 텍스트 너비 계산
      const preparedSeg = getCachedPrepareWithSegments(block.text, font);
      const { maxLineWidth } = measureLineStats(preparedSeg, canvasWidth * 0.25);
      const measuredW = Math.min(maxLineWidth + 4, canvasWidth * 0.25);

      // 측정된 실제 크기로 baseX·baseY 안전 범위 재계산
      const safeX = Math.max(8, Math.min(block.baseX, canvasWidth - measuredW - 8));
      const safeY = Math.max(8, Math.min(block.baseY, canvasHeight - measuredH - 8));

      return {
        ...block,
        baseX: safeX,
        baseY: safeY,
        x: safeX,
        y: safeY,
        measuredWidth: measuredW,
        measuredHeight: measuredH,
      };
    } catch (e) {
      return block;
    }
  });
}

/**
 * 텍스트 풀 전체 warmup — 앱 시작 시 1회 실행
 * prepare()를 미리 돌려서 캐시 채움
 * 이후 layout() 호출은 순수 산술만 수행
 */
export function warmupPretext(textPool) {
  let success = 0;
  for (const text of textPool) {
    // 자주 쓰는 폰트 크기들 미리 캐시
    for (const size of [12, 14, 16, 18, 20, 24]) {
      const font = `${size}px "Courier New", monospace`;
      try {
        getCachedPrepare(text, font);
        getCachedPrepareWithSegments(text, font);
        success++;
      } catch {
        // 무시
      }
    }
  }
  console.log(`[Pretext] warmup 완료 — ${success}개 캐시`);
  return success > 0;
}

export function clearPretextCache() {
  prepareCache.clear();
}