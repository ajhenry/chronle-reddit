import { CSSProperties } from "react";
import { scaleBand, scaleLinear, max } from "d3";

interface PostGameMetricsChartProps {
  dayMetrics: Record<string, number>;
}

export const PostGameMetricsChart = ({
  dayMetrics,
}: PostGameMetricsChartProps) => {
  const days: string[] = Array.from({ length: 7 }, (_, i) => String(i + 1));

  // Transform data for the chart
  const data = days.map((day) => ({
    key: `Day ${day}`,
    value: dayMetrics[day] || 0.05,
  }));

  // Scales
  const yScale = scaleBand()
    .domain(data.map((d) => d.key))
    .range([0, 100])
    .padding(0.175);

  const xScale = scaleLinear()
    .domain([0, max(data.map((d) => d.value)) ?? 0])
    .range([0, 100]);

  const longestWord = max(data.map((d) => d.key.length)) || 1;
  return (
    <div
      className="relative w-full min-w-[300px] h-72"
      style={
        {
          "--marginTop": "0px",
          "--marginRight": "0px",
          "--marginBottom": "16px",
          "--marginLeft": `${longestWord * 7}px`,
        } as CSSProperties
      }
    >
      {/* Chart Area */}
      <div
        className="absolute inset-0
          z-10
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[calc(100%-var(--marginLeft)-var(--marginRight))]
          translate-x-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible
        "
      >
        {/* Bars with Rounded Right Corners */}
        {data.map((d, index) => {
          const barWidth = xScale(d.value);
          const barHeight = yScale.bandwidth();

          return (
            <div
              key={index}
              style={{
                left: "0",
                top: `${yScale(d.key)}%`,
                width: `${barWidth}%`,
                height: `${barHeight}%`,
                borderRadius: "0 6px 6px 0", // Rounded right corners
              }}
              className={`absolute bg-green-600 dark:bg-green-400`}
            />
          );
        })}
        {/* X Axis (Values) */}
        {xScale.ticks(2).map((value, i) => (
          <div
            key={i}
            style={{
              left: `${xScale(value)}%`,
              top: "100%",
            }}
            className="absolute text-xs -translate-x-1/2 tabular-nums"
          >
            {value}
          </div>
        ))}
      </div>

      {/* Y Axis (Letters) */}
      <div
        className="
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible"
      >
        {data.map((entry, i) => (
          <span
            key={i}
            style={{
              left: "-8px",
              top: `${yScale(entry.key)! + yScale.bandwidth() / 2}%`,
            }}
            className="absolute text-xs -translate-y-1/2 w-full text-right"
          >
            {i + 1 === 7 ? "6+" : i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};
