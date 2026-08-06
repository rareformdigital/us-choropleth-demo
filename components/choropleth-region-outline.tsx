"use client"

import type { MultiLineString } from "geojson"
import { memo } from "react"

import { useChoroplethStable } from "@/components/charts/choropleth/choropleth-context"

export interface ChoroplethRegionOutlineProps {
  /** Precomputed topojson mesh (MultiLineString) for group boundaries */
  geo: MultiLineString
  stroke?: string
  strokeWidth?: number
  className?: string
}

/**
 * Draws a stroke-only path for regional / division outlines.
 * Must be a direct child of ChoroplethChart (registered as an SVG layer).
 */
export const ChoroplethRegionOutline = memo(function ChoroplethRegionOutline({
  geo,
  stroke = "var(--foreground)",
  strokeWidth = 1.75,
  className,
}: ChoroplethRegionOutlineProps) {
  const { rawPathGenerator } = useChoroplethStable()
  const d = rawPathGenerator(geo)

  if (!d) {
    return null
  }

  return (
    <path
      className={className}
      d={d}
      fill="none"
      pointerEvents="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  )
})

ChoroplethRegionOutline.displayName = "ChoroplethRegionOutline"

export default ChoroplethRegionOutline
