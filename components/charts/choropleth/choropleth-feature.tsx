"use client";

import { geoCentroid } from "d3-geo";
import { motion, useTransform } from "motion/react";
import { memo, useCallback, useMemo } from "react";
import { useEnterComplete } from "../use-enter-complete";
import { useMountProgress } from "../use-mount-progress";
import {
  type ChoroplethFeature as ChoroplethFeatureType,
  defaultChoroplethColors,
  useChoroplethInteraction,
  useChoroplethStable,
} from "./choropleth-context";

export interface ChoroplethFeatureProps {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fadedOpacity?: number;
  getFeatureColor?: (feature: ChoroplethFeatureType, index: number) => string;
  patterns?: React.ReactNode;
  getFeaturePattern?: (
    feature: ChoroplethFeatureType,
    index: number
  ) => string | null | undefined;
  /** Fired when a feature path is clicked (after a press that isn't a drag). */
  onFeatureClick?: (
    feature: ChoroplethFeatureType,
    index: number
  ) => void;
  /**
   * When provided, features outside this set are dimmed (selection filter).
   * Pass `null` / omit when nothing is selected.
   */
  selectedFeatureIndexes?: ReadonlySet<number> | null;
}

interface FeatureRecord {
  index: number;
  path: string;
  fill: string;
  feature: ChoroplethFeatureType;
  centroid: { x: number; y: number } | null;
}

function resolveFeatureFill(
  feature: ChoroplethFeatureType,
  index: number,
  fill: string | undefined,
  getFeatureColor: ChoroplethFeatureProps["getFeatureColor"],
  getFeaturePattern: ChoroplethFeatureProps["getFeaturePattern"]
): string {
  const patternId = getFeaturePattern?.(feature, index);
  if (patternId) {
    return `url(#${patternId})`;
  }
  if (fill) {
    return fill;
  }
  if (getFeatureColor) {
    return getFeatureColor(feature, index);
  }
  return (
    defaultChoroplethColors[index % defaultChoroplethColors.length] ??
    "var(--chart-1)"
  );
}

function isRecordActive(
  record: FeatureRecord,
  hoveredIndex: number | null,
  selectedIndexes: ReadonlySet<number> | null | undefined
): boolean {
  if (hoveredIndex !== null) {
    return record.index === hoveredIndex;
  }
  if (selectedIndexes && selectedIndexes.size > 0) {
    return selectedIndexes.has(record.index);
  }
  return true;
}

const StaticFeatureLayer = memo(function StaticFeatureLayer({
  records,
  stroke,
  strokeWidth,
  baseOpacity,
  dimOpacity,
  hoveredIndex,
  selectedIndexes,
  onFeatureEnter,
  onFeatureLeave,
  onFeatureClick,
}: {
  records: FeatureRecord[];
  stroke: string;
  strokeWidth: number;
  baseOpacity: number;
  dimOpacity: number;
  hoveredIndex: number | null;
  selectedIndexes?: ReadonlySet<number> | null;
  onFeatureEnter: (record: FeatureRecord) => void;
  onFeatureLeave: () => void;
  onFeatureClick?: (record: FeatureRecord) => void;
}) {
  const hasSelection = Boolean(selectedIndexes && selectedIndexes.size > 0);
  const isDimmed = hoveredIndex !== null || hasSelection;

  if (!isDimmed) {
    return (
      <g opacity={baseOpacity}>
        {records.map((record) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG path used as hover/click hitbox
          <path
            className="cursor-pointer"
            d={record.path}
            fill={record.fill}
            key={`base-${record.index}`}
            onClick={() => onFeatureClick?.(record)}
            onMouseEnter={() => onFeatureEnter(record)}
            onMouseLeave={onFeatureLeave}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ))}
      </g>
    );
  }

  const active = records.filter((record) =>
    isRecordActive(record, hoveredIndex, selectedIndexes)
  );
  const inactive = records.filter(
    (record) => !isRecordActive(record, hoveredIndex, selectedIndexes)
  );

  return (
    <>
      <g opacity={dimOpacity} style={{ transition: "opacity 0.18s ease-out" }}>
        {inactive.map((record) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG path used as hover/click hitbox
          <path
            className="cursor-pointer"
            d={record.path}
            fill={record.fill}
            key={`base-${record.index}`}
            onClick={() => onFeatureClick?.(record)}
            onMouseEnter={() => onFeatureEnter(record)}
            onMouseLeave={onFeatureLeave}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ))}
      </g>
      <g opacity={1} style={{ transition: "opacity 0.18s ease-out" }}>
        {active.map((record) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG path used as hover/click hitbox
          <path
            className="cursor-pointer"
            d={record.path}
            fill={record.fill}
            key={`highlight-${record.index}`}
            onClick={() => onFeatureClick?.(record)}
            onMouseEnter={() => onFeatureEnter(record)}
            onMouseLeave={onFeatureLeave}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ))}
      </g>
    </>
  );
});

const EnterFeatureLayer = memo(function EnterFeatureLayer({
  records,
  stroke,
  strokeWidth,
  baseOpacity,
  dimOpacity,
  hoveredIndex,
  selectedIndexes,
  onFeatureEnter,
  onFeatureLeave,
  onFeatureClick,
  revealEpoch,
}: {
  records: FeatureRecord[];
  stroke: string;
  strokeWidth: number;
  baseOpacity: number;
  dimOpacity: number;
  hoveredIndex: number | null;
  selectedIndexes?: ReadonlySet<number> | null;
  onFeatureEnter: (record: FeatureRecord) => void;
  onFeatureLeave: () => void;
  onFeatureClick?: (record: FeatureRecord) => void;
  revealEpoch: number;
}) {
  const { enterTransition, animationDuration } = useChoroplethStable();
  const mountProgress = useMountProgress(
    enterTransition,
    0,
    `choropleth-layer-${revealEpoch}`
  );
  const enterComplete = useEnterComplete(mountProgress);
  const layerOpacity = useTransform(mountProgress, (t) => t * baseOpacity);

  if (enterComplete) {
    return (
      <StaticFeatureLayer
        baseOpacity={baseOpacity}
        dimOpacity={dimOpacity}
        hoveredIndex={hoveredIndex}
        onFeatureClick={onFeatureClick}
        onFeatureEnter={onFeatureEnter}
        onFeatureLeave={onFeatureLeave}
        records={records}
        selectedIndexes={selectedIndexes}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  return (
    <motion.g
      key={`enter-${revealEpoch}`}
      opacity={layerOpacity}
      transition={{
        duration: animationDuration / 1000,
        ease: "easeOut",
      }}
    >
      {records.map((record) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: SVG path used as hover/click hitbox
        <path
          className="cursor-pointer"
          d={record.path}
          fill={record.fill}
          key={`enter-${record.index}`}
          onClick={() => onFeatureClick?.(record)}
          onMouseEnter={() => onFeatureEnter(record)}
          onMouseLeave={onFeatureLeave}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ))}
    </motion.g>
  );
});

export const ChoroplethFeature = memo(function ChoroplethFeature({
  fill,
  stroke = "var(--background)",
  strokeWidth = 0.5,
  fadedOpacity = 0.4,
  getFeatureColor,
  patterns,
  getFeaturePattern,
  onFeatureClick,
  selectedFeatureIndexes,
}: ChoroplethFeatureProps) {
  const {
    features,
    featurePaths,
    pathGenerator,
    projectPoint,
    isLoaded,
    revealEpoch,
    width,
    height,
  } = useChoroplethStable();
  const { hoveredFeatureIndex, setHoveredFeatureIndex, setTooltipData } =
    useChoroplethInteraction();

  const featureCentroids = useMemo(() => {
    return features.map((feature) => {
      try {
        const centroid = geoCentroid(feature);
        if (
          centroid &&
          !Number.isNaN(centroid[0]) &&
          !Number.isNaN(centroid[1])
        ) {
          const projected = projectPoint(centroid as [number, number]);
          if (projected) {
            const padding = 60;
            return {
              x: Math.max(padding, Math.min(width - padding, projected[0])),
              y: Math.max(padding, Math.min(height - padding, projected[1])),
            };
          }
        }
      } catch {
        // Some geometries may not have valid centroids
      }
      return null;
    });
  }, [features, projectPoint, width, height]);

  const records = useMemo(() => {
    const items: FeatureRecord[] = [];
    for (let index = 0; index < features.length; index++) {
      const feature = features[index];
      if (!feature) {
        continue;
      }

      const path = featurePaths[index] ?? pathGenerator(feature);
      if (!path) {
        continue;
      }

      items.push({
        index,
        path,
        fill: resolveFeatureFill(
          feature,
          index,
          fill,
          getFeatureColor,
          getFeaturePattern
        ),
        feature,
        centroid: featureCentroids[index] ?? null,
      });
    }
    return items;
  }, [
    featureCentroids,
    featurePaths,
    features,
    fill,
    getFeatureColor,
    getFeaturePattern,
    pathGenerator,
  ]);

  const handleFeatureEnter = useCallback(
    (record: FeatureRecord) => {
      setHoveredFeatureIndex(record.index);
      setTooltipData({
        featureIndex: record.index,
        x: record.centroid?.x ?? width / 2,
        y: record.centroid?.y ?? height / 2,
        feature: record.feature,
      });
    },
    [height, setHoveredFeatureIndex, setTooltipData, width]
  );

  const handleFeatureLeave = useCallback(() => {
    setHoveredFeatureIndex(null);
    setTooltipData(null);
  }, [setHoveredFeatureIndex, setTooltipData]);

  const handleFeatureClick = useCallback(
    (record: FeatureRecord) => {
      onFeatureClick?.(record.feature, record.index);
    },
    [onFeatureClick]
  );

  const layerProps = {
    baseOpacity: 0.85,
    dimOpacity: fadedOpacity,
    hoveredIndex: hoveredFeatureIndex,
    selectedIndexes: selectedFeatureIndexes,
    onFeatureEnter: handleFeatureEnter,
    onFeatureLeave: handleFeatureLeave,
    onFeatureClick: onFeatureClick ? handleFeatureClick : undefined,
    records,
    stroke,
    strokeWidth,
  };

  return (
    <g className="choropleth-features">
      {patterns ? <defs>{patterns}</defs> : null}
      {isLoaded ? (
        <StaticFeatureLayer {...layerProps} />
      ) : (
        <EnterFeatureLayer {...layerProps} revealEpoch={revealEpoch} />
      )}
    </g>
  );
});

ChoroplethFeature.displayName = "ChoroplethFeature";

export default ChoroplethFeature;
