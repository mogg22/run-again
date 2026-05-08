// 페이스 범위 (min/km)
const PACE_MIN = 4.0;
const PACE_MAX = 7.5;

// 심박 범위 (bpm)
const BPM_MIN = 100;
const BPM_MAX = 195;

// 0~1 정규화 헬퍼
function normalize(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// ── 페이스 → 커서 반발 강도 ──────────────────────────
// 빠를수록(pace 낮을수록) 강하게 날아감
export function paceToRepulsion(pace) {
  const n = 1 - normalize(pace, PACE_MIN, PACE_MAX); // 빠를수록 1에 가까움
  return 80 + n * 320; // 80 ~ 400px 반발 반경
}

// ── 심박 → 진동 주기 (ms) ────────────────────────────
// bpm이 높을수록 진동이 빠름
export function bpmToOscillationPeriod(bpm) {
  return (60 / bpm) * 1000; // ms 단위
}

// ── 심박 → 진폭 (px) ─────────────────────────────────
export function bpmToAmplitude(bpm) {
  const n = normalize(bpm, BPM_MIN, BPM_MAX);
  return 1 + n * 6; // 1 ~ 7px
}

// ── 고도 변화 → Y축 drift 방향/속도 ─────────────────
// 양수 = 상승, 음수 = 하강
export function elevationToDrift(elevationDelta) {
  const clamped = Math.max(-10, Math.min(10, elevationDelta));
  return -clamped * 0.4; // px/frame, 위가 음수이므로 부호 반전
}

// ── 케이던스 → 수평 진동 주파수 ─────────────────────
export function cadenceToFrequency(cadence) {
  return (cadence / 60) * 2 * Math.PI; // rad/s
}

// ── 거리 → 텍스트 블록 밀도 ─────────────────────────
export function distanceToBlockCount(distanceKm, maxBlocks = 80) {
  const ratio = Math.min(1, distanceKm / 5.0);
  return Math.floor(10 + ratio * (maxBlocks - 10));
}

// ── 현재 포인트에서 모든 시각 파라미터 한번에 계산 ───
export function mapPointToVisuals(point, prevPoint = null) {
  const elevationDelta = prevPoint
    ? point.elevation - prevPoint.elevation
    : 0;

  return {
    repulsionRadius: paceToRepulsion(point.pace),
    oscillationPeriod: bpmToOscillationPeriod(point.bpm),
    oscillationAmplitude: bpmToAmplitude(point.bpm),
    yDrift: elevationToDrift(elevationDelta),
    xFrequency: cadenceToFrequency(point.cadence),
    blockCount: distanceToBlockCount(point.distance),
    // 클라이맥스 감지: 심박 185 이상 + 페이스 5:00 이하
    isClimax: point.bpm >= 185 && point.pace <= 5.0,
    raw: point,
  };
}