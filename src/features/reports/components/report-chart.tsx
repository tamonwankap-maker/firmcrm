"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartSpec } from "../types";

/** Fixed categorical order (validated palette, see globals.css --series-*). Never cycled. */
const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/**
 * Bar chart for reports and the overview. Single axis, thin bars with rounded data ends,
 * 2px surface gaps between stacked segments, legend whenever there are 2+ series, hover tooltip.
 */
export function ReportChart({ spec, height = 280, title }: { spec: ChartSpec; height?: number; title: string }) {
  const money = spec.valueType === "money";
  const tick = (v: number) => (money ? `฿${compact.format(v)}` : compact.format(v));
  // Legend whenever identity isn't given by the title: 2+ series, or any stacked chart.
  const many = spec.series.length > 1 || !!spec.stacked;
  const last = spec.series.length - 1;
  const barSize = spec.horizontal ? 14 : 28;
  const h = spec.horizontal ? Math.max(height, spec.data.length * (spec.stacked || !many ? 30 : 44) + 60) : height;

  if (spec.data.length === 0)
    return <p className="text-muted-foreground py-8 text-center text-sm">No data for this period.</p>;

  return (
    <figure aria-label={title} className="w-full">
      <ResponsiveContainer width="100%" height={h}>
        <BarChart
          data={spec.data}
          layout={spec.horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, bottom: 4, left: spec.horizontal ? 8 : 0 }}
          barCategoryGap={spec.horizontal ? 8 : "25%"}
          barGap={2}
        >
          <CartesianGrid stroke="var(--chart-grid)" vertical={!!spec.horizontal} horizontal={!spec.horizontal} />
          {spec.horizontal ? (
            <>
              <XAxis
                type="number"
                tickFormatter={tick}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey={spec.xKey}
                width={150}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={spec.xKey}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={tick}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
                allowDecimals={false}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            formatter={(v) =>
              typeof v === "number" ? (money ? `฿${full.format(v)}` : full.format(v)) : String(v ?? "")
            }
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          {many && (
            <Legend
              iconType="square"
              iconSize={10}
              itemSorter={null}
              wrapperStyle={{ fontSize: 12 }}
              // Legend text in text colour; the swatch carries identity.
              formatter={(value) => <span style={{ color: "var(--foreground)" }}>{value}</span>}
            />
          )}
          {spec.series.map((s, i) => {
            // Round only the data end: the outermost segment of a stack, or every bar when not stacked.
            const roundEnd = !spec.stacked || i === last;
            const radius: [number, number, number, number] = !roundEnd
              ? [0, 0, 0, 0]
              : spec.horizontal
                ? [0, 4, 4, 0]
                : [4, 4, 0, 0];
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={SERIES[i % SERIES.length]}
                stackId={spec.stacked ? "a" : undefined}
                radius={radius}
                maxBarSize={barSize}
                stroke={spec.stacked ? "var(--card)" : undefined}
                strokeWidth={spec.stacked ? 2 : 0}
                isAnimationActive={false}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
      {/* Table view: relief for lighter series colours, and the accessible equivalent of the chart. */}
      <details className="mt-2 text-xs">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer">Show data</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="py-1 pr-2 font-medium" aria-label="Category" />
              {spec.series.map((s) => (
                <th key={s.key} className="py-1 pr-2 text-right font-medium">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.data.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1 pr-2">{String(row[spec.xKey] ?? "")}</td>
                {spec.series.map((s) => {
                  const v = row[s.key];
                  return (
                    <td key={s.key} className="py-1 pr-2 text-right tabular-nums">
                      {typeof v === "number" ? (money ? `฿${full.format(v)}` : full.format(v)) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
