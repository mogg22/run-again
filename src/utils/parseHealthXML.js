/**
 * Apple Health export.xml → 내부 표준 포맷 변환
 * Settings → Health → Export All Health Data
 */
export function parseHealthXML(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");

  // 러닝 워크아웃 찾기
  const workouts = Array.from(
    xml.querySelectorAll('Workout[workoutActivityType="HKWorkoutActivityTypeRunning"]')
  );

  if (workouts.length === 0) throw new Error("러닝 워크아웃 데이터가 없습니다");

  // 가장 최근 러닝 선택
  const workout = workouts[workouts.length - 1];

  const startDate = new Date(workout.getAttribute("startDate")).getTime();
  const endDate = new Date(workout.getAttribute("endDate")).getTime();
  const totalDistance =
    parseFloat(workout.getAttribute("totalDistance") ?? "0");
  const totalTime = (endDate - startDate) / 1000;

  // WorkoutRoute에서 위치 데이터
  const locationSamples = Array.from(
    xml.querySelectorAll("WorkoutRoute Location")
  );

  // HeartRate 샘플
  const hrSamples = Array.from(
    xml.querySelectorAll(
      'Record[type="HKQuantityTypeIdentifierHeartRate"]'
    )
  ).map((r) => ({
    time: new Date(r.getAttribute("startDate")).getTime(),
    value: parseFloat(r.getAttribute("value")),
  }));

  // 포인트 합성 (10초 간격으로 리샘플링)
  const interval = 10; // seconds
  const count = Math.floor(totalTime / interval);
  const points = [];

  for (let i = 0; i < count; i++) {
    const t = i * interval;
    const absTime = startDate + t * 1000;
    const progress = t / totalTime;

    // 가장 가까운 HR 샘플 찾기
    const closestHR = findClosest(hrSamples, absTime);

    points.push({
      time: t,
      distance: progress * totalDistance,
      pace: totalTime / 60 / totalDistance, // 평균 페이스 (상세 데이터 없을 때)
      bpm: closestHR?.value ?? estimateBpmFromProgress(progress),
      elevation: 0, // Apple Health 기본 export에 고도 없음
      cadence: 0,
    });
  }

  return {
    meta: {
      title: "Apple Health Run",
      totalDistance,
      totalTime,
      date: new Date(startDate).toISOString().split("T")[0],
    },
    points,
  };
}

function findClosest(samples, targetTime) {
  if (!samples.length) return null;
  return samples.reduce((prev, curr) =>
    Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime)
      ? curr : prev
  );
}

function estimateBpmFromProgress(t) {
  // 진행률 기반 심박 추정 커브
  if (t < 0.1) return 120 + t * 400;
  if (t < 0.8) return 155 + Math.sin(t * 6) * 10;
  return 155 + (t - 0.8) * 150;
}