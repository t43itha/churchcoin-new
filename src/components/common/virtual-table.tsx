"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/constants/layout";

interface VirtualTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
  rowHeight?: number;
  containerHeight?: number;
  className?: string;
  overscan?: number;
}

/**
 * Virtualized table component for rendering large datasets efficiently.
 * Only renders visible rows plus buffer for smooth scrolling.
 */
export function VirtualTable<T>({
  items,
  renderRow,
  rowHeight = 48,
  containerHeight = LAYOUT.TABLE_MAX_HEIGHT,
  className,
  overscan = 5,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan, // Render extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderRow(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  className?: string;
  gap?: number;
  overscan?: number;
}

/**
 * Virtualized list component for rendering large lists efficiently.
 * Supports variable gap between items.
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight = 64,
  containerHeight = LAYOUT.TABLE_MAX_HEIGHT,
  className,
  gap = 0,
  overscan = 5,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size - gap}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  columns: number;
  itemHeight?: number;
  containerHeight?: number;
  className?: string;
  gap?: number;
  overscan?: number;
}

/**
 * Virtualized grid component for rendering large grids efficiently.
 * Renders items in rows with specified number of columns.
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  columns,
  itemHeight = 200,
  containerHeight = LAYOUT.TABLE_MAX_HEIGHT,
  className,
  gap = 16,
  overscan = 3,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group items into rows
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size - gap}px`,
              transform: `translateY(${virtualRow.start}px)`,
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${gap}px`,
            }}
          >
            {rows[virtualRow.index].map((item, colIndex) => (
              <div key={colIndex}>
                {renderItem(item, virtualRow.index * columns + colIndex)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
