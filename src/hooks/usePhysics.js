import { useRef, useCallback } from "react";

export function usePhysics() {
  const mouseRef = useRef({ x: -9999, y: -9999 });

  // 마우스 위치 업데이트
  const updateMouse = useCallback((x, y) => {
    mouseRef.current = { x, y };
  }, []);

  // 텍스트 블록 하나의 다음 프레임 위치 계산
  const computeBlockState = useCallback((block, currentVisual, deltaTime) => {
    if (!currentVisual) return block;

    const { repulsionRadius, oscillationPeriod, oscillationAmplitude, yDrift, xFrequency } = currentVisual;
    const mouse = mouseRef.current;
    const now = performance.now();

    // ── 1. 커서 반발 ──────────────────────────────────
    const dx = block.baseX - mouse.x;
    const dy = block.baseY - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let repelX = 0;
    let repelY = 0;

    if (dist < repulsionRadius && dist > 0) {
      const force = (1 - dist / repulsionRadius) ** 2;
      repelX = (dx / dist) * force * repulsionRadius * 0.5;
      repelY = (dy / dist) * force * repulsionRadius * 0.5;
    }

    // ── 2. 목표 위치 = base + 반발 오프셋 ────────────
    const targetX = block.baseX + repelX;
    const targetY = block.baseY + repelY;

    // ── 3. 스프링 복귀 (감쇠) ─────────────────────────
    const spring = 0.12;
    const damping = 0.75;

    const velX = (block.velX ?? 0) * damping + (targetX - block.x) * spring;
    const velY = (block.velY ?? 0) * damping + (targetY - block.y) * spring;

    // ── 4. 심박 진동 (sin파 x 오프셋) ────────────────
    const oscX = Math.sin((now / oscillationPeriod) * 2 * Math.PI) * oscillationAmplitude;

    // ── 5. 고도 drift (Y축) ───────────────────────────
    const driftY = yDrift * deltaTime * 0.06;

    // ── 6. 케이던스 수평 진동 ────────────────────────
    const cadX = Math.sin((now / 1000) * xFrequency) * 1.5;

    return {
      ...block,
      x: block.x + velX + oscX * 0.3 + cadX * 0.2,
      y: block.y + velY + driftY,
      velX,
      velY,
    };
  }, []);

  // 클릭 충격파
  const applyClickShockwave = useCallback((blocks, clickX, clickY, radius = 200) => {
    return blocks.map((block) => {
      const dx = block.x - clickX;
      const dy = block.y - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius && dist > 0) {
        const force = (1 - dist / radius) * 15;
        return {
          ...block,
          velX: (block.velX ?? 0) + (dx / dist) * force,
          velY: (block.velY ?? 0) + (dy / dist) * force,
        };
      }
      return block;
    });
  }, []);

  return { updateMouse, computeBlockState, applyClickShockwave };
}