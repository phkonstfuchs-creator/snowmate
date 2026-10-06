/* Static OpenStreetMap aerialway reference data, retrieved 2026-10-06.
 * Coordinates are [latitude, longitude]. Source: © OpenStreetMap contributors,
 * ODbL 1.0, https://www.openstreetmap.org/copyright.
 * Each osmWayId links to https://www.openstreetmap.org/way/<id>.
 * osmUpdatedAt records the OSM element version used for this snapshot.
 * A derived duration uses the OSM way geometry length and a nominal speed
 * for its aerialway type; it is not an operator timetable. Tal-/Bergstation
 * orientation was cross-checked once against Open-Meteo's public elevation API
 * using only fixed OSM station coordinates, never a rider's location. */

export interface Lift {
  id: string;
  resort: string;
  name: string;
  topStationName?: string;
  /** OSM station node supplying topStationName, if present. */
  topStationOsmNodeId?: number;
  bottomCoordinates: readonly [number, number];
  topCoordinates: readonly [number, number];
  durationMinutes: number;
  durationSource: "osm" | "derived";
  aerialwayType: AerialwayType;
  /** OSM way geometry length, rounded to metres. */
  lengthMeters: number;
  /** Explicit heuristic assumption; present only when durationSource is derived. */
  assumedSpeedMetersPerSecond?: number;
  osmWayId: number;
  osmUpdatedAt: string;
}

export type AerialwayType = "cable_car" | "gondola" | "chair_lift" | "drag_lift" | "t-bar" | "j-bar" | "platter" | "magic_carpet" | "mixed_lift" | "funicular";

/** Nominal speeds for missing OSM durations, never current operating speeds. */
export const NOMINAL_LIFT_SPEED_METERS_PER_SECOND: Readonly<Record<AerialwayType, number>> = {
  cable_car: 8, gondola: 5, chair_lift: 2.5, drag_lift: 2,
  "t-bar": 2, "j-bar": 2, platter: 2, magic_carpet: 0.7,
  mixed_lift: 4, funicular: 8,
};

export function deriveDurationMinutes(lengthMeters: number, aerialwayType: AerialwayType): number {
  return Math.ceil(lengthMeters / NOMINAL_LIFT_SPEED_METERS_PER_SECOND[aerialwayType] / 60);
}

export const LIFTS: readonly Lift[] = [
  {
    id: "osm-way-26531292", resort: "Stubai Glacier", name: "Schaufeljochbahn",
    bottomCoordinates: [46.9870622, 11.114539], topCoordinates: [46.9771581, 11.1108104],
    aerialwayType: "gondola", lengthMeters: 1137,
    durationMinutes: 4.3, durationSource: "osm",
    osmWayId: 26531292, osmUpdatedAt: "2024-11-21T19:59:22Z",
  },
  {
    id: "osm-way-27174768", resort: "Stubai Glacier", name: "6er Sesselbahn Eisjoch",
    bottomCoordinates: [46.9960565, 11.1186865], topCoordinates: [46.9772452, 11.1083168],
    aerialwayType: "chair_lift", lengthMeters: 2235,
    durationMinutes: 8.3, durationSource: "osm",
    osmWayId: 27174768, osmUpdatedAt: "2024-11-21T19:59:22Z",
  },
  {
    id: "osm-way-27174767", resort: "Stubai Glacier", name: "8er Sesselbahn Rotadl",
    bottomCoordinates: [46.9963184, 11.1179534], topCoordinates: [46.9872982, 11.1068862],
    aerialwayType: "chair_lift", lengthMeters: 1308,
    durationMinutes: 5, durationSource: "osm",
    osmWayId: 27174767, osmUpdatedAt: "2024-11-21T19:59:22Z",
  },
  {
    id: "osm-way-447819757", resort: "Stubai Glacier", name: "Eisgratbahn 2",
    bottomCoordinates: [46.9969764, 11.1409708], topCoordinates: [46.9871583, 11.1149725],
    aerialwayType: "gondola", lengthMeters: 2254,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 447819757, osmUpdatedAt: "2024-11-21T19:59:22Z",
  },
  {
    id: "osm-way-25170582", resort: "Nordkette", name: "Seegrubenbahn",
    topStationName: "Seegrube", topStationOsmNodeId: 274379246,
    bottomCoordinates: [47.2861686, 11.3990069], topCoordinates: [47.3063876, 11.3797446],
    aerialwayType: "cable_car", lengthMeters: 2677,
    durationMinutes: 5.33, durationSource: "osm",
    osmWayId: 25170582, osmUpdatedAt: "2026-02-18T17:18:15Z",
  },
  {
    id: "osm-way-25282282", resort: "Nordkette", name: "Hafelekarbahn",
    topStationName: "Hafelekar", topStationOsmNodeId: 275415175,
    bottomCoordinates: [47.3065543, 11.3797879], topCoordinates: [47.3119756, 11.3835664],
    aerialwayType: "cable_car", lengthMeters: 667,
    durationMinutes: 2, durationSource: "osm",
    osmWayId: 25282282, osmUpdatedAt: "2026-05-10T11:12:03Z",
  },
  {
    id: "osm-way-25750412", resort: "Nordkette", name: "Seegrube",
    bottomCoordinates: [47.3026998, 11.3835873], topCoordinates: [47.3065781, 11.3801623],
    aerialwayType: "chair_lift", lengthMeters: 503,
    durationMinutes: 5.16667, durationSource: "osm",
    osmWayId: 25750412, osmUpdatedAt: "2026-05-10T11:12:40Z",
  },
  {
    id: "osm-way-1064844583", resort: "Axamer Lizum", name: "Hoadlbahn",
    bottomCoordinates: [47.1953681, 11.3021019], topCoordinates: [47.1896137, 11.2897405],
    aerialwayType: "gondola", lengthMeters: 1132,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 1064844583, osmUpdatedAt: "2026-08-19T11:14:13Z",
  },
  {
    id: "osm-way-1526166177", resort: "Axamer Lizum", name: "Hoadlbahn",
    bottomCoordinates: [47.1896137, 11.2897405], topCoordinates: [47.1835282, 11.2813978],
    aerialwayType: "gondola", lengthMeters: 925,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 1526166177, osmUpdatedAt: "2026-08-19T11:14:13Z",
  },
  {
    id: "osm-way-25298607", resort: "Axamer Lizum", name: "Birgitzköpfl",
    bottomCoordinates: [47.1940698, 11.3035356], topCoordinates: [47.1947778, 11.3165157],
    aerialwayType: "chair_lift", lengthMeters: 984,
    durationMinutes: 7, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 25298607, osmUpdatedAt: "2024-08-31T11:13:59Z",
  },
  {
    id: "osm-way-144280300", resort: "Axamer Lizum", name: "Pleisen",
    bottomCoordinates: [47.1962824, 11.292046], topCoordinates: [47.1931381, 11.2800063],
    aerialwayType: "chair_lift", lengthMeters: 975,
    durationMinutes: 7, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 144280300, osmUpdatedAt: "2021-04-26T07:18:37Z",
  },
  {
    id: "osm-way-1214995327", resort: "Schlick 2000", name: "Galtbergbahn",
    bottomCoordinates: [47.1568159, 11.3355921], topCoordinates: [47.1503261, 11.3201012],
    aerialwayType: "gondola", lengthMeters: 1376,
    durationMinutes: 4, durationSource: "osm",
    osmWayId: 1214995327, osmUpdatedAt: "2024-11-29T15:21:54Z",
  },
  {
    id: "osm-way-26506233", resort: "Schlick 2000", name: "Kreuzjochbahn",
    bottomCoordinates: [47.1564474, 11.3327143], topCoordinates: [47.1453872, 11.3071179],
    aerialwayType: "gondola", lengthMeters: 2293,
    durationMinutes: 15, durationSource: "osm",
    osmWayId: 26506233, osmUpdatedAt: "2026-06-04T16:05:38Z",
  },
  {
    id: "osm-way-29263441", resort: "Schlick 2000", name: "Panoramabahn",
    bottomCoordinates: [47.1467686, 11.3000486], topCoordinates: [47.1446311, 11.306683],
    aerialwayType: "chair_lift", lengthMeters: 555,
    durationMinutes: 3.66667, durationSource: "osm",
    osmWayId: 29263441, osmUpdatedAt: "2020-02-27T14:03:39Z",
  },
  {
    id: "osm-way-29262933", resort: "Schlick 2000", name: "Vierersesselbahn Sennjoch",
    bottomCoordinates: [47.1540484, 11.3029255], topCoordinates: [47.138122, 11.2957976],
    aerialwayType: "chair_lift", lengthMeters: 1851,
    durationMinutes: 8.5, durationSource: "osm",
    osmWayId: 29262933, osmUpdatedAt: "2021-01-06T18:37:26Z",
  },
  {
    id: "osm-way-23362765", resort: "Kühtai", name: "Wiesbergbahn",
    bottomCoordinates: [47.2141242, 11.0258133], topCoordinates: [47.2097753, 11.0293708],
    aerialwayType: "chair_lift", lengthMeters: 553,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 23362765, osmUpdatedAt: "2022-03-11T16:13:57Z",
  },
  {
    id: "osm-way-23362775", resort: "Kühtai", name: "DreiSeenBahn",
    bottomCoordinates: [47.2117499, 11.0151604], topCoordinates: [47.2049396, 11.03923],
    aerialwayType: "chair_lift", lengthMeters: 1970,
    durationMinutes: 14, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 23362775, osmUpdatedAt: "2026-02-18T13:41:20Z",
  },
  {
    id: "osm-way-37126033", resort: "Kühtai", name: "KaiserBahn",
    bottomCoordinates: [47.2117185, 11.0107028], topCoordinates: [47.2259653, 11.0106746],
    aerialwayType: "gondola", lengthMeters: 1584,
    durationMinutes: 6, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 37126033, osmUpdatedAt: "2022-03-11T16:13:57Z",
  },
  {
    id: "osm-way-23362764", resort: "Kühtai", name: "HochAlterBahn",
    bottomCoordinates: [47.2149664, 11.0258986], topCoordinates: [47.2301882, 11.0276106],
    aerialwayType: "chair_lift", lengthMeters: 1698,
    durationMinutes: 12, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 23362764, osmUpdatedAt: "2022-03-11T16:13:57Z",
  },
  {
    id: "osm-way-842247153", resort: "Glungezer", name: "Tulfein Express (Glungezerbahn II)",
    bottomCoordinates: [47.2415086, 11.5434042], topCoordinates: [47.2263738, 11.5298313],
    aerialwayType: "mixed_lift", lengthMeters: 1970,
    durationMinutes: 9, durationSource: "derived",
    assumedSpeedMetersPerSecond: 4,
    osmWayId: 842247153, osmUpdatedAt: "2026-02-25T12:09:31Z",
  },
  {
    id: "osm-way-54302055", resort: "Glungezer", name: "Schartenkogel",
    bottomCoordinates: [47.2249662, 11.5221261], topCoordinates: [47.2176966, 11.5354841],
    aerialwayType: "chair_lift", lengthMeters: 1293,
    durationMinutes: 9, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 54302055, osmUpdatedAt: "2023-12-08T19:33:33Z",
  },
  {
    id: "osm-way-485884144", resort: "Patscherkofel", name: "Patscherkofelbahn",
    bottomCoordinates: [47.2220722, 11.4267503], topCoordinates: [47.2100577, 11.4517528],
    aerialwayType: "gondola", lengthMeters: 2412,
    durationMinutes: 10, durationSource: "osm",
    osmWayId: 485884144, osmUpdatedAt: "2024-10-22T20:01:52Z",
  },
  {
    id: "osm-way-293962729", resort: "Patscherkofel", name: "Übungslift Patscherkofel",
    bottomCoordinates: [47.2073308, 11.4485076], topCoordinates: [47.2076754, 11.451281],
    aerialwayType: "t-bar", lengthMeters: 213,
    durationMinutes: 2, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2,
    osmWayId: 293962729, osmUpdatedAt: "2024-09-26T00:46:26Z",
  },
  {
    id: "osm-way-22715771", resort: "Bergeralm", name: "Bergeralmbahn",
    bottomCoordinates: [47.0868358, 11.4597387], topCoordinates: [47.076209, 11.4546097],
    aerialwayType: "gondola", lengthMeters: 1244,
    durationMinutes: 4, durationSource: "osm",
    osmWayId: 22715771, osmUpdatedAt: "2026-02-18T16:50:30Z",
  },
  {
    id: "osm-way-22715772", resort: "Bergeralm", name: "Kombibahn Hoher Turm",
    bottomCoordinates: [47.0764709, 11.453853], topCoordinates: [47.0603119, 11.4430913],
    aerialwayType: "mixed_lift", lengthMeters: 1973,
    durationMinutes: 7, durationSource: "osm",
    osmWayId: 22715772, osmUpdatedAt: "2026-01-17T23:14:02Z",
  },
  {
    id: "osm-way-22715773", resort: "Bergeralm", name: "Steinboden",
    bottomCoordinates: [47.0761688, 11.4530993], topCoordinates: [47.0694088, 11.4488754],
    aerialwayType: "chair_lift", lengthMeters: 817,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 22715773, osmUpdatedAt: "2024-09-26T00:46:26Z",
  },
  {
    id: "osm-way-26698910", resort: "Rangger Köpfl", name: "Peter Anich I",
    bottomCoordinates: [47.2457141, 11.2374879], topCoordinates: [47.2382715, 11.2214206],
    aerialwayType: "gondola", lengthMeters: 1469,
    durationMinutes: 5, durationSource: "osm",
    osmWayId: 26698910, osmUpdatedAt: "2024-10-17T13:28:26Z",
  },
  {
    id: "osm-way-26698926", resort: "Rangger Köpfl", name: "Peter Anich II",
    bottomCoordinates: [47.2382517, 11.221035], topCoordinates: [47.2402322, 11.1998485],
    aerialwayType: "gondola", lengthMeters: 1615,
    durationMinutes: 5, durationSource: "osm",
    osmWayId: 26698926, osmUpdatedAt: "2024-10-17T13:28:26Z",
  },
  {
    id: "osm-way-26698984", resort: "Rangger Köpfl", name: "Peter Anich III",
    bottomCoordinates: [47.2404176, 11.1992746], topCoordinates: [47.2423269, 11.1824806],
    aerialwayType: "mixed_lift", lengthMeters: 1285,
    durationMinutes: 5, durationSource: "osm",
    osmWayId: 26698984, osmUpdatedAt: "2026-07-25T10:19:42Z",
  },
  {
    id: "osm-way-27755623", resort: "Hochoetz", name: "Acherkogelbahn",
    bottomCoordinates: [47.1998692, 10.9030702], topCoordinates: [47.2120577, 10.9318421],
    aerialwayType: "gondola", lengthMeters: 2561,
    durationMinutes: 9, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 27755623, osmUpdatedAt: "2026-08-06T13:00:34Z",
  },
  {
    id: "osm-way-93716244", resort: "Hochoetz", name: "Acherkogel Sektion II",
    bottomCoordinates: [47.207531, 10.9167469], topCoordinates: [47.2121894, 10.931786],
    aerialwayType: "chair_lift", lengthMeters: 1249,
    durationMinutes: 9, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 93716244, osmUpdatedAt: "2021-04-27T20:24:28Z",
  },
  {
    id: "osm-way-30816523", resort: "Hochoetz", name: "Brunnenkopf",
    bottomCoordinates: [47.2105744, 10.9286948], topCoordinates: [47.2077926, 10.9360876],
    aerialwayType: "chair_lift", lengthMeters: 638,
    durationMinutes: 5, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 30816523, osmUpdatedAt: "2021-04-27T20:24:28Z",
  },
  {
    id: "osm-way-26746748", resort: "Mutterer Alm", name: "Muttereralmbahn",
    bottomCoordinates: [47.2224359, 11.3662713], topCoordinates: [47.2115726, 11.3337052],
    aerialwayType: "gondola", lengthMeters: 2740,
    durationMinutes: 10, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 26746748, osmUpdatedAt: "2026-02-18T17:28:21Z",
  },
  {
    id: "osm-way-26779051", resort: "Serlesbahnen Mieders", name: "Serlesbahn",
    bottomCoordinates: [47.1635762, 11.3800561], topCoordinates: [47.1499574, 11.3950092],
    aerialwayType: "gondola", lengthMeters: 1890,
    durationMinutes: 7, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 26779051, osmUpdatedAt: "2022-11-30T22:19:15Z",
  },
  {
    id: "osm-way-29284858", resort: "Serlesbahnen Mieders", name: "Lärchenlift",
    bottomCoordinates: [47.1635481, 11.3802495], topCoordinates: [47.1618336, 11.382146],
    aerialwayType: "platter", lengthMeters: 239,
    durationMinutes: 2, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2,
    osmWayId: 29284858, osmUpdatedAt: "2022-11-30T22:19:15Z",
  },
  {
    id: "osm-way-29284449", resort: "Serlesbahnen Mieders", name: "Waldrastecklift",
    bottomCoordinates: [47.1574314, 11.395341], topCoordinates: [47.1493167, 11.3961079],
    aerialwayType: "t-bar", lengthMeters: 904,
    durationMinutes: 8, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2,
    osmWayId: 29284449, osmUpdatedAt: "2022-11-30T22:19:15Z",
  },
  {
    id: "osm-way-29330800", resort: "Sölden", name: "Giggijochbahn",
    bottomCoordinates: [46.9725038, 11.0086824], topCoordinates: [46.9752626, 10.9759819],
    aerialwayType: "gondola", lengthMeters: 2500,
    durationMinutes: 8.87, durationSource: "osm",
    osmWayId: 29330800, osmUpdatedAt: "2025-01-12T07:56:04Z",
  },
  {
    id: "osm-way-30816314", resort: "Sölden", name: "Gaislachkoglbahn I",
    bottomCoordinates: [46.9599985, 11.0094183], topCoordinates: [46.9509576, 10.9879864],
    aerialwayType: "gondola", lengthMeters: 1912,
    durationMinutes: 6.67, durationSource: "osm",
    osmWayId: 30816314, osmUpdatedAt: "2024-06-09T20:27:31Z",
  },
  {
    id: "osm-way-24189367", resort: "Sölden", name: "Langeggbahn",
    bottomCoordinates: [46.9657979, 10.9867604], topCoordinates: [46.9657239, 10.9585369],
    aerialwayType: "chair_lift", lengthMeters: 2142,
    durationMinutes: 7.5, durationSource: "osm",
    osmWayId: 24189367, osmUpdatedAt: "2025-08-19T09:58:20Z",
  },
  {
    id: "osm-way-30816315", resort: "Sölden", name: "Wasserkar",
    bottomCoordinates: [46.9544794, 10.9970255], topCoordinates: [46.945966, 10.9838622],
    aerialwayType: "chair_lift", lengthMeters: 1376,
    durationMinutes: 5.5, durationSource: "osm",
    osmWayId: 30816315, osmUpdatedAt: "2024-01-15T13:07:26Z",
  },
  {
    id: "osm-way-91739594", resort: "Saalbach-Hinterglemm", name: "Schattberg X-Press I",
    bottomCoordinates: [47.3903051, 12.6352801], topCoordinates: [47.3803993, 12.6329214],
    aerialwayType: "gondola", lengthMeters: 1116,
    durationMinutes: 4.5, durationSource: "osm",
    osmWayId: 91739594, osmUpdatedAt: "2026-03-31T21:55:40Z",
  },
  {
    id: "osm-way-29877382", resort: "Saalbach-Hinterglemm", name: "Bernkogelbahn",
    bottomCoordinates: [47.3930485, 12.6359634], topCoordinates: [47.4037902, 12.6159202],
    aerialwayType: "gondola", lengthMeters: 1924,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 29877382, osmUpdatedAt: "2024-02-27T11:04:49Z",
  },
  {
    id: "osm-way-989835855", resort: "Saalbach-Hinterglemm", name: "Kohlmaisbahn I",
    bottomCoordinates: [47.3920773, 12.640183], topCoordinates: [47.4008951, 12.6463329],
    aerialwayType: "gondola", lengthMeters: 1084,
    durationMinutes: 3.5, durationSource: "osm",
    osmWayId: 989835855, osmUpdatedAt: "2026-08-26T16:22:03Z",
  },
  {
    id: "osm-way-143200349", resort: "Saalbach-Hinterglemm", name: "Schattberg X-Press II",
    bottomCoordinates: [47.3803993, 12.6329214], topCoordinates: [47.3678774, 12.6379921],
    aerialwayType: "gondola", lengthMeters: 1444,
    durationMinutes: 5.7, durationSource: "osm",
    osmWayId: 143200349, osmUpdatedAt: "2026-03-31T21:55:40Z",
  },
  {
    id: "osm-way-23149679", resort: "Flachau", name: "achterjet",
    bottomCoordinates: [47.3534277, 13.3856177], topCoordinates: [47.334821, 13.3580801],
    aerialwayType: "gondola", lengthMeters: 2930,
    durationMinutes: 10, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 23149679, osmUpdatedAt: "2022-02-27T18:24:01Z",
  },
  {
    id: "osm-way-30745873", resort: "Flachau", name: "starjet 1",
    bottomCoordinates: [47.3438327, 13.3891297], topCoordinates: [47.3405705, 13.3700619],
    aerialwayType: "chair_lift", lengthMeters: 1482,
    durationMinutes: 10, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 30745873, osmUpdatedAt: "2020-03-07T09:59:07Z",
  },
  {
    id: "osm-way-23149659", resort: "Flachau", name: "starjet 2",
    bottomCoordinates: [47.3419061, 13.3705135], topCoordinates: [47.3302118, 13.3528729],
    aerialwayType: "chair_lift", lengthMeters: 1860,
    durationMinutes: 13, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 23149659, osmUpdatedAt: "2024-03-14T12:21:45Z",
  },
  {
    id: "osm-way-673539309", resort: "Kitzsteinhorn", name: "3K K-onnection Kaprun Kitzsteinhorn",
    bottomCoordinates: [47.2579425, 12.7158426], topCoordinates: [47.2210141, 12.6993163],
    aerialwayType: "gondola", lengthMeters: 4292,
    durationMinutes: 9, durationSource: "osm",
    osmWayId: 673539309, osmUpdatedAt: "2026-06-11T20:02:47Z",
  },
  {
    id: "osm-way-15503046", resort: "Kitzsteinhorn", name: "Gletscherjet I",
    bottomCoordinates: [47.2289765, 12.7259781], topCoordinates: [47.2201715, 12.699736],
    aerialwayType: "gondola", lengthMeters: 2210,
    durationMinutes: 9, durationSource: "osm",
    osmWayId: 15503046, osmUpdatedAt: "2026-02-21T21:10:45Z",
  },
  {
    id: "osm-way-14498567", resort: "Kitzsteinhorn", name: "Gletscherjet II",
    bottomCoordinates: [47.2198485, 12.6993779], topCoordinates: [47.2091658, 12.6895814],
    aerialwayType: "gondola", lengthMeters: 1399,
    durationMinutes: 4, durationSource: "osm",
    osmWayId: 14498567, osmUpdatedAt: "2026-02-21T21:10:30Z",
  },
  {
    id: "osm-way-104403103", resort: "Zell am See", name: "cityXpress",
    bottomCoordinates: [47.3235538, 12.7940983], topCoordinates: [47.3160265, 12.771424],
    aerialwayType: "gondola", lengthMeters: 1903,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 104403103, osmUpdatedAt: "2026-07-09T07:25:37Z",
  },
  {
    id: "osm-way-30473147", resort: "Zell am See", name: "trassXpress",
    bottomCoordinates: [47.3262651, 12.7723618], topCoordinates: [47.3242268, 12.7368876],
    aerialwayType: "gondola", lengthMeters: 2683,
    durationMinutes: 8.95, durationSource: "osm",
    osmWayId: 30473147, osmUpdatedAt: "2026-02-27T21:55:37Z",
  },
  {
    id: "osm-way-5213151", resort: "Zell am See", name: "Schmittenhöhebahn",
    bottomCoordinates: [47.3263696, 12.772307], topCoordinates: [47.328845, 12.7384498],
    aerialwayType: "cable_car", lengthMeters: 2567,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 5213151, osmUpdatedAt: "2023-10-16T06:39:27Z",
  },
  {
    id: "osm-way-1551817347", resort: "Wagrain", name: "Grafenbergbahn 1",
    bottomCoordinates: [47.3281515, 13.2997065], topCoordinates: [47.3233275, 13.2902543],
    aerialwayType: "gondola", lengthMeters: 892,
    durationMinutes: 3, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 1551817347, osmUpdatedAt: "2026-09-14T06:49:19Z",
  },
  {
    id: "osm-way-23149574", resort: "Wagrain", name: "Flying Mozart I",
    bottomCoordinates: [47.3339793, 13.308702], topCoordinates: [47.3299387, 13.3209675],
    aerialwayType: "gondola", lengthMeters: 1028,
    durationMinutes: 4, durationSource: "derived",
    assumedSpeedMetersPerSecond: 5,
    osmWayId: 23149574, osmUpdatedAt: "2024-11-10T19:45:51Z",
  },
  {
    id: "osm-way-187714641", resort: "Bad Gastein", name: "Stubnerkogelbahn I",
    bottomCoordinates: [47.1105098, 13.1315022], topCoordinates: [47.1113977, 13.1121408],
    aerialwayType: "gondola", lengthMeters: 1469,
    durationMinutes: 6, durationSource: "osm",
    osmWayId: 187714641, osmUpdatedAt: "2026-06-29T11:58:18Z",
  },
  {
    id: "osm-way-448912800", resort: "Bad Gastein", name: "Stubnerkogelbahn II",
    bottomCoordinates: [47.1113977, 13.1121408], topCoordinates: [47.11188, 13.0991738],
    aerialwayType: "gondola", lengthMeters: 983,
    durationMinutes: 5, durationSource: "osm",
    osmWayId: 448912800, osmUpdatedAt: "2026-06-29T11:58:18Z",
  },
  {
    id: "osm-way-443576005", resort: "Bad Gastein", name: "Graukogel I",
    bottomCoordinates: [47.1160812, 13.1398033], topCoordinates: [47.1109167, 13.1503694],
    aerialwayType: "chair_lift", lengthMeters: 984,
    durationMinutes: 7, durationSource: "derived",
    assumedSpeedMetersPerSecond: 2.5,
    osmWayId: 443576005, osmUpdatedAt: "2026-09-28T09:43:48Z",
  },
  {
    id: "osm-way-30783688", resort: "Hochkönig", name: "Dachegg",
    bottomCoordinates: [47.3889381, 13.033896], topCoordinates: [47.379963, 13.0472757],
    aerialwayType: "chair_lift", lengthMeters: 1418,
    durationMinutes: 5.33333, durationSource: "osm",
    osmWayId: 30783688, osmUpdatedAt: "2026-03-29T20:49:22Z",
  },
  {
    id: "osm-way-30783686", resort: "Hochkönig", name: "Zachhofalm",
    bottomCoordinates: [47.3880124, 13.0322388], topCoordinates: [47.3747434, 13.0327117],
    aerialwayType: "chair_lift", lengthMeters: 1476,
    durationMinutes: 5.66667, durationSource: "osm",
    osmWayId: 30783686, osmUpdatedAt: "2026-03-29T20:48:37Z",
  },
  {
    id: "osm-way-698595419", resort: "Hochkönig", name: "Gabühelbahn",
    bottomCoordinates: [47.3845904, 13.00476], topCoordinates: [47.3907888, 12.9867239],
    aerialwayType: "gondola", lengthMeters: 1523,
    durationMinutes: 4.83333, durationSource: "osm",
    osmWayId: 698595419, osmUpdatedAt: "2026-06-03T15:33:04Z",
  },
];
export function findLift(resort: string, liftId: string): Lift | undefined {
  return LIFTS.find((lift) => lift.resort === resort && lift.id === liftId);
}

export function liftsInResort(resort: string): readonly Lift[] {
  return LIFTS.filter((lift) => lift.resort === resort);
}
