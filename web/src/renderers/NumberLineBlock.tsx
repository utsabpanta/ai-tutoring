import { useMemo } from "react";

interface Point {
  value: number;
  label?: string;
  color?: string;
}

interface Interval {
  from: number;
  to: number;
  label?: string;
  color?: string;
}

interface NumberLineSpec {
  min: number;
  max: number;
  step?: number;
  title?: string;
  points?: Point[];
  intervals?: Interval[];
}

interface Props {
  code: string;
  streaming: boolean;
}

const WIDTH = 640;
const HEIGHT = 110;
const PAD_X = 32;
const PAD_Y = 26;
const LINE_Y = 56;
const MAX_TICKS = 80;

const COLORS = {
  line: "#45464d",
  tick: "#8a8a92",
  label: "#45464d",
  point: "#3a4a63",
  pointAlt: "#8b6f47",
  intervalFill: "rgba(58, 74, 99, 0.15)",
  intervalStroke: "#3a4a63",
};

function parse(code: string): { spec: NumberLineSpec | null; error: string | null } {
  try {
    const raw = JSON.parse(code) as unknown;
    if (
      typeof raw === "object" &&
      raw !== null &&
      typeof (raw as { min?: unknown }).min === "number" &&
      typeof (raw as { max?: unknown }).max === "number"
    ) {
      const spec = raw as NumberLineSpec;
      if (spec.min >= spec.max) {
        return { spec: null, error: "min must be less than max" };
      }
      return { spec, error: null };
    }
    return { spec: null, error: "missing min or max" };
  } catch (err) {
    return { spec: null, error: err instanceof Error ? err.message : String(err) };
  }
}

function chooseStep(min: number, max: number, requested?: number): number {
  if (requested && requested > 0) {
    const ticks = (max - min) / requested;
    if (ticks <= MAX_TICKS) return requested;
  }
  const span = max - min;
  // Find a step that gives 5–20 ticks at a "nice" value.
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 1000];
  for (const c of candidates) {
    const ticks = span / c;
    if (ticks >= 5 && ticks <= 20) return c;
  }
  return Math.max(1, Math.round(span / 10));
}

function project(value: number, min: number, max: number): number {
  return PAD_X + ((value - min) / (max - min)) * (WIDTH - PAD_X * 2);
}

function formatTick(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function NumberLineBlock({ code, streaming }: Props): JSX.Element {
  const { spec, error } = useMemo(
    () => (streaming ? { spec: null, error: null } : parse(code.trim())),
    [code, streaming],
  );

  if (streaming) {
    return <div className="viz viz--loading">Drawing number line…</div>;
  }
  if (error || !spec) {
    return (
      <div className="viz viz--error">
        <div className="viz__label">Number line couldn't render — {error ?? "invalid spec"}</div>
        <pre>{code}</pre>
      </div>
    );
  }

  const { min, max } = spec;
  const step = chooseStep(min, max, spec.step);
  const ticks: number[] = [];
  // Build ticks; round to step to avoid float drift.
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step / 1000; v += step) {
    ticks.push(Math.round(v / step) * step);
  }

  return (
    <div className="viz viz--numberline">
      {spec.title && <div className="viz__title">{spec.title}</div>}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={spec.title ?? `Number line from ${min} to ${max}`}
      >
        {/* Intervals (drawn behind everything) */}
        {(spec.intervals ?? []).map((iv, i) => {
          const x1 = project(Math.max(iv.from, min), min, max);
          const x2 = project(Math.min(iv.to, max), min, max);
          return (
            <g key={`iv-${i}`}>
              <rect
                x={Math.min(x1, x2)}
                y={LINE_Y - 14}
                width={Math.abs(x2 - x1)}
                height={28}
                fill={iv.color ?? COLORS.intervalFill}
                stroke={iv.color ? "transparent" : COLORS.intervalStroke}
                strokeOpacity={0.4}
                rx={3}
              />
              {iv.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={LINE_Y - 20}
                  textAnchor="middle"
                  fill={COLORS.intervalStroke}
                  fontSize="11"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontWeight="500"
                >
                  {iv.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Main line with arrowheads on both ends */}
        <defs>
          <marker
            id="nl-arrow-end"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.line} />
          </marker>
        </defs>
        <line
          x1={PAD_X - 8}
          y1={LINE_Y}
          x2={WIDTH - PAD_X + 8}
          y2={LINE_Y}
          stroke={COLORS.line}
          strokeWidth="1.5"
          markerStart="url(#nl-arrow-end)"
          markerEnd="url(#nl-arrow-end)"
        />

        {/* Ticks + labels */}
        {ticks.map((t) => {
          const x = project(t, min, max);
          const isZero = t === 0;
          return (
            <g key={`t-${t}`}>
              <line
                x1={x}
                y1={LINE_Y - 6}
                x2={x}
                y2={LINE_Y + 6}
                stroke={isZero ? COLORS.line : COLORS.tick}
                strokeWidth={isZero ? 1.5 : 1}
              />
              <text
                x={x}
                y={LINE_Y + 22}
                textAnchor="middle"
                fill={COLORS.label}
                fontSize="12"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {formatTick(t)}
              </text>
            </g>
          );
        })}

        {/* Points */}
        {(spec.points ?? []).map((p, i) => {
          if (p.value < min || p.value > max) return null;
          const x = project(p.value, min, max);
          const color = p.color ?? (i % 2 === 0 ? COLORS.point : COLORS.pointAlt);
          return (
            <g key={`p-${i}`}>
              <circle cx={x} cy={LINE_Y} r={6} fill={color} stroke="#fff" strokeWidth="2" />
              {p.label && (
                <text
                  x={x}
                  y={HEIGHT - PAD_Y / 2 - 6}
                  textAnchor="middle"
                  fill={color}
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
