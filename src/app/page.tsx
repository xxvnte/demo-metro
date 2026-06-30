"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useId,
} from "react";
import { Inter, Barlow_Condensed } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

type Nivel = "bajo" | "medio" | "alto" | "critico";

type PredictionEntry = {
  hora: string;
  subidas_predichas: number;
  capacidad_max: number;
  saturacion_pct: number;
  nivel: string;
};

type PredictionsDataset = Record<string, PredictionEntry[]>;

type LineId = "L1" | "L2" | "L3" | "L4" | "L4A" | "L5" | "L6";

type MetroLine = {
  id: LineId;
  label: string;
  color: string;
  stations: string[];
};

type TopologyInfo = { displayName: string; lines: LineId[] };

type StationOption = {
  key: string;
  normalized: string;
  displayName: string;
  lines: LineId[];
};

type TimeSelection =
  | { mode: "instant"; hora: string }
  | { mode: "range"; from: string; to: string };

type StationForecast = {
  key: string;
  displayName: string;
  lines: LineId[];
  found: boolean;
  promedio: number | null;
  maximo: number | null;
  minimo: number | null;
  subidasPromedio: number | null;
  capacidadMax: number | null;
  nivel: Nivel | null;
};

type Transbordo = {
  enIndice: number;
  deLinea: LineId;
  aLinea: LineId;
};

type RouteForecast = {
  estaciones: StationForecast[];
  transbordos: Transbordo[];
  indicePonderado: number | null;
  promedioSimple: number | null;
  maximo: number | null;
  nivelGlobal: Nivel | null;
  estacionMasCritica: StationForecast | null;
  estacionesSinDatos: string[];
};

type HourlyAverage = { hora: string; avg: number; nivel: Nivel };

const METRO_LINES: MetroLine[] = [
  {
    id: "L1",
    label: "Línea 1",
    color: "#E4002B",
    stations: [
      "San Pablo",
      "Neptuno",
      "Pajaritos",
      "Las Rejas",
      "Ecuador",
      "San Alberto Hurtado",
      "Universidad de Santiago",
      "Estación Central",
      "Unión Latinoamericana",
      "República",
      "Los Héroes",
      "La Moneda",
      "Universidad de Chile",
      "Santa Lucía",
      "Universidad Católica",
      "Baquedano",
      "Salvador",
      "Manuel Montt",
      "Pedro de Valdivia",
      "Los Leones",
      "Tobalaba",
      "El Golf",
      "Alcántara",
      "Escuela Militar",
      "Manquehue",
      "Hernando de Magallanes",
      "Los Dominicos",
    ],
  },
  {
    id: "L2",
    label: "Línea 2",
    color: "#FFD400",
    stations: [
      "Vespucio Norte",
      "Zapadores",
      "Dorsal",
      "Einstein",
      "Cementerios",
      "Cerro Blanco",
      "Patronato",
      "Cal y Canto",
      "Santa Ana",
      "Los Héroes",
      "Toesca",
      "Parque O'Higgins",
      "Rondizzoni",
      "Franklin",
      "El Llano",
      "San Miguel",
      "Lo Vial",
      "Departamental",
      "Ciudad del Niño",
      "Lo Ovalle",
      "El Parrón",
      "La Cisterna",
      "El Bosque",
      "Observatorio",
      "Copa Lo Martínez",
      "Hospital El Pino",
    ],
  },
  {
    id: "L3",
    label: "Línea 3",
    color: "#7A3B12",
    stations: [
      "Plaza Quilicura",
      "Lo Cruzat",
      "Ferrocarril",
      "Los Libertadores",
      "Cardenal Caro",
      "Vivaceta",
      "Conchalí",
      "Plaza Chacabuco",
      "Hospitales",
      "Puente Cal y Canto",
      "Plaza de Armas",
      "Universidad de Chile",
      "Parque Almagro",
      "Matta",
      "Irarrázaval",
      "Monseñor Eyzaguirre",
      "Ñuñoa",
      "Chile España",
      "Villa Frei",
      "Plaza Egaña",
      "Fernando Castillo Velasco",
    ],
  },
  {
    id: "L4",
    label: "Línea 4",
    color: "#0033A0",
    stations: [
      "Tobalaba",
      "Cristóbal Colón",
      "Francisco Bilbao",
      "Príncipe de Gales",
      "Simón Bolívar",
      "Plaza Egaña",
      "Los Orientales",
      "Grecia",
      "Los Presidentes",
      "Quilín",
      "Las Torres",
      "Macul",
      "Vicuña Mackenna",
      "Vicente Valdés",
      "Rojas Magallanes",
      "Trinidad",
      "San José de la Estrella",
      "Los Quillayes",
      "Elisa Correa",
      "Hospital Sótero del Río",
      "Protectora de la Infancia",
      "Las Mercedes",
      "Plaza de Puente Alto",
    ],
  },
  {
    id: "L4A",
    label: "Línea 4A",
    color: "#00AEEF",
    stations: [
      "Vicuña Mackenna",
      "Santa Rosa",
      "Santa Julia",
      "La Granja",
      "San Ramón",
      "La Cisterna",
    ],
  },
  {
    id: "L5",
    label: "Línea 5",
    color: "#149E4A",
    stations: [
      "Plaza Maipú",
      "Santiago Bueras",
      "Del Sol",
      "Monte Tabor",
      "Las Parcelas",
      "Laguna Sur",
      "Barrancas",
      "Pudahuel",
      "San Pablo",
      "Lo Prado",
      "Blanqueado",
      "Gruta de Lourdes",
      "Quinta Normal",
      "Cumming",
      "Santa Ana",
      "Plaza de Armas",
      "Bellas Artes",
      "Baquedano",
      "Parque Bustamante",
      "Santa Isabel",
      "Irarrázaval",
      "Ñuble",
      "Rodrigo de Araya",
      "Carlos Valdovinos",
      "Camino Agrícola",
      "San Joaquín",
      "Pedrero",
      "Mirador",
      "Bellavista de La Florida",
      "Vicente Valdés",
    ],
  },
  {
    id: "L6",
    label: "Línea 6",
    color: "#92278F",
    stations: [
      "Cerrillos",
      "Pedro Aguirre Cerda",
      "Lo Valledor",
      "Franklin",
      "Bio Bío",
      "Ñuble",
      "Estadio Nacional",
      "Ñuñoa",
      "Inés de Suárez",
      "Los Leones",
    ],
  },
];

const NIVEL_META: Record<
  Nivel,
  { label: string; dot: string; bar: string; fill: string; chip: string }
> = {
  bajo: {
    label: "Baja",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    fill: "fill-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  medio: {
    label: "Media",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    fill: "fill-amber-500",
    chip: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  alto: {
    label: "Alta",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    fill: "fill-orange-500",
    chip: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  },
  critico: {
    label: "Crítica",
    dot: "bg-rose-600",
    bar: "bg-rose-600",
    fill: "fill-rose-600",
    chip: "bg-rose-600/10 text-rose-400 border-rose-600/30",
  },
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function mapRawNivel(raw: string | undefined): Nivel | null {
  if (!raw) return null;
  const n = normalize(raw);
  if (n.startsWith("BAJ")) return "bajo";
  if (n.startsWith("MED")) return "medio";
  if (n.startsWith("ALT")) return "alto";
  if (n.startsWith("CRIT")) return "critico";
  return null;
}

function classifyNivel(pct: number): Nivel {
  if (pct < 40) return "bajo";
  if (pct < 65) return "medio";
  if (pct < 85) return "alto";
  return "critico";
}

function toFallbackDisplayName(rawKey: string): string {
  return rawKey
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function buildTopologyIndex(): Map<string, TopologyInfo> {
  const map = new Map<string, TopologyInfo>();
  for (const line of METRO_LINES) {
    for (const stationName of line.stations) {
      const norm = normalize(stationName);
      const existing = map.get(norm);
      if (existing) {
        if (!existing.lines.includes(line.id)) existing.lines.push(line.id);
      } else {
        map.set(norm, { displayName: stationName, lines: [line.id] });
      }
    }
  }
  return map;
}

function buildStationOptions(
  dataset: PredictionsDataset,
  topology: Map<string, TopologyInfo>,
): StationOption[] {
  return Object.keys(dataset)
    .map((key) => {
      const normalized = normalize(key);
      const topo = topology.get(normalized);
      return {
        key,
        normalized,
        displayName: topo?.displayName ?? toFallbackDisplayName(key),
        lines: topo?.lines ?? [],
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
}

function getAvailableHours(dataset: PredictionsDataset): string[] {
  const set = new Set<string>();
  Object.values(dataset).forEach((entries) =>
    entries.forEach((e) => set.add(e.hora)),
  );
  return Array.from(set).sort();
}

function buildGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a)!.add(b);
    graph.get(b)!.add(a);
  };
  for (const line of METRO_LINES) {
    const normStations = line.stations.map(normalize);
    for (let i = 0; i < normStations.length - 1; i++) {
      addEdge(normStations[i], normStations[i + 1]);
    }
  }
  return graph;
}

function bfsPath(
  graph: Map<string, Set<string>>,
  from: string,
  to: string,
): string[] | null {
  if (from === to) return [from];
  if (!graph.has(from) || !graph.has(to)) return null;
  const visited = new Set<string>([from]);
  const queue: string[] = [from];
  const parent = new Map<string, string>();
  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = graph.get(current);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, current);
      if (next === to) {
        const path: string[] = [to];
        let cursor = to;
        while (cursor !== from) {
          cursor = parent.get(cursor)!;
          path.push(cursor);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

function lineForEdge(aNorm: string, bNorm: string): LineId | null {
  for (const line of METRO_LINES) {
    const normStations = line.stations.map(normalize);
    for (let i = 0; i < normStations.length - 1; i++) {
      const x = normStations[i];
      const y = normStations[i + 1];
      if ((x === aNorm && y === bNorm) || (x === bNorm && y === aNorm)) {
        return line.id;
      }
    }
  }
  return null;
}

function filterEntriesByTime(
  entries: PredictionEntry[],
  time: TimeSelection,
  hourIndex: Map<string, number>,
): PredictionEntry[] {
  if (time.mode === "instant") {
    return entries.filter((e) => e.hora === time.hora);
  }
  const fromIdx = hourIndex.get(time.from);
  const toIdx = hourIndex.get(time.to);
  if (fromIdx === undefined || toIdx === undefined) return [];
  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  return entries.filter((e) => {
    const idx = hourIndex.get(e.hora);
    return idx !== undefined && idx >= lo && idx <= hi;
  });
}

function buildForecastFromOption(
  dataset: PredictionsDataset,
  option: { key: string; displayName: string; lines: LineId[] },
  time: TimeSelection,
  hourIndex: Map<string, number>,
): StationForecast {
  const entries = dataset[option.key] ?? [];
  const filtered = filterEntriesByTime(entries, time, hourIndex);

  if (filtered.length === 0) {
    return {
      key: option.key,
      displayName: option.displayName,
      lines: option.lines,
      found: false,
      promedio: null,
      maximo: null,
      minimo: null,
      subidasPromedio: null,
      capacidadMax: null,
      nivel: null,
    };
  }

  const pcts = filtered.map((e) => e.saturacion_pct);
  const promedio = average(pcts);

  return {
    key: option.key,
    displayName: option.displayName,
    lines: option.lines,
    found: true,
    promedio,
    maximo: Math.max(...pcts),
    minimo: Math.min(...pcts),
    subidasPromedio: average(filtered.map((e) => e.subidas_predichas)),
    capacidadMax: filtered[0].capacidad_max,
    nivel: classifyNivel(promedio),
  };
}

function buildRouteForecast(
  dataset: PredictionsDataset,
  graph: Map<string, Set<string>>,
  topology: Map<string, TopologyInfo>,
  datasetByNormalized: Map<string, string>,
  originNorm: string,
  destNorm: string,
  time: TimeSelection,
  hourIndex: Map<string, number>,
): RouteForecast | null {
  const pathNorm = bfsPath(graph, originNorm, destNorm);
  if (!pathNorm) return null;

  const estaciones: StationForecast[] = pathNorm.map((norm) => {
    const topo = topology.get(norm);
    const realKey = datasetByNormalized.get(norm);
    const displayName = topo?.displayName ?? norm;
    const lines = topo?.lines ?? [];

    if (!realKey) {
      return {
        key: norm,
        displayName,
        lines,
        found: false,
        promedio: null,
        maximo: null,
        minimo: null,
        subidasPromedio: null,
        capacidadMax: null,
        nivel: null,
      };
    }
    return buildForecastFromOption(
      dataset,
      { key: realKey, displayName, lines },
      time,
      hourIndex,
    );
  });

  const transbordos: Transbordo[] = [];
  for (let i = 1; i < pathNorm.length; i++) {
    const prevLine =
      i >= 2 ? lineForEdge(pathNorm[i - 2], pathNorm[i - 1]) : null;
    const currentLine = lineForEdge(pathNorm[i - 1], pathNorm[i]);
    if (prevLine && currentLine && prevLine !== currentLine) {
      transbordos.push({
        enIndice: i - 1,
        deLinea: prevLine,
        aLinea: currentLine,
      });
    }
  }

  const found = estaciones.filter((e) => e.found);
  const estacionesSinDatos = estaciones
    .filter((e) => !e.found)
    .map((e) => e.displayName);

  let indicePonderado: number | null = null;
  if (found.length > 0) {
    const totalPeso = found.reduce(
      (acc, e) => acc + (e.subidasPromedio ?? 0),
      0,
    );
    if (totalPeso > 0) {
      indicePonderado =
        found.reduce(
          (acc, e) => acc + (e.promedio ?? 0) * (e.subidasPromedio ?? 0),
          0,
        ) / totalPeso;
    } else {
      indicePonderado = average(found.map((e) => e.promedio ?? 0));
    }
  }

  const promedioSimple =
    found.length > 0 ? average(found.map((e) => e.promedio ?? 0)) : null;
  const maximo =
    found.length > 0 ? Math.max(...found.map((e) => e.maximo ?? 0)) : null;
  const estacionMasCritica =
    found.length > 0
      ? found.reduce((worst, current) =>
          (current.promedio ?? 0) > (worst.promedio ?? 0) ? current : worst,
        )
      : null;
  const nivelGlobal =
    indicePonderado !== null ? classifyNivel(indicePonderado) : null;

  return {
    estaciones,
    transbordos,
    indicePonderado,
    promedioSimple,
    maximo,
    nivelGlobal,
    estacionMasCritica,
    estacionesSinDatos,
  };
}

function computeNetworkHourlyAverages(
  stationOptions: StationOption[],
  getFullDayEntries: (key: string) => PredictionEntry[],
): HourlyAverage[] {
  const map = new Map<string, number[]>();
  stationOptions.forEach((opt) => {
    getFullDayEntries(opt.key).forEach((e) => {
      const arr = map.get(e.hora) ?? [];
      arr.push(e.saturacion_pct);
      map.set(e.hora, arr);
    });
  });
  return Array.from(map.entries())
    .map(([hora, pcts]) => {
      const avg = average(pcts);
      return { hora, avg, nivel: classifyNivel(avg) };
    })
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

async function fetchPredictions(): Promise<PredictionsDataset> {
  const response = await fetch("/predictions.json");
  if (!response.ok) {
    throw new Error("No se pudo cargar predictions.json desde /public.");
  }
  return (await response.json()) as PredictionsDataset;
}

type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

function usePredictionsQuery(): QueryState<PredictionsDataset> {
  const [state, setState] = useState<QueryState<PredictionsDataset>>({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
    }));
    fetchPredictions()
      .then((data) => {
        if (!active) return;
        setState({ data, isLoading: false, isError: false, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const error =
          err instanceof Error ? err : new Error("Error desconocido.");
        setState({ data: undefined, isLoading: false, isError: true, error });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

function useMetroPredictor() {
  const { data, isLoading, isError, error } = usePredictionsQuery();

  const topology = useMemo(() => buildTopologyIndex(), []);
  const graph = useMemo(() => buildGraph(), []);

  const stationOptions = useMemo(
    () => (data ? buildStationOptions(data, topology) : []),
    [data, topology],
  );

  const stationOptionsForRoute = useMemo(
    () => stationOptions.filter((opt) => opt.lines.length > 0),
    [stationOptions],
  );

  const datasetByNormalized = useMemo(() => {
    const map = new Map<string, string>();
    stationOptions.forEach((opt) => map.set(opt.normalized, opt.key));
    return map;
  }, [stationOptions]);

  const hours = useMemo(() => (data ? getAvailableHours(data) : []), [data]);

  const hourIndex = useMemo(() => {
    const map = new Map<string, number>();
    hours.forEach((h, i) => map.set(h, i));
    return map;
  }, [hours]);

  const getStationForecast = useCallback(
    (stationKey: string, time: TimeSelection): StationForecast | null => {
      if (!data) return null;
      const option = stationOptions.find((opt) => opt.key === stationKey);
      if (!option) return null;
      return buildForecastFromOption(data, option, time, hourIndex);
    },
    [data, stationOptions, hourIndex],
  );

  const getRouteForecast = useCallback(
    (
      originKey: string,
      destKey: string,
      time: TimeSelection,
    ): RouteForecast | null => {
      if (!data) return null;
      const originOpt = stationOptions.find((opt) => opt.key === originKey);
      const destOpt = stationOptions.find((opt) => opt.key === destKey);
      if (!originOpt || !destOpt) return null;
      return buildRouteForecast(
        data,
        graph,
        topology,
        datasetByNormalized,
        originOpt.normalized,
        destOpt.normalized,
        time,
        hourIndex,
      );
    },
    [data, stationOptions, graph, topology, datasetByNormalized, hourIndex],
  );

  const getFullDayEntries = useCallback(
    (stationKey: string): PredictionEntry[] =>
      data ? (data[stationKey] ?? []) : [],
    [data],
  );

  const getAllStationForecasts = useCallback(
    (time: TimeSelection): StationForecast[] => {
      if (!data) return [];
      return stationOptions.map((opt) =>
        buildForecastFromOption(data, opt, time, hourIndex),
      );
    },
    [data, stationOptions, hourIndex],
  );

  return {
    isLoading,
    isError,
    error,
    stationOptions,
    stationOptionsForRoute,
    hours,
    getStationForecast,
    getRouteForecast,
    getFullDayEntries,
    getAllStationForecasts,
  };
}

function useEntrance(delayMs = 60) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return mounted;
}

const cardCls = "rounded-2xl border border-[#27272b] bg-[#161618] p-5";
const cardClsGradient =
  "rounded-2xl border border-[#27272b] bg-gradient-to-br from-[#1a1a1d] to-[#121214] p-6";
const labelCls = "text-xs font-medium uppercase tracking-wide text-[#84827b]";
const inputCls =
  "rounded-lg border border-[#34343a] bg-[#19191c] px-3 py-2 text-sm text-[#f2f1ec] outline-none transition-colors focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828]";
const displayFont: React.CSSProperties = { fontFamily: "var(--font-display)" };

function pillClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "bg-[#D62828] text-[#f6f3ec]"
      : "border border-[#34343a] text-[#9b9a94] hover:border-[#D62828] hover:text-[#D62828]"
  }`;
}

function NivelChip({ nivel }: { nivel: Nivel | null }) {
  if (!nivel) {
    return (
      <span className="inline-flex items-center rounded-full border border-[#34343a] bg-[#1c1c1f] px-2.5 py-0.5 text-xs font-medium text-[#84827b]">
        Sin datos
      </span>
    );
  }
  const meta = NIVEL_META[nivel];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function LineBadge({ lineId }: { lineId: LineId }) {
  const line = METRO_LINES.find((l) => l.id === lineId);
  if (!line) return null;
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: line.color, ...displayFont }}
    >
      {line.id}
    </span>
  );
}

function TrainCarGauge({
  pct,
  nivel,
  small = false,
}: {
  pct: number;
  nivel: Nivel;
  small?: boolean;
}) {
  const rawId = useId();
  const clipId = `car-clip-${rawId.replace(/[:]/g, "")}`;
  const meta = NIVEL_META[nivel];
  const clamped = Math.max(0, Math.min(100, pct));
  const fillHeight = (38 * clamped) / 100;
  const fillY = 50 - fillHeight;

  return (
    <div className={small ? "h-9 w-16 shrink-0" : "h-14 w-24 shrink-0"}>
      <svg viewBox="0 0 100 58" className="h-full w-full" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x="4" y="6" width="92" height="44" rx="11" />
          </clipPath>
        </defs>
        <rect
          x="4"
          y="6"
          width="92"
          height="44"
          rx="11"
          fill="#1c1c1f"
          stroke="#34343a"
          strokeWidth="1.5"
        />
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="4"
            y={fillY}
            width="92"
            height={fillHeight}
            className={meta.fill}
            style={{
              transition:
                "y 700ms cubic-bezier(.4,0,.2,1), height 700ms cubic-bezier(.4,0,.2,1)",
            }}
          />
        </g>
        {[16, 32.5, 49, 65.5, 82].map((x) => (
          <rect
            key={x}
            x={x}
            y="13"
            width="9"
            height="9"
            rx="2"
            fill="#0c0c0e"
            fillOpacity={0.5}
            stroke="#34343a"
            strokeWidth="1"
          />
        ))}
        <rect
          x="4"
          y="6"
          width="92"
          height="44"
          rx="11"
          fill="none"
          stroke="#34343a"
          strokeWidth="1.5"
        />
        <circle
          cx="23"
          cy="52"
          r="4"
          fill="#0c0c0e"
          stroke="#34343a"
          strokeWidth="1"
        />
        <circle
          cx="77"
          cy="52"
          r="4"
          fill="#0c0c0e"
          stroke="#34343a"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function SaturationBar({ pct, nivel }: { pct: number; nivel: Nivel }) {
  const meta = NIVEL_META[nivel];
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#222226]">
      <div
        className={`h-full rounded-full ${meta.bar} transition-all duration-700 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function HourlyTrend({
  entries,
  highlightHours,
  mounted,
}: {
  entries: PredictionEntry[];
  highlightHours: Set<string>;
  mounted: boolean;
}) {
  if (entries.length === 0) return null;
  const max = Math.max(100, ...entries.map((e) => e.saturacion_pct));
  return (
    <div className="flex h-16 items-end gap-[3px]">
      {entries.map((e, i) => {
        const heightPct = Math.max((e.saturacion_pct / max) * 100, 4);
        const nivel = mapRawNivel(e.nivel) ?? classifyNivel(e.saturacion_pct);
        const meta = NIVEL_META[nivel];
        const active = highlightHours.has(e.hora);
        return (
          <div
            key={e.hora}
            className="relative h-full flex-1"
            title={`${e.hora} · ${e.saturacion_pct.toFixed(0)}%`}
          >
            <div
              className={`absolute bottom-0 w-full origin-bottom rounded-t-sm ${meta.bar} ${
                active ? "opacity-100" : "opacity-25"
              }`}
              style={{
                height: `${heightPct}%`,
                transform: mounted ? "scaleY(1)" : "scaleY(0)",
                transition: "transform 600ms cubic-bezier(.4,0,.2,1)",
                transitionDelay: `${Math.min(i * 6, 240)}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function StationCombobox({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (key: string) => void;
  options: StationOption[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((opt) => opt.key === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = normalize(query);
    return options.filter((opt) => opt.normalized.includes(q));
  }, [query, options]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const handleSelect = useCallback(
    (key: string) => {
      onChange(key);
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    } else if (e.key === "Enter" && filtered.length > 0) {
      handleSelect(filtered[0].key);
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={selected?.displayName ?? "Buscar estación…"}
        value={open ? query : (selected?.displayName ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={`${inputCls} cursor-text`}
      />
      {open && (
        <div className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#34343a] bg-[#0e0e10] shadow-2xl">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#84827b]">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt.key);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1c1c1f] ${
                  opt.key === value
                    ? "bg-[#1c1c1f] text-[#ef4444]"
                    : "text-[#d4d2cb]"
                }`}
              >
                <span className="flex-1 truncate">{opt.displayName}</span>
                <div className="flex shrink-0 gap-1">
                  {opt.lines.map((l) => (
                    <LineBadge key={l} lineId={l} />
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TimeSelector({
  hours,
  timeMode,
  onTimeModeChange,
  instantHour,
  onInstantHourChange,
  fromHour,
  toHour,
  onFromHourChange,
  onToHourChange,
  onUseNow,
}: {
  hours: string[];
  timeMode: "instant" | "range";
  onTimeModeChange: (m: "instant" | "range") => void;
  instantHour: string;
  onInstantHourChange: (h: string) => void;
  fromHour: string;
  toHour: string;
  onFromHourChange: (h: string) => void;
  onToHourChange: (h: string) => void;
  onUseNow: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onTimeModeChange("instant")}
          className={pillClass(timeMode === "instant")}
        >
          Hora puntual
        </button>
        <button
          type="button"
          onClick={() => onTimeModeChange("range")}
          className={pillClass(timeMode === "range")}
        >
          Rango horario
        </button>
        <button
          type="button"
          onClick={onUseNow}
          className="ml-auto rounded-full border border-[#34343a] px-3 py-1.5 text-xs text-[#9b9a94] hover:border-[#D62828] hover:text-[#ef4444]"
        >
          Usar hora actual
        </button>
      </div>

      {timeMode === "instant" ? (
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Hora</span>
          <select
            value={instantHour}
            onChange={(e) => onInstantHourChange(e.target.value)}
            className={inputCls}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Desde</span>
            <select
              value={fromHour}
              onChange={(e) => onFromHourChange(e.target.value)}
              className={inputCls}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Hasta</span>
            <select
              value={toHour}
              onChange={(e) => onToHourChange(e.target.value)}
              className={inputCls}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function ControlPanel(props: {
  mode: "single" | "route";
  onModeChange: (m: "single" | "route") => void;
  stationOptions: StationOption[];
  singleStationKey: string;
  onSingleStationChange: (k: string) => void;
  stationOptionsForRoute: StationOption[];
  originKey: string;
  destKey: string;
  onOriginChange: (k: string) => void;
  onDestChange: (k: string) => void;
  hours: string[];
  timeMode: "instant" | "range";
  onTimeModeChange: (m: "instant" | "range") => void;
  instantHour: string;
  onInstantHourChange: (h: string) => void;
  fromHour: string;
  toHour: string;
  onFromHourChange: (h: string) => void;
  onToHourChange: (h: string) => void;
  onUseNow: () => void;
}) {
  const {
    mode,
    onModeChange,
    stationOptions,
    singleStationKey,
    onSingleStationChange,
    stationOptionsForRoute,
    originKey,
    destKey,
    onOriginChange,
    onDestChange,
    ...timeProps
  } = props;

  return (
    <div className={`flex flex-col gap-5 ${cardCls}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange("single")}
          className={pillClass(mode === "single")}
        >
          Una estación
        </button>
        <button
          type="button"
          onClick={() => onModeChange("route")}
          className={pillClass(mode === "route")}
        >
          Trayecto (origen → destino)
        </button>
      </div>

      {mode === "single" ? (
        <StationCombobox
          label="Estación"
          value={singleStationKey}
          onChange={onSingleStationChange}
          options={stationOptions}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StationCombobox
            label="Origen"
            value={originKey}
            onChange={onOriginChange}
            options={stationOptionsForRoute}
          />
          <StationCombobox
            label="Destino"
            value={destKey}
            onChange={onDestChange}
            options={stationOptionsForRoute}
          />
        </div>
      )}

      <TimeSelector {...timeProps} />
    </div>
  );
}

function StationResultCard({
  forecast,
  fullDayEntries,
  highlightHours,
  mounted,
}: {
  forecast: StationForecast;
  fullDayEntries: PredictionEntry[];
  highlightHours: Set<string>;
  mounted: boolean;
}) {
  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3
            className="text-lg font-semibold text-[#f2f1ec]"
            style={displayFont}
          >
            {forecast.displayName}
          </h3>
          <div className="flex gap-1">
            {forecast.lines.map((l) => (
              <LineBadge key={l} lineId={l} />
            ))}
          </div>
        </div>
        <NivelChip nivel={forecast.nivel} />
      </div>

      {forecast.found ? (
        <>
          <div className="mt-5 flex items-center gap-5">
            <TrainCarGauge pct={forecast.promedio!} nivel={forecast.nivel!} />
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-5xl font-bold leading-none tabular-nums text-[#f2f1ec]"
                  style={displayFont}
                >
                  {forecast.promedio!.toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 text-sm text-[#84827b]">
                de saturación estimada
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#84827b]">
                Peak
              </dt>
              <dd className="font-mono tabular-nums text-[#d4d2cb]">
                {forecast.maximo!.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#84827b]">
                Subidas prom.
              </dt>
              <dd className="font-mono tabular-nums text-[#d4d2cb]">
                {Math.round(forecast.subidasPromedio ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#84827b]">
                Capacidad
              </dt>
              <dd className="font-mono tabular-nums text-[#d4d2cb]">
                {forecast.capacidadMax}
              </dd>
            </div>
          </dl>
          {fullDayEntries.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-[#84827b]">
                Tendencia del día
              </p>
              <HourlyTrend
                entries={fullDayEntries}
                highlightHours={highlightHours}
                mounted={mounted}
              />
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-[#84827b]">
          No hay predicciones disponibles para esta estación en el horario
          seleccionado.
        </p>
      )}
    </div>
  );
}

function RouteStrip({
  estaciones,
  transbordos,
}: {
  estaciones: StationForecast[];
  transbordos: Transbordo[];
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center px-2 pt-7">
        {estaciones.map((est, idx) => {
          const isLast = idx === estaciones.length - 1;
          const segmentLine = !isLast
            ? lineForEdge(
                normalize(est.displayName),
                normalize(estaciones[idx + 1].displayName),
              )
            : null;
          const dotMeta = est.nivel ? NIVEL_META[est.nivel] : null;
          const transbordoAqui = transbordos.find((t) => t.enIndice === idx);
          const segmentColor = segmentLine
            ? METRO_LINES.find((l) => l.id === segmentLine)?.color
            : "#34343a";
          return (
            <div key={`${est.key}-${idx}`} className="flex items-center">
              <div className="relative flex flex-col items-center">
                {transbordoAqui && (
                  <span
                    className="absolute -top-7 whitespace-nowrap text-[10px] font-semibold text-[#ef4444]"
                    style={displayFont}
                  >
                    ⇄ {transbordoAqui.aLinea}
                  </span>
                )}
                <div
                  className={`h-4 w-4 rounded-full border-[3px] border-[#0e0e10] ${
                    dotMeta ? dotMeta.bar : "bg-[#34343a]"
                  }`}
                  title={est.displayName}
                />
                <span className="mt-2 w-[76px] text-center text-[11px] leading-tight text-[#9b9a94]">
                  {est.displayName}
                </span>
              </div>
              {!isLast && (
                <div
                  className="h-[3px] w-10 sm:w-14"
                  style={{ backgroundColor: segmentColor }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RouteSummaryCard({ route }: { route: RouteForecast }) {
  return (
    <div className={cardClsGradient}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[#84827b]">
          Índice de saturación del trayecto
        </h3>
        <NivelChip nivel={route.nivelGlobal} />
      </div>

      {route.indicePonderado !== null ? (
        <>
          <div className="mt-3 flex items-center gap-5">
            <TrainCarGauge
              pct={route.indicePonderado}
              nivel={route.nivelGlobal!}
            />
            <span
              className="text-6xl font-bold leading-none tabular-nums text-[#f2f1ec]"
              style={displayFont}
            >
              {route.indicePonderado.toFixed(1)}%
            </span>
          </div>
          <p className="mt-2 text-sm text-[#84827b]">
            ponderado por subidas estimadas en cada estación
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#84827b]">
                Promedio simple
              </dt>
              <dd className="font-mono tabular-nums text-[#d4d2cb]">
                {route.promedioSimple!.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#84827b]">
                Peor tramo
              </dt>
              <dd className="font-mono tabular-nums text-[#d4d2cb]">
                {route.maximo!.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#84827b]">
                Estación más crítica
              </dt>
              <dd className="text-[#d4d2cb]">
                {route.estacionMasCritica?.displayName ?? "—"}
              </dd>
            </div>
          </dl>
          {route.estacionesSinDatos.length > 0 && (
            <p className="mt-4 text-xs text-[#84827b]">
              Sin datos de predicción para:{" "}
              {route.estacionesSinDatos.join(", ")}.
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-[#84827b]">
          Ninguna de las estaciones del trayecto cuenta con datos de predicción
          para el horario seleccionado.
        </p>
      )}
    </div>
  );
}

function RouteStationRow({ forecast }: { forecast: StationForecast }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#222226] py-2.5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#d4d2cb]">{forecast.displayName}</span>
        <div className="flex gap-1">
          {forecast.lines.map((l) => (
            <LineBadge key={l} lineId={l} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {forecast.found ? (
          <>
            <span className="font-mono text-sm tabular-nums text-[#d4d2cb]">
              {forecast.promedio!.toFixed(1)}%
            </span>
            <div className="w-20">
              <SaturationBar pct={forecast.promedio!} nivel={forecast.nivel!} />
            </div>
          </>
        ) : (
          <span className="text-xs text-[#84827b]">Sin datos</span>
        )}
      </div>
    </div>
  );
}

function NetworkPeakSection({
  allForecasts,
  hourlyAvgs,
  highlightHours,
  mounted,
}: {
  allForecasts: StationForecast[];
  hourlyAvgs: HourlyAverage[];
  highlightHours: Set<string>;
  mounted: boolean;
}) {
  const withData = useMemo(
    () => allForecasts.filter((f) => f.found && f.promedio !== null),
    [allForecasts],
  );

  const { topStations, bottomStations } = useMemo(() => {
    const sorted = [...withData].sort(
      (a, b) => (b.promedio ?? 0) - (a.promedio ?? 0),
    );
    return {
      topStations: sorted.slice(0, 5),
      bottomStations: sorted.slice(-5).reverse(),
    };
  }, [withData]);

  if (withData.length === 0) return null;

  const peakHour =
    hourlyAvgs.length > 0
      ? hourlyAvgs.reduce(
          (best, h) => (h.avg > best.avg ? h : best),
          hourlyAvgs[0],
        )
      : null;
  const maxAvg =
    hourlyAvgs.length > 0 ? Math.max(...hourlyAvgs.map((h) => h.avg)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#222226]" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#5c5b56]">
          Estadísticas de la red
        </span>
        <div className="h-px flex-1 bg-[#222226]" />
      </div>

      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#84827b]">
              Saturación promedio por hora — toda la red
            </p>
            <p className="mt-0.5 text-xs text-[#5c5b56]">
              Las barras resaltadas corresponden al horario seleccionado
            </p>
          </div>
          {peakHour && (
            <div className="shrink-0 rounded-lg border border-[#34343a] bg-[#1c1c1f] px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-wide text-[#84827b]">
                Hora peak
              </p>
              <p
                className="text-sm font-semibold text-[#f2f1ec]"
                style={displayFont}
              >
                {peakHour.hora}
              </p>
              <p className="font-mono text-xs text-[#9b9a94]">
                {peakHour.avg.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex h-24 items-end gap-[2px]">
          {hourlyAvgs.map(({ hora, avg, nivel }, i) => {
            const heightPct = Math.max((avg / maxAvg) * 100, 4);
            const meta = NIVEL_META[nivel];
            const active = highlightHours.has(hora);
            return (
              <div
                key={hora}
                className="relative h-full flex-1"
                title={`${hora} · ${avg.toFixed(1)}%`}
              >
                <div
                  className={`absolute bottom-0 w-full origin-bottom rounded-t-sm ${meta.bar} ${
                    active
                      ? "opacity-100 ring-1 ring-[#D62828]/40"
                      : "opacity-20"
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                    transition: "transform 600ms cubic-bezier(.4,0,.2,1)",
                    transitionDelay: `${Math.min(i * 5, 220)}ms`,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-[#5c5b56]">
          <span>06:00</span>
          <span>10:00</span>
          <span>14:00</span>
          <span>18:00</span>
          <span>22:00</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={cardCls}>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <p className="text-xs font-medium uppercase tracking-wide text-[#84827b]">
              Más saturadas — horario actual
            </p>
          </div>
          {topStations.map((f, i) => (
            <div
              key={f.key}
              className="flex items-center gap-2 border-b border-[#222226] py-2.5 last:border-0"
            >
              <span className="w-4 shrink-0 text-xs font-mono text-[#5c5b56]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-[#d4d2cb]">
                {f.displayName}
              </span>
              <div className="flex shrink-0 gap-1">
                {f.lines.slice(0, 2).map((l) => (
                  <LineBadge key={l} lineId={l} />
                ))}
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-[#d4d2cb]">
                {f.promedio!.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        <div className={cardCls}>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-medium uppercase tracking-wide text-[#84827b]">
              Menos saturadas — horario actual
            </p>
          </div>
          {bottomStations.map((f, i) => (
            <div
              key={f.key}
              className="flex items-center gap-2 border-b border-[#222226] py-2.5 last:border-0"
            >
              <span className="w-4 shrink-0 text-xs font-mono text-[#5c5b56]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-[#d4d2cb]">
                {f.displayName}
              </span>
              <div className="flex shrink-0 gap-1">
                {f.lines.slice(0, 2).map((l) => (
                  <LineBadge key={l} lineId={l} />
                ))}
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-[#d4d2cb]">
                {f.promedio!.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero({
  peakHour,
  isLoading,
}: {
  peakHour: HourlyAverage | null;
  isLoading: boolean;
}) {
  const meta = peakHour ? NIVEL_META[peakHour.nivel] : null;
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#D62828]">
          Metro de Santiago · Predictor de saturación
        </span>
        <h1
          className="text-4xl font-bold leading-[0.95] tracking-tight text-[#f2f1ec] sm:text-5xl"
          style={displayFont}
        >
          ¿Qué tan lleno
          <br />
          va a estar el metro?
        </h1>
        <p className="max-w-md text-sm text-[#9b9a94] sm:text-base">
          Estimaciones de saturación por estación, línea y trayecto.
        </p>
      </div>

      <div className="shrink-0 rounded-2xl border border-[#27272b] bg-[#161618] px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#84827b]">
          Hora peak de la red hoy
        </p>
        {isLoading || !peakHour ? (
          <p
            className="mt-1 text-2xl font-bold text-[#5c5b56]"
            style={displayFont}
          >
            —
          </p>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <span
              className="text-3xl font-bold tabular-nums text-[#f2f1ec]"
              style={displayFont}
            >
              {peakHour.hora}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta!.chip}`}
            >
              {peakHour.avg.toFixed(0)}% · {meta!.label}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default function Home() {
  const {
    isLoading,
    isError,
    error,
    stationOptions,
    stationOptionsForRoute,
    hours,
    getStationForecast,
    getRouteForecast,
    getFullDayEntries,
    getAllStationForecasts,
  } = useMetroPredictor();

  const mounted = useEntrance(80);

  const [mode, setMode] = useState<"single" | "route">("single");
  const [singleStationKey, setSingleStationKey] = useState<string>("");
  const [originKey, setOriginKey] = useState<string>("");
  const [destKey, setDestKey] = useState<string>("");
  const [timeMode, setTimeMode] = useState<"instant" | "range">("instant");
  const [instantHour, setInstantHour] = useState<string>("");
  const [fromHour, setFromHour] = useState<string>("");
  const [toHour, setToHour] = useState<string>("");

  useEffect(() => {
    if (stationOptions.length === 0 || singleStationKey) return;
    setSingleStationKey(stationOptions[0].key);
  }, [stationOptions, singleStationKey]);

  useEffect(() => {
    if (stationOptionsForRoute.length < 2) return;
    if (!originKey) setOriginKey(stationOptionsForRoute[0].key);
    if (!destKey)
      setDestKey(stationOptionsForRoute[stationOptionsForRoute.length - 1].key);
  }, [stationOptionsForRoute, originKey, destKey]);

  useEffect(() => {
    if (hours.length === 0) return;
    if (!instantHour) setInstantHour(hours[Math.min(4, hours.length - 1)]);
    if (!fromHour) setFromHour(hours[0]);
    if (!toHour) setToHour(hours[hours.length - 1]);
  }, [hours, instantHour, fromHour, toHour]);

  const handleUseNow = useCallback(() => {
    if (hours.length === 0) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const closest = hours.reduce(
      (best, h) =>
        Math.abs(timeToMinutes(h) - nowMinutes) <
        Math.abs(timeToMinutes(best) - nowMinutes)
          ? h
          : best,
      hours[0],
    );
    setTimeMode("instant");
    setInstantHour(closest);
  }, [hours]);

  const timeSelection: TimeSelection = useMemo(() => {
    if (timeMode === "instant") return { mode: "instant", hora: instantHour };
    return { mode: "range", from: fromHour, to: toHour };
  }, [timeMode, instantHour, fromHour, toHour]);

  const highlightHours = useMemo(() => {
    if (timeMode === "instant") return new Set([instantHour]);
    const lo = hours.indexOf(fromHour);
    const hi = hours.indexOf(toHour);
    if (lo === -1 || hi === -1) return new Set<string>();
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    return new Set(hours.slice(a, b + 1));
  }, [timeMode, instantHour, fromHour, toHour, hours]);

  const singleForecast = useMemo(() => {
    if (mode !== "single" || !singleStationKey || hours.length === 0)
      return null;
    return getStationForecast(singleStationKey, timeSelection);
  }, [mode, singleStationKey, timeSelection, hours, getStationForecast]);

  const routeForecast = useMemo(() => {
    if (mode !== "route" || !originKey || !destKey || hours.length === 0)
      return null;
    return getRouteForecast(originKey, destKey, timeSelection);
  }, [mode, originKey, destKey, timeSelection, hours, getRouteForecast]);

  const allForecasts = useMemo(
    () =>
      !isLoading && !isError && hours.length > 0 && instantHour
        ? getAllStationForecasts(timeSelection)
        : [],
    [isLoading, isError, getAllStationForecasts, timeSelection, hours.length],
  );

  const hourlyAvgs = useMemo(
    () => computeNetworkHourlyAverages(stationOptions, getFullDayEntries),
    [stationOptions, getFullDayEntries],
  );

  const peakHour = useMemo(() => {
    if (hourlyAvgs.length === 0) return null;
    return hourlyAvgs.reduce(
      (best, h) => (h.avg > best.avg ? h : best),
      hourlyAvgs[0],
    );
  }, [hourlyAvgs]);

  return (
    <div
      className={`${inter.variable} ${display.variable} min-h-screen bg-[#0e0e10] text-[#f2f1ec]`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 sm:px-8">
        <Hero peakHour={peakHour} isLoading={isLoading} />

        {isLoading && (
          <div className="rounded-2xl border border-[#27272b] bg-[#161618]/60 p-8 text-center text-sm text-[#84827b]">
            Cargando predicciones desde /predictions.json…
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 p-6 text-sm text-rose-300">
            No se pudo cargar{" "}
            <code className="font-mono">/predictions.json</code>. Verifica que
            el archivo exista en la carpeta{" "}
            <code className="font-mono">public/</code>.
            {error && <p className="mt-2 text-rose-400/80">{error.message}</p>}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <ControlPanel
              mode={mode}
              onModeChange={setMode}
              stationOptions={stationOptions}
              singleStationKey={singleStationKey}
              onSingleStationChange={setSingleStationKey}
              stationOptionsForRoute={stationOptionsForRoute}
              originKey={originKey}
              destKey={destKey}
              onOriginChange={setOriginKey}
              onDestChange={setDestKey}
              hours={hours}
              timeMode={timeMode}
              onTimeModeChange={setTimeMode}
              instantHour={instantHour}
              onInstantHourChange={setInstantHour}
              fromHour={fromHour}
              toHour={toHour}
              onFromHourChange={setFromHour}
              onToHourChange={setToHour}
              onUseNow={handleUseNow}
            />

            {mode === "single" && singleForecast && (
              <StationResultCard
                forecast={singleForecast}
                fullDayEntries={getFullDayEntries(singleStationKey)}
                highlightHours={highlightHours}
                mounted={mounted}
              />
            )}

            {mode === "route" &&
              (routeForecast ? (
                <div className="flex flex-col gap-6">
                  <div className={cardCls}>
                    <p className="mb-1 text-xs uppercase tracking-wide text-[#84827b]">
                      Recorrido
                    </p>
                    <RouteStrip
                      estaciones={routeForecast.estaciones}
                      transbordos={routeForecast.transbordos}
                    />
                  </div>
                  <RouteSummaryCard route={routeForecast} />
                  <div className={cardCls}>
                    <p className="mb-2 text-xs uppercase tracking-wide text-[#84827b]">
                      Detalle por estación
                    </p>
                    {routeForecast.estaciones.map((est, i) => (
                      <RouteStationRow key={`${est.key}-${i}`} forecast={est} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#27272b] bg-[#161618]/60 p-6 text-sm text-[#84827b]">
                  Selecciona dos estaciones para calcular el trayecto. Si no
                  aparece ninguna ruta, puede ser que alguna de las estaciones
                  no esté identificada en la topología de líneas usada por esta
                  demo.
                </div>
              ))}

            <NetworkPeakSection
              allForecasts={allForecasts}
              hourlyAvgs={hourlyAvgs}
              highlightHours={highlightHours}
              mounted={mounted}
            />
          </>
        )}

        <footer className="mt-2 text-xs text-[#46453f]">
          Datos: predicciones basadas en registros del{" "}
          <a
            href="https://www.dtpm.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#5c5b56] underline underline-offset-2 transition-colors hover:text-[#84827b]"
          >
            Directorio de Transporte Público Metropolitano
          </a>
          .
        </footer>
      </main>
    </div>
  );
}
