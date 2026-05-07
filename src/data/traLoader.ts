// TRA (台鐵) key express-stop stations — Western Trunk + East Coast routes
export const TRA_WESTERN_STATIONS = [
  { id: "W01", nameCh: "基隆",  nameEn: "Keelung",   lng: 121.7380, lat: 25.1327 },
  { id: "W02", nameCh: "台北",  nameEn: "Taipei",    lng: 121.5177, lat: 25.0489 },
  { id: "W03", nameCh: "板橋",  nameEn: "Banqiao",   lng: 121.4632, lat: 24.9883 },
  { id: "W04", nameCh: "桃園",  nameEn: "Taoyuan",   lng: 121.3133, lat: 24.9900 },
  { id: "W05", nameCh: "中壢",  nameEn: "Zhongli",   lng: 121.2168, lat: 24.9507 },
  { id: "W06", nameCh: "新竹",  nameEn: "Hsinchu",   lng: 120.9713, lat: 24.8017 },
  { id: "W07", nameCh: "苗栗",  nameEn: "Miaoli",    lng: 120.8163, lat: 24.5611 },
  { id: "W08", nameCh: "台中",  nameEn: "Taichung",  lng: 120.6862, lat: 24.1382 },
  { id: "W09", nameCh: "彰化",  nameEn: "Changhua",  lng: 120.5381, lat: 24.0766 },
  { id: "W10", nameCh: "嘉義",  nameEn: "Chiayi",    lng: 120.4490, lat: 23.4800 },
  { id: "W11", nameCh: "台南",  nameEn: "Tainan",    lng: 120.2019, lat: 22.9981 },
  { id: "W12", nameCh: "高雄",  nameEn: "Kaohsiung", lng: 120.3011, lat: 22.6396 },
];

export const TRA_EAST_STATIONS = [
  { id: "E01", nameCh: "台北",  nameEn: "Taipei",    lng: 121.5177, lat: 25.0489 },
  { id: "E02", nameCh: "南港",  nameEn: "Nangang",   lng: 121.6069, lat: 25.0534 },
  { id: "E03", nameCh: "瑞芳",  nameEn: "Ruifang",   lng: 121.8024, lat: 25.1083 },
  { id: "E04", nameCh: "宜蘭",  nameEn: "Yilan",     lng: 121.7549, lat: 24.7525 },
  { id: "E05", nameCh: "羅東",  nameEn: "Luodong",   lng: 121.7746, lat: 24.6779 },
  { id: "E06", nameCh: "蘇澳新", nameEn: "Suao New", lng: 121.8514, lat: 24.5952 },
  { id: "E07", nameCh: "新城",  nameEn: "Xincheng",  lng: 121.6409, lat: 24.1276 },
  { id: "E08", nameCh: "花蓮",  nameEn: "Hualien",   lng: 121.6010, lat: 23.9916 },
  { id: "E09", nameCh: "瑞穗",  nameEn: "Ruisui",    lng: 121.4170, lat: 23.4957 },
  { id: "E10", nameCh: "關山",  nameEn: "Guanshan",  lng: 121.1643, lat: 23.0457 },
  { id: "E11", nameCh: "台東",  nameEn: "Taitung",   lng: 121.1253, lat: 22.7991 },
];

export interface TraTrain {
  trainNo: string;
  route: "western" | "east";
  direction: 0 | 1;   // 0=SB, 1=NB
  lng: number;
  lat: number;
  bearing: number;
  fromStation: string;
  toStation: string;
  color: string;
}

function bearingDeg(fromLng: number, fromLat: number, toLng: number, toLat: number): number {
  return Math.atan2(toLng - fromLng, toLat - fromLat) * 180 / Math.PI;
}

// Western Trunk: Tze-Chiang (自強) cumulative minutes from Keelung (SB)
const W_ARRIVE = [0,  32,  41,  66,  76, 106, 132, 172, 185, 236, 274, 310];
const W_DEPART = [0,  34,  43,  68,  78, 108, 134, 174, 187, 238, 276, 310];
const JOURNEY_W = 310;

// East Coast: Puyuma/Taroko (普悠瑪/太魯閣) cumulative minutes from Taipei (SB)
const E_ARRIVE = [0,   5,  35,  90, 105, 120, 162, 177, 215, 250, 285];
const E_DEPART = [0,   7,  37,  92, 107, 122, 164, 179, 217, 252, 285];
const JOURNEY_E = 285;

// Departure schedule (minutes from midnight, Taiwan time)
const W_SB_DEPTS: number[] = [];
const W_NB_DEPTS: number[] = [];
const E_SB_DEPTS: number[] = [];
const E_NB_DEPTS: number[] = [];
for (let m = 6 * 60; m <= 21 * 60 + 30; m += 30) W_SB_DEPTS.push(m);
for (let m = 6 * 60 + 15; m <= 21 * 60 + 45; m += 30) W_NB_DEPTS.push(m);
for (let m = 6 * 60 + 30; m <= 21 * 60 + 30; m += 60) E_SB_DEPTS.push(m);
for (let m = 7 * 60; m <= 22 * 60; m += 60) E_NB_DEPTS.push(m);

type Station = { id: string; nameCh: string; nameEn: string; lng: number; lat: number };

function computePosition(
  nowOffsetMin: number,
  direction: 0 | 1,
  arrive: number[],
  depart: number[],
  journey: number,
  stations: Station[],
): { lng: number; lat: number; fromIdx: number; toIdx: number } | null {
  if (nowOffsetMin < 0 || nowOffsetMin > journey) return null;
  const n = stations.length;

  for (let k = 0; k < n; k++) {
    const arrK  = arrive[k]!;
    const deptK = depart[k]!;
    if (nowOffsetMin >= arrK && nowOffsetMin <= deptK) {
      const idx = direction === 0 ? k : n - 1 - k;
      const st = stations[idx]!;
      return { lng: st.lng, lat: st.lat, fromIdx: idx, toIdx: idx };
    }
    if (k < n - 1) {
      const arrK1 = arrive[k + 1]!;
      if (nowOffsetMin > deptK && nowOffsetMin < arrK1) {
        const seg = arrK1 - deptK;
        const progress = seg > 0 ? (nowOffsetMin - deptK) / seg : 0;
        const fromIdx = direction === 0 ? k     : n - 1 - k;
        const toIdx   = direction === 0 ? k + 1 : n - 2 - k;
        const from = stations[fromIdx]!;
        const to   = stations[toIdx]!;
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

export function computeTraTrains(nowUnixSec: number): TraTrain[] {
  const nowTW = nowUnixSec + 8 * 3600;
  const nowMinOfDay = (nowTW % 86400) / 60;
  const trains: TraTrain[] = [];
  const nW = TRA_WESTERN_STATIONS.length; // 12
  const nE = TRA_EAST_STATIONS.length;   // 11

  const process = (
    depts: number[],
    direction: 0 | 1,
    arrive: number[],
    depart: number[],
    journey: number,
    stations: Station[],
    route: "western" | "east",
    sbColor: string,
    nbColor: string,
    noPrefix: string,
  ) => {
    const n = stations.length;
    depts.forEach((termDept, i) => {
      let offset = nowMinOfDay - termDept;
      if (offset < -60) offset += 1440;
      const pos = computePosition(offset, direction, arrive, depart, journey, stations);
      if (!pos) return;
      const from = stations[pos.fromIdx]!;
      const to   = stations[pos.toIdx]!;
      const bng = pos.fromIdx !== pos.toIdx
        ? bearingDeg(from.lng, from.lat, to.lng, to.lat)
        : bearingDeg(from.lng, from.lat,
            direction === 0
              ? stations[Math.min(pos.fromIdx + 1, n - 1)]!.lng
              : stations[Math.max(pos.fromIdx - 1, 0)]!.lng,
            direction === 0
              ? stations[Math.min(pos.fromIdx + 1, n - 1)]!.lat
              : stations[Math.max(pos.fromIdx - 1, 0)]!.lat,
          );
      trains.push({
        trainNo: `${noPrefix}${String(1000 + i * 2 + direction).padStart(4, "0")}`,
        route,
        direction,
        lng: pos.lng,
        lat: pos.lat,
        bearing: bng,
        fromStation: from.nameCh,
        toStation: to.nameCh,
        color: direction === 0 ? sbColor : nbColor,
      });
    });
    void n; // suppress unused warning
  };

  // Western Trunk — Tze-Chiang (自強) express
  process(W_SB_DEPTS, 0, W_ARRIVE, W_DEPART, JOURNEY_W, TRA_WESTERN_STATIONS, "western", "#ef4444", "#f87171", "W");
  process(W_NB_DEPTS, 1, W_ARRIVE, W_DEPART, JOURNEY_W, TRA_WESTERN_STATIONS, "western", "#ef4444", "#f87171", "W");

  // East Coast — Puyuma/Taroko (普悠瑪/太魯閣)
  process(E_SB_DEPTS, 0, E_ARRIVE, E_DEPART, JOURNEY_E, TRA_EAST_STATIONS, "east", "#a855f7", "#c084fc", "E");
  process(E_NB_DEPTS, 1, E_ARRIVE, E_DEPART, JOURNEY_E, TRA_EAST_STATIONS, "east", "#a855f7", "#c084fc", "E");

  void nW; void nE;
  return trains;
}

export function buildTraGeoJSON(trains: TraTrain[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: trains.map((t) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      properties: {
        trainNo: t.trainNo,
        route: t.route,
        direction: t.direction,
        fromStation: t.fromStation,
        toStation: t.toStation,
        bearing: Math.round(t.bearing),
        color: t.color,
      },
    })),
  };
}
