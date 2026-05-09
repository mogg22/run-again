import { useEffect, useRef, useCallback } from 'react';
import { usePhysics } from '../../hooks/usePhysics';
import { usePretextBlocks } from '../../hooks/usePretextBlocks';
import './RunCanvas.css';

const TEXT_POOL = [
  '숨', '바닥', '버텨', '조금만', '달려', '심장', '리듬',
  '오르막', '내리막', '페이스', '호흡', '발걸음', '땀',
  'RUN', 'PACE', 'BPM', 'KM', 'AGAIN',
];

const FONT = '14px "Courier New", monospace';

function createBlocks(count, width, height) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    text: TEXT_POOL[i % TEXT_POOL.length],
    baseX: Math.random() * (width - 80) + 40,
    baseY: Math.random() * (height - 80) + 40,
    x: Math.random() * (width - 80) + 40,
    y: Math.random() * (height - 80) + 40,
    velX: 0,
    velY: 0,
    fontSize: 12 + Math.random() * 16,
    opacity: 0.4 + Math.random() * 0.6,
  }));
}

export function RunCanvas({ currentVisual, isPlaying, renderMode }) {
  const containerRef = useRef(null);
  const domNodesRef = useRef([]);
  const rafRef = useRef(null);
  const blocksRef = useRef([]);
  const lastTimeRef = useRef(null);
  const prevCountRef = useRef(0);
  const prevModeRef = useRef(null);           // ← 모드 변경 감지용

  const { updateMouse, computeBlockState, applyClickShockwave } = usePhysics();
  const { applyPretextLayout, warmup } = usePretextBlocks();

  // ── Pretext warmup — 최초 1회 ───────────────────────
  useEffect(() => {
    warmup(TEXT_POOL);
  }, [warmup]);

  // ── DOM 노드 동기화 ──────────────────────────────────
  const syncDomNodes = useCallback((count) => {
    const container = containerRef.current;
    if (!container) return;
    const current = domNodesRef.current;

    while (current.length < count) {
      const span = document.createElement('span');
      span.className = 'text-block';
      container.appendChild(span);
      current.push(span);
    }
    while (current.length > count) {
      current.pop().remove();
    }

    blocksRef.current.forEach((block, i) => {
      if (current[i]) {
        current[i].textContent = block.text;
        current[i].style.fontSize = `${block.fontSize}px`;
        current[i].style.opacity = block.opacity;
      }
    });
  }, []);

  // ── 블록 초기화 (블록 수 or 모드 변경 시) ───────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const count = currentVisual?.blockCount ?? 30;
    const modeChanged = prevModeRef.current !== renderMode;

    if (count !== prevCountRef.current || modeChanged) {
      let blocks = createBlocks(count, width, height);

      // ── Pretext 모드: baseX·baseY를 실제 크기 기반으로 재계산
      if (renderMode === 'pretext') {
        blocks = applyPretextLayout(blocks, width, height);
      }

      blocksRef.current = blocks;
      syncDomNodes(count);
      prevCountRef.current = count;
      prevModeRef.current = renderMode;
    }
  }, [currentVisual?.blockCount, renderMode, syncDomNodes, applyPretextLayout]);

  // ── 물리 루프 ────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const loop = (timestamp) => {
      const delta = lastTimeRef.current
        ? Math.min(timestamp - lastTimeRef.current, 50)
        : 16;
      lastTimeRef.current = timestamp;

      blocksRef.current = blocksRef.current.map((block) =>
        computeBlockState(block, currentVisual, delta)
      );

      blocksRef.current.forEach((block, i) => {
        const node = domNodesRef.current[i];
        if (node) {
          node.style.transform = `translate(${block.x}px, ${block.y}px)`;
        }
      });

      const container = containerRef.current;
      if (container) {
        container.classList.toggle('climax', currentVisual?.isClimax ?? false);
        // 모드 표시 클래스
        container.dataset.mode = renderMode;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [isPlaying, currentVisual, computeBlockState, renderMode]);

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateMouse(e.clientX - rect.left, e.clientY - rect.top);
  }, [updateMouse]);

  const handleClick = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    blocksRef.current = applyClickShockwave(
      blocksRef.current,
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  }, [applyClickShockwave]);

  return (
    <div
      ref={containerRef}
      className="run-canvas"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}