"use client"

import { useCallback, useMemo, useState } from "react"
import { ParentSize } from "@visx/responsive"
import { Move, TrendingUp, X } from "lucide-react"

import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethGraticule,
  ChoroplethTooltip,
  type ChoroplethFeature,
} from "@/components/charts/choropleth"
import { CHART_SCALE_VARS } from "@/components/charts/chart-scale"
import { ChoroplethRegionOutline } from "@/components/choropleth-region-outline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import {
  divisionOutlineMesh,
  divisionSummaries,
  getMetricRange,
  getMetricValue,
  getValueBin,
  legendStopsFor,
  regionOutlineMesh,
  regionSummaries,
  salesTotal,
  usStatesGeo,
  type MapViewMode,
  type UsStateProperties,
} from "@/lib/us-states-data"

/** Contiguous US needs ~9× the registry default world Mercator scale. */
function usProjectionScale(width: number) {
  return (Math.max(width, 320) / 630) * 920
}

function formatSales(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value)
}

export type GeoSelection = {
  level: MapViewMode
  key: string
  label: string
}

const MODE_COPY: Record<
  MapViewMode,
  { title: string; description: string; listLabel: string; valueLabel: string }
> = {
  state: {
    title: "eCommerce sales by state",
    description:
      "Click a state to filter the stats and list below. Click again to clear.",
    listLabel: "Top states",
    valueLabel: "Sales",
  },
  division: {
    title: "eCommerce sales by division",
    description:
      "Click any state to select its Census division — the map dims the rest and filters the panel.",
    listLabel: "Top divisions",
    valueLabel: "Division total",
  },
  region: {
    title: "eCommerce sales by region",
    description:
      "Click any state to select its Census region — the map dims the rest and filters the panel.",
    listLabel: "Top regions",
    valueLabel: "Region total",
  },
}

function selectionFromFeature(
  props: UsStateProperties,
  mode: MapViewMode
): GeoSelection {
  if (mode === "region") {
    return { level: "region", key: props.region, label: props.region }
  }
  if (mode === "division") {
    return { level: "division", key: props.division, label: props.division }
  }
  return { level: "state", key: props.fips, label: props.name }
}

function matchesSelection(
  props: UsStateProperties,
  selection: GeoSelection
): boolean {
  if (selection.level === "state") return props.fips === selection.key
  if (selection.level === "division") return props.division === selection.key
  return props.region === selection.key
}

export function UsChoroplethDemo() {
  const [mode, setMode] = useState<MapViewMode>("state")
  const [selection, setSelection] = useState<GeoSelection | null>(null)

  const copy = MODE_COPY[mode]
  const range = getMetricRange(mode)
  const legendStops = useMemo(
    () => legendStopsFor(range.min, range.max),
    [range.min, range.max]
  )

  const filteredFeatures = useMemo(() => {
    if (!selection) return usStatesGeo.features
    return usStatesGeo.features.filter((f) =>
      matchesSelection(f.properties, selection)
    )
  }, [selection])

  const selectedFeatureIndexes = useMemo(() => {
    if (!selection) return null
    const indexes = new Set<number>()
    usStatesGeo.features.forEach((f, index) => {
      if (matchesSelection(f.properties, selection)) {
        indexes.add(index)
      }
    })
    return indexes
  }, [selection])

  const filteredSales = useMemo(
    () =>
      filteredFeatures.reduce((sum, f) => sum + f.properties.sales, 0),
    [filteredFeatures]
  )

  const getFeatureColor = useCallback(
    (feature: ChoroplethFeature) => {
      const props = feature.properties as UsStateProperties
      const value = getMetricValue(props, mode)
      return CHART_SCALE_VARS[getValueBin(value, range.min, range.max)]
    },
    [mode, range.max, range.min]
  )

  const getFeatureName = useCallback(
    (feature: ChoroplethFeature) => {
      const props = feature.properties as UsStateProperties
      if (mode === "region") {
        return `${props.name} · ${props.region}`
      }
      if (mode === "division") {
        return `${props.name} · ${props.division}`
      }
      return props.name
    },
    [mode]
  )

  const getFeatureValue = useCallback(
    (feature: ChoroplethFeature) => {
      const props = feature.properties as UsStateProperties
      return getMetricValue(props, mode)
    },
    [mode]
  )

  const handleFeatureClick = useCallback(
    (feature: ChoroplethFeature) => {
      const props = feature.properties as UsStateProperties
      const next = selectionFromFeature(props, mode)
      setSelection((prev) =>
        prev && prev.level === next.level && prev.key === next.key ? null : next
      )
    },
    [mode]
  )

  const handleModeChange = useCallback((next: MapViewMode) => {
    setMode(next)
    setSelection(null)
  }, [])

  const ranking = useMemo(() => {
    if (selection) {
      // Under a filter, list the states inside the selection (most useful drill-down).
      return [...filteredFeatures]
        .sort((a, b) => b.properties.sales - a.properties.sales)
        .slice(0, 8)
        .map((f) => ({
          key: f.properties.fips,
          name: f.properties.name,
          sales: f.properties.sales,
          selectable: true as const,
          selectAs: selectionFromFeature(f.properties, "state"),
        }))
    }

    if (mode === "region") {
      return [...regionSummaries]
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 4)
        .map((r) => ({
          key: r.key,
          name: r.name,
          sales: r.sales,
          selectable: true as const,
          selectAs: {
            level: "region" as const,
            key: r.key,
            label: r.name,
          },
        }))
    }

    if (mode === "division") {
      return [...divisionSummaries]
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)
        .map((d) => ({
          key: d.key,
          name: d.name,
          sales: d.sales,
          selectable: true as const,
          selectAs: {
            level: "division" as const,
            key: d.key,
            label: d.name,
          },
        }))
    }

    return [...usStatesGeo.features]
      .sort((a, b) => b.properties.sales - a.properties.sales)
      .slice(0, 5)
      .map((f) => ({
        key: f.properties.fips,
        name: f.properties.name,
        sales: f.properties.sales,
        selectable: true as const,
        selectAs: selectionFromFeature(f.properties, "state"),
      }))
  }, [filteredFeatures, mode, selection])

  const peakInFilter = useMemo(() => {
    if (filteredFeatures.length === 0) return "—"
    return [...filteredFeatures].sort(
      (a, b) => b.properties.sales - a.properties.sales
    )[0]?.properties.name
  }, [filteredFeatures])

  const outlineGeo =
    mode === "region"
      ? regionOutlineMesh
      : mode === "division"
        ? divisionOutlineMesh
        : null

  const listLabel = selection
    ? selection.level === "state"
      ? "Selected state"
      : `States in ${selection.label}`
    : copy.listLabel

  return (
    <Card className="w-full overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 bg-muted/30 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Bklit UI</Badge>
            <Badge variant="outline">US States</Badge>
            {selection ? (
              <Badge variant="default" className="gap-1 pr-1">
                Filtered · {selection.label}
                <Button
                  aria-label="Clear map filter"
                  className="size-5 rounded-sm"
                  onClick={() => setSelection(null)}
                  size="icon-xs"
                  variant="ghost"
                >
                  <X data-icon="inline-start" />
                </Button>
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl tracking-tight sm:text-2xl">
            {copy.title}
          </CardTitle>
          <CardDescription className="max-w-xl text-pretty">
            {copy.description}
          </CardDescription>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ToggleGroup
            value={[mode]}
            onValueChange={(next) => {
              const selected = next[0] as MapViewMode | undefined
              if (selected) handleModeChange(selected)
            }}
            size="sm"
            variant="outline"
            aria-label="Map grouping"
          >
            <ToggleGroupItem value="state">State</ToggleGroupItem>
            <ToggleGroupItem value="division">Division</ToggleGroupItem>
            <ToggleGroupItem value="region">Region</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Move className="size-3.5" aria-hidden />
            <span>Click to filter · scroll to zoom</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 p-0">
        <div className="relative w-full bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0.015_205)_0%,_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.22_0.03_230)_0%,_transparent_55%)]">
          <ParentSize
            debounceTime={10}
            parentSizeStyles={{ width: "100%", height: "auto" }}
          >
            {({ width }) =>
              width > 0 ? (
                <ChoroplethChart
                  aspectRatio="2 / 1"
                  center={[-97.5, 38.5]}
                  className="w-full"
                  data={usStatesGeo}
                  margin={{ top: 12, right: 16, bottom: 12, left: 16 }}
                  revealSignature={mode}
                  scale={usProjectionScale(width)}
                  zoomEnabled
                  zoomMax={6}
                  zoomMin={0.75}
                >
                  <ChoroplethGraticule
                    step={[10, 10]}
                    stroke="color-mix(in oklab, var(--chart-grid) 70%, transparent)"
                    strokeWidth={0.4}
                  />
                  <ChoroplethFeatureComponent
                    fadedOpacity={0.28}
                    getFeatureColor={getFeatureColor}
                    onFeatureClick={handleFeatureClick}
                    selectedFeatureIndexes={selectedFeatureIndexes}
                    stroke={
                      mode === "state"
                        ? "var(--background)"
                        : "color-mix(in oklab, var(--background) 55%, transparent)"
                    }
                    strokeWidth={mode === "state" ? 0.75 : 0.4}
                  />
                  {outlineGeo ? (
                    <ChoroplethRegionOutline
                      geo={outlineGeo}
                      stroke="var(--foreground)"
                      strokeWidth={2}
                    />
                  ) : null}
                  <ChoroplethTooltip
                    formatValue={formatSales}
                    getFeatureName={getFeatureName}
                    getFeatureValue={getFeatureValue}
                    valueLabel={copy.valueLabel}
                  />
                </ChoroplethChart>
              ) : (
                <div className="aspect-[2/1] w-full" />
              )
            }
          </ParentSize>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 sm:justify-end sm:pr-6">
            <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border/70 bg-background/85 px-3 py-2 text-xs shadow-sm backdrop-blur-md">
              <span className="text-muted-foreground">
                {mode === "state"
                  ? "Sales"
                  : mode === "division"
                    ? "Division total"
                    : "Region total"}
              </span>
              <div className="flex items-center gap-0.5">
                {legendStops.map((stop) => (
                  <div
                    className="size-3.5 first:rounded-l-sm last:rounded-r-sm"
                    key={stop.bin}
                    style={{ background: CHART_SCALE_VARS[stop.bin] }}
                    title={`${formatSales(stop.lo)} – ${formatSales(stop.hi)}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground tabular-nums">
                <span>{formatSales(legendStops[0].lo)}</span>
                <span aria-hidden>→</span>
                <span>{formatSales(range.max)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 pb-2 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {selection ? "Filtered sales" : "Total sales"}
            </span>
            <span className="text-2xl font-medium tracking-tight tabular-nums">
              {formatSales(selection ? filteredSales : salesTotal)}
            </span>
            {selection ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {((filteredSales / salesTotal) * 100).toFixed(1)}% of US
                total
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {selection
                ? "States in filter"
                : mode === "state"
                  ? "States mapped"
                  : mode === "division"
                    ? "Divisions"
                    : "Regions"}
            </span>
            <span className="text-2xl font-medium tracking-tight tabular-nums">
              {selection
                ? filteredFeatures.length
                : mode === "state"
                  ? usStatesGeo.features.length
                  : mode === "division"
                    ? divisionSummaries.length
                    : regionSummaries.length}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {selection
                ? "Peak in filter"
                : mode === "state"
                  ? "Peak state"
                  : mode === "division"
                    ? "Peak division"
                    : "Peak region"}
            </span>
            <span className="text-2xl font-medium tracking-tight">
              {selection
                ? peakInFilter
                : (ranking[0]?.name ?? "—")}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {listLabel}
            </p>
            {selection ? (
              <Button
                onClick={() => setSelection(null)}
                size="sm"
                variant="ghost"
              >
                Clear filter
              </Button>
            ) : null}
          </div>
          <ul
            className={
              selection || mode === "region"
                ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                : "grid gap-2 sm:grid-cols-5"
            }
          >
            {ranking.map((item, index) => {
              const isActive =
                selection?.key === item.selectAs.key &&
                selection?.level === item.selectAs.level

              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-baseline justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 hover:bg-muted"
                    )}
                    onClick={() =>
                      setSelection((prev) =>
                        prev &&
                        prev.key === item.selectAs.key &&
                        prev.level === item.selectAs.level
                          ? null
                          : item.selectAs
                      )
                    }
                  >
                    <span className="truncate text-sm">
                      <span
                        className={cn(
                          "mr-1.5 tabular-nums",
                          isActive
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {index + 1}.
                      </span>
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm tabular-nums",
                        isActive
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatSales(item.sales)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2 border-t border-border/60 text-sm text-muted-foreground">
        <TrendingUp className="size-4" aria-hidden />
        {selection
          ? `Showing ${selection.label} · click the map or Clear filter to reset`
          : "Sales up 5.2% vs last month · click the map to filter"}
      </CardFooter>
    </Card>
  )
}
