// THSR station coordinates (WGS84), ordered Nangang→Zuoying (index 0=north, 11=south)
export const HSR_STATIONS = [
  { id: "1000", nameCh: "南港",  nameEn: "Nangang",  lng: 121.6075, lat: 25.0531 },
  { id: "1010", nameCh: "台北",  nameEn: "Taipei",   lng: 121.5173, lat: 25.0480 },
  { id: "1020", nameCh: "板橋",  nameEn: "Banqiao",  lng: 121.4636, lat: 24.9893 },
  { id: "1030", nameCh: "桃園",  nameEn: "Taoyuan",  lng: 121.2282, lat: 24.9793 },
  { id: "1035", nameCh: "新竹",  nameEn: "Hsinchu",  lng: 120.9929, lat: 24.7979 },
  { id: "1040", nameCh: "苗栗",  nameEn: "Miaoli",   lng: 120.8202, lat: 24.5680 },
  { id: "1045", nameCh: "台中",  nameEn: "Taichung", lng: 120.6858, lat: 24.1789 },
  { id: "1050", nameCh: "彰化",  nameEn: "Changhua", lng: 120.4761, lat: 24.0645 },
  { id: "1055", nameCh: "雲林",  nameEn: "Yunlin",   lng: 120.3169, lat: 23.7120 },
  { id: "1060", nameCh: "嘉義",  nameEn: "Chiayi",   lng: 120.3382, lat: 23.4945 },
  { id: "1065", nameCh: "台南",  nameEn: "Tainan",   lng: 120.1998, lat: 23.0117 },
  { id: "1070", nameCh: "左營",  nameEn: "Zuoying",  lng: 120.2975, lat: 22.6942 },
];

export interface HsrTrain {
  trainNo: string;
  direction: 0 | 1;   // 0=southbound (Nangang→Zuoying), 1=northbound (Zuoying→Nangang)
  lng: number;
  lat: number;
  bearing: number;    // clockwise degrees from north, for direction arrow rotation
  fromStation: string;
  toStation: string;
}

function bearingDeg(fromLng: number, fromLat: number, toLng: number, toLat: number): number {
  const dLng = toLng - fromLng;
  const dLat = toLat - fromLat;
  return Math.atan2(dLng, dLat) * 180 / Math.PI;
}

// Cumulative timetable from terminal (minutes).
// SB: station[0]=Nangang … station[11]=Zuoying
// ARRIVE[k] = minutes after leaving terminal when train arrives at station k
// DEPART[k] = minutes after leaving terminal when train departs station k (= ARRIVE[k]+2 for intermediates)
const SB_ARRIVE = [0,   5,  13,  28,  43,  58,  86,  97, 112, 129, 156, 173];
const SB_DEPART = [0,   7,  15,  30,  45,  60,  88,  99, 114, 131, 158, 173];

// NB: station[0]=Zuoying … station[11]=Nangang
const NB_ARRIVE = [0,  15,  42,  59,  74,  85, 113, 128, 143, 158, 166, 173];
const NB_DEPART = [0,  17,  44,  61,  76,  87, 115, 130, 145, 160, 168, 173];

const JOURNEY_MIN = 173;

// Generate departure times (minutes from midnight, Taiwan time)
// SB: Nangang every 20 min from 06:30 to 23:00
// NB: Zuoying every 20 min from 06:40 to 23:10 (offset +10 min)
const SB_DEPTS: number[] = [];
const NB_DEPTS: number[] = [];
for (let m = 6 * 60 + 30; m <= 23 * 60; m += 20) SB_DEPTS.push(m);
for (let m = 6 * 60 + 40; m <= 23 * 60 + 10; m += 20) NB_DEPTS.push(m);

function computePosition(
  nowOffsetMin: number,
  direction: 0 | 1,
): { lng: number; lat: number; fromIdx: number; toIdx: number } | null {
  if (nowOffsetMin < 0 || nowOffsetMin > JOURNEY_MIN) return null;

  const arrive = direction === 0 ? SB_ARRIVE : NB_ARRIVE;
  const depart = direction === 0 ? SB_DEPART : NB_DEPART;

  for (let k = 0; k < 12; k++) {
    const arrK  = arrive[k]!;
    const deptK = depart[k]!;
    // Dwell at station k
    if (nowOffsetMin >= arrK && nowOffsetMin <= deptK) {
      const idx = direction === 0 ? k : 11 - k;
      const st = HSR_STATIONS[idx]!;
      return { lng: st.lng, lat: st.lat, fromIdx: idx, toIdx: idx };
    }
    // In transit to station k+1
    if (k < 11) {
      const arrK1 = arrive[k + 1]!;
      if (nowOffsetMin > deptK && nowOffsetMin < arrK1) {
        const seg = arrK1 - deptK;
        const progress = seg > 0 ? (nowOffsetMin - deptK) / seg : 0;
        const fromIdx = direction === 0 ? k     : 11 - k;
        const toIdx   = direction === 0 ? k + 1 : 10 - k;
        const from = HSR_STATIONS[fromIdx]!;
        const to   = HSR_STATIONS[toIdx]!;
        return {
          lng: from.lng + (to.lng - from.lng) * progress,
          lat: from.lat + (to.lat - from.lat) * progress,
          fromIdx,
          toIdx,
        };
      }
    }
  }
  return null;
}

export function computeHsrTrains(nowUnixSec: number): HsrTrain[] {
  // Convert to Taiwan local minutes-since-midnight
  const nowTW = nowUnixSec + 8 * 3600;
  const nowMinOfDay = (nowTW % 86400) / 60;

  const trains: HsrTrain[] = [];

  const process = (depts: number[], direction: 0 | 1, prefix: string) => {
    depts.forEach((terminalDept, i) => {
      let offset = nowMinOfDay - terminalDept;
      // Handle trains that started before midnight but are now past midnight
      if (offset < -60) offset += 1440;
      const pos = computePosition(offset, direction);
      if (!pos) return;
      const trainNo = direction === 0
        ? String(100 + i * 2 + 1).padStart(4, "0")   // 0101, 0103, …
        : String(100 + i * 2 + 2).padStart(4, "0");  // 0102, 0104, …
      const from = HSR_STATIONS[pos.fromIdx]!;
      const to   = HSR_STATIONS[pos.toIdx]!;
      // bearing from current position toward destination (use segment direction even when dwelling)
      const bng = pos.fromIdx !== pos.toIdx
        ? bearingDeg(from.lng, from.lat, to.lng, to.lat)
        : bearingDeg(from.lng, from.lat,
            direction === 0 ? HSR_STATIONS[Math.min(pos.fromIdx + 1, 11)]!.lng : HSR_STATIONS[Math.max(pos.fromIdx - 1, 0)]!.lng,
            direction === 0 ? HSR_STATIONS[Math.min(pos.fromIdx + 1, 11)]!.lat : HSR_STATIONS[Math.max(pos.fromIdx - 1, 0)]!.lat);
      trains.push({
        trainNo: `${prefix}${trainNo}`,
        direction,
        lng: pos.lng,
        lat: pos.lat,
        bearing: bng,
        fromStation: from.nameCh,
        toStation: to.nameCh,
      });
    });
  };

  process(SB_DEPTS, 0, "");
  process(NB_DEPTS, 1, "");

  return trains;
}

export function buildHsrGeoJSON(trains: HsrTrain[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: trains.map((t) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      properties: {
        trainNo: t.trainNo,
        direction: t.direction,
        fromStation: t.fromStation,
        toStation: t.toStation,
        bearing: Math.round(t.bearing),
        color: t.direction === 0 ? "#fb923c" : "#60a5fa",
      },
    })),
  };
}
