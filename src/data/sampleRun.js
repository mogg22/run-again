// 5km 러닝 샘플 — 워밍업 → 본페이스 → 오르막 → 스퍼트
export const sampleRun = {
  meta: {
    title: "Morning Run",
    totalDistance: 5.0,   // km
    totalTime: 1560,      // seconds (26:00)
    date: "2025-05-01",
  },

  // 1초 간격 시계열 데이터 (실제 GPX도 이 구조로 파싱됨)
  points: generateSamplePoints(),
};

function generateSamplePoints() {
  const points = [];
  const totalPoints = 156; // 약 26분

  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints; // 0 ~ 1 진행률

    // 페이스: 워밍업(느림) → 안정 → 오르막(느려짐) → 스퍼트(빠름)
    let pace;
    if (t < 0.15)      pace = 7.0 - t * 6;           // 워밍업: 7:00 → 6:06
    else if (t < 0.6)  pace = 6.0 + Math.sin(t * 8) * 0.3; // 본페이스: 6:00 ± 0.3
    else if (t < 0.75) pace = 6.0 + (t - 0.6) * 8;  // 오르막: 느려짐
    else               pace = 6.2 - (t - 0.75) * 12; // 스퍼트: 빠르게

    // 심박수: 페이스에 비례하되 약간 지연
    const targetBpm = 220 - 25 * pace;
    const prevBpm = points[i - 1]?.bpm ?? 120;
    const bpm = Math.round(prevBpm + (targetBpm - prevBpm) * 0.1 + (Math.random() - 0.5) * 3);

    // 고도: 평지 → 오르막 → 내리막
    let elevation;
    if (t < 0.5)       elevation = t * 40;             // 0 → 20m 완만한 상승
    else if (t < 0.75) elevation = 20 + (t - 0.5) * 120; // 오르막 급상승
    else               elevation = 50 - (t - 0.75) * 200; // 내리막

    // 케이던스: 페이스 빠를수록 높아짐
    const cadence = Math.round(160 + (6.5 - pace) * 8 + (Math.random() - 0.5) * 4);

    points.push({
      time: i * 10,                          // seconds
      distance: (i / totalPoints) * 5.0,    // km
      pace: Math.max(4.0, Math.min(8.0, pace)), // min/km, 4:00~8:00 범위
      bpm: Math.max(100, Math.min(195, bpm)),
      elevation: Math.max(0, elevation),
      cadence: Math.max(140, Math.min(200, cadence)),
    });
  }

  return points;
}