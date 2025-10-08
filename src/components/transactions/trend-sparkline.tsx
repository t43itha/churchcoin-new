"use client";

import { useMemo } from "react";

interface TrendSparklineProps {
  data: { value: number }[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function TrendSparkline({
  data,
  width = 120,
  height = 24,
  color = "currentColor",
  className,
}: TrendSparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return "";

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  }, [data, width, height]);

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
