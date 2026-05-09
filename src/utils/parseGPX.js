/**
 * GPX 파일 → 내부 표준 포맷 변환
 * Strava export 기준
 */
export function parseGPX(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");

  const trkpts = Array.from(xml.querySelectorAll("trkpt"));
  if (trkpts.length === 0) throw new Error("GPX에 trkpt 요소가 없습니다");

  const rawPoints = trkpts.map((pt) => ({
    lat: parseFloat(pt.getAttribute("lat")),
    lng: parseFloat(pt.getAttribute("lon")),
    elevation: parseFloat(pt.querySelector("ele")?.textContent ?? "0"),
    time: new Date(pt.querySelector("time")?.textContent ?? 0).getTime(),
    // Strava GPX 확장 필드
    bpm: parseInt(
      pt.querySelector("gpxtpx\\:hr, hr")?.textContent ?? "0"
    ),
    cadence: parseInt(
      pt.querySelector("gpxtpx\\:cad, cad")?.textContent ?? "0"
    ),
  }));

  return normalize(rawPoints);
}

function normalize(rawPoints) {
  const startTime = rawPoints[0].time;
  const points = [];

  for (let i = 0; i < rawPoints.length; i++) {
    const curr = rawPoints[i];
    const prev = rawPoints[i - 1];

    // 페이스 계산 (두 점 사이 거리/시간)
    let pace = 6.0;
    let distanceDelta = 0;

    if (prev) {
      const timeDelta = (curr.time - prev.time) / 1000; // seconds
      distanceDelta = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
      if (distanceDelta > 0 && timeDelta > 0) {
        pace = timeDelta / 60 / distanceDelta; // min/km
        pace = Math.max(3.0, Math.min(15.0, pace)); // 이상값 제거
      }
    }

    // 누적 거리
    const prevDistance = points[i - 1]?.distance ?? 0;

    points.push({
      time: (curr.time - startTime) / 1000,
      distance: prevDistance + distanceDelta,
      pace,
      bpm: curr.bpm || estimateBpm(pace),
      elevation: curr.elevation,
      cadence: curr.cadence || estimateCadence(pace),
    });
  }

  const totalDistance = points[points.length - 1]?.distance ?? 0;

  return {
    meta: {
      title: "Imported Run",
      totalDistance,
      totalTime: points[points.length - 1]?.time ?? 0,
      date: new Date().toISOString().split("T")[0],
    },
    points,
  };
}

// Haversine 공식 — 두 GPS 좌표 사이 거리 (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// bpm/cadence 데이터 없을 때 페이스 기반 추정
function estimateBpm(pace) {
  return Math.round(Math.max(110, Math.min(190, 220 - 22 * pace)));
}
function estimateCadence(pace) {
  return Math.round(Math.max(150, Math.min(200, 210 - 8 * pace)));
}