import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Series {
  name?: string;
  data: Array<{ x: number; y: number }>;
}

interface ChartSpec {
  type: "line" | "bar" | "scatter";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  series: Series[];
}

interface Props {
  code: string;
  streaming: boolean;
}

const COLORS = ["#3a4a63", "#8b6f47", "#4a6b3e", "#a83a2c"];

function parse(code: string): { spec: ChartSpec | null; error: string | null } {
  try {
    const raw = JSON.parse(code) as unknown;
    if (
      typeof raw === "object" &&
      raw !== null &&
      "type" in raw &&
      "series" in raw &&
      Array.isArray((raw as { series: unknown }).series)
    ) {
      return { spec: raw as ChartSpec, error: null };
    }
    return { spec: null, error: "missing required fields (type, series)" };
  } catch (err) {
    return { spec: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export function ChartBlock({ code, streaming }: Props): JSX.Element {
  const { spec, error } = useMemo(
    () => (streaming ? { spec: null, error: null } : parse(code.trim())),
    [code, streaming],
  );

  if (streaming) {
    return <div className="viz viz--loading">Drawing chart…</div>;
  }
  if (error || !spec) {
    return (
      <div className="viz viz--error">
        <div className="viz__label">Chart couldn't render — {error ?? "invalid spec"}</div>
        <pre>{code}</pre>
      </div>
    );
  }

  const merged: Array<Record<string, number>> = mergeSeries(spec.series);
  const seriesNames = spec.series.map((s, i) => s.name ?? `series ${i + 1}`);

  return (
    <div className="viz viz--chart">
      {spec.title && <div className="viz__title">{spec.title}</div>}
      <ResponsiveContainer width="100%" height={280}>
        {spec.type === "line" ? (
          <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d5" />
            <XAxis
              dataKey="x"
              type="number"
              tick={{ fontSize: 12, fill: "#45464d" }}
              label={{ value: spec.xLabel ?? "", position: "bottom", offset: 0, fontSize: 12, fill: "#8a8a92" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#45464d" }}
              label={{ value: spec.yLabel ?? "", angle: -90, position: "insideLeft", fontSize: 12, fill: "#8a8a92" }}
            />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e7e2d5", borderRadius: 6, fontSize: 12 }} />
            {seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {seriesNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        ) : spec.type === "bar" ? (
          <BarChart data={merged} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d5" />
            <XAxis dataKey="x" tick={{ fontSize: 12, fill: "#45464d" }} />
            <YAxis tick={{ fontSize: 12, fill: "#45464d" }} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e7e2d5", borderRadius: 6, fontSize: 12 }} />
            {seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {seriesNames.map((name, i) => (
              <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        ) : (
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d5" />
            <XAxis dataKey="x" type="number" tick={{ fontSize: 12, fill: "#45464d" }} />
            <YAxis dataKey="y" type="number" tick={{ fontSize: 12, fill: "#45464d" }} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e7e2d5", borderRadius: 6, fontSize: 12 }} />
            {spec.series.map((s, i) => (
              <Scatter
                key={s.name ?? i}
                name={s.name ?? `series ${i + 1}`}
                data={s.data}
                fill={COLORS[i % COLORS.length]}
              />
            ))}
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Recharts wants a single flat array indexed by x for line/bar charts.
function mergeSeries(series: Series[]): Array<Record<string, number>> {
  const byX = new Map<number, Record<string, number>>();
  series.forEach((s, i) => {
    const name = s.name ?? `series ${i + 1}`;
    for (const point of s.data) {
      if (typeof point.x !== "number" || typeof point.y !== "number") continue;
      const row = byX.get(point.x) ?? { x: point.x };
      row[name] = point.y;
      byX.set(point.x, row);
    }
  });
  return Array.from(byX.values()).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
}
