import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, G, Path, Rect, Line, Polyline, Polygon } from "react-native-svg";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChartPoint {
  label: string;
  value: number;
}

export interface WidgetChartProps {
  type: string;
  data: ChartPoint[];
  colors?: string[];
  /** Formats a numeric value for axis/legend labels. */
  format?: (value: number) => string;
}

/** Default categorical palette (mirrors the web console defaults). */
const PALETTE = [
  "#4F46E5",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

const identity = (n: number) => String(n);

function paletteAt(colors: string[] | undefined, i: number): string {
  const pal = colors && colors.length > 0 ? colors : PALETTE;
  return pal[i % pal.length];
}

/* ------------------------------------------------------------------ */
/*  Donut / Pie                                                        */
/* ------------------------------------------------------------------ */

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const so = polarToXY(cx, cy, rOuter, endAngle);
  const eo = polarToXY(cx, cy, rOuter, startAngle);
  const si = polarToXY(cx, cy, rInner, startAngle);
  const ei = polarToXY(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${ei.x} ${ei.y}`,
    "Z",
  ].join(" ");
}

function DonutChart({ data, colors, format = identity }: WidgetChartProps) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter * 0.58;
  const total = data.reduce((s, p) => s + Math.max(p.value, 0), 0);

  let angle = 0;
  const slices = data.map((p, i) => {
    const frac = total > 0 ? Math.max(p.value, 0) / total : 0;
    const start = angle;
    const end = angle + frac * 360;
    angle = end;
    return { ...p, start, end, color: paletteAt(colors, i), frac };
  });

  return (
    <View className="flex-row items-center">
      <Svg width={size} height={size}>
        <G>
          {total > 0 ? (
            slices.map((s, i) =>
              s.end - s.start >= 359.999 ? (
                // Single full-circle slice
                <Circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={(rOuter + rInner) / 2}
                  stroke={s.color}
                  strokeWidth={rOuter - rInner}
                  fill="none"
                />
              ) : (
                <Path key={i} d={arcPath(cx, cy, rOuter, rInner, s.start, s.end)} fill={s.color} />
              ),
            )
          ) : (
            <Circle cx={cx} cy={cy} r={rOuter} fill="#e2e8f0" />
          )}
        </G>
      </Svg>
      <View className="ml-3 flex-1 gap-1.5">
        {slices.slice(0, 6).map((s, i) => (
          <View key={i} className="flex-row items-center">
            <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <Text className="ml-2 flex-1 text-xs text-foreground" numberOfLines={1}>
              {s.label}
            </Text>
            <Text className="ml-1 text-xs font-medium text-muted-foreground">
              {Math.round(s.frac * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar (vertical)                                                     */
/* ------------------------------------------------------------------ */

function BarChart({ data, colors, format = identity }: WidgetChartProps) {
  const width = 280;
  const height = 150;
  const padBottom = 22;
  const padTop = 8;
  const max = Math.max(...data.map((p) => p.value), 1);
  const n = data.length;
  const slot = width / Math.max(n, 1);
  const barW = Math.min(slot * 0.6, 40);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={0} y1={height - padBottom} x2={width} y2={height - padBottom} stroke="#e2e8f0" strokeWidth={1} />
        {data.map((p, i) => {
          const h = ((height - padBottom - padTop) * Math.max(p.value, 0)) / max;
          const x = i * slot + (slot - barW) / 2;
          const y = height - padBottom - h;
          return <Rect key={i} x={x} y={y} width={barW} height={Math.max(h, 1)} rx={3} fill={paletteAt(colors, i)} />;
        })}
      </Svg>
      <View className="flex-row">
        {data.map((p, i) => (
          <Text key={i} className="text-center text-[9px] text-muted-foreground" numberOfLines={1} style={{ width: `${100 / n}%` }}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Line / Area                                                        */
/* ------------------------------------------------------------------ */

function LineAreaChart({ data, colors, type, format = identity }: WidgetChartProps) {
  const width = 280;
  const height = 150;
  const padBottom = 22;
  const padTop = 8;
  const padX = 6;
  const max = Math.max(...data.map((p) => p.value), 1);
  const n = data.length;
  const innerW = width - padX * 2;
  const innerH = height - padBottom - padTop;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const color = paletteAt(colors, 0);

  const pts = data.map((p, i) => {
    const x = padX + i * stepX;
    const y = padTop + innerH - (innerH * Math.max(p.value, 0)) / max;
    return { x, y };
  });
  const linePoints = pts.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const areaPoints =
    pts.length > 0
      ? `${padX},${padTop + innerH} ${linePoints} ${padX + (n - 1) * stepX},${padTop + innerH}`
      : "";

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={0} y1={height - padBottom} x2={width} y2={height - padBottom} stroke="#e2e8f0" strokeWidth={1} />
        {type === "area" && pts.length > 1 && <Polygon points={areaPoints} fill={color} fillOpacity={0.15} />}
        {pts.length > 1 && <Polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} />}
        {pts.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={color} />
        ))}
      </Svg>
      <View className="flex-row justify-between px-1">
        {data.map((p, i) => (
          <Text key={i} className="text-[9px] text-muted-foreground" numberOfLines={1}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Funnel (horizontal, decreasing)                                   */
/* ------------------------------------------------------------------ */

function FunnelChart({ data, colors, format = identity }: WidgetChartProps) {
  const max = Math.max(...data.map((p) => p.value), 1);
  return (
    <View className="gap-1.5 py-1">
      {data.map((p, i) => {
        const pct = Math.max((Math.max(p.value, 0) / max) * 100, 3);
        return (
          <View key={i} className="flex-row items-center gap-2">
            <Text className="w-20 text-[10px] text-muted-foreground" numberOfLines={1}>
              {p.label}
            </Text>
            <View className="h-5 flex-1 justify-center rounded-sm bg-muted/30">
              <View
                className="h-5 items-end justify-center rounded-sm pr-1"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: paletteAt(colors, i) }}
              >
                <Text className="text-[9px] font-semibold text-white" numberOfLines={1}>
                  {format(p.value)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                        */
/* ------------------------------------------------------------------ */

/** Renders a chart for a dashboard widget from aggregated `{label,value}` points. */
export function WidgetChart(props: WidgetChartProps) {
  if (!props.data || props.data.length === 0) {
    return null;
  }
  switch (props.type) {
    case "donut":
    case "pie":
      return <DonutChart {...props} />;
    case "line":
      return <LineAreaChart {...props} type="line" />;
    case "area":
      return <LineAreaChart {...props} type="area" />;
    case "funnel":
      return <FunnelChart {...props} />;
    case "bar":
    case "column":
    default:
      return <BarChart {...props} />;
  }
}
