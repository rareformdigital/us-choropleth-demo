import type { FeatureCollection, Geometry, MultiLineString } from "geojson"
import { feature, mesh } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"
import statesTopology from "us-atlas/states-10m.json"

import type { ChoroplethFeatureProperties } from "@/components/charts/choropleth"

/** Alaska, Hawaii, and territories — omitted so Mercator frames the contiguous US cleanly. */
export const EXCLUDED_FIPS = new Set([
  "02", // Alaska
  "15", // Hawaii
  "60", // American Samoa
  "66", // Guam
  "69", // Northern Mariana Islands
  "72", // Puerto Rico
  "78", // U.S. Virgin Islands
])

export type CensusRegion = "Northeast" | "Midwest" | "South" | "West"

export type CensusDivision =
  | "New England"
  | "Middle Atlantic"
  | "East North Central"
  | "West North Central"
  | "South Atlantic"
  | "East South Central"
  | "West South Central"
  | "Mountain"
  | "Pacific"

export type MapViewMode = "state" | "division" | "region"

/** Census Bureau FIPS → region / division. */
export const FIPS_CENSUS: Record<
  string,
  { region: CensusRegion; division: CensusDivision }
> = {
  "01": { region: "South", division: "East South Central" }, // Alabama
  "04": { region: "West", division: "Mountain" }, // Arizona
  "05": { region: "South", division: "West South Central" }, // Arkansas
  "06": { region: "West", division: "Pacific" }, // California
  "08": { region: "West", division: "Mountain" }, // Colorado
  "09": { region: "Northeast", division: "New England" }, // Connecticut
  "10": { region: "South", division: "South Atlantic" }, // Delaware
  "11": { region: "South", division: "South Atlantic" }, // District of Columbia
  "12": { region: "South", division: "South Atlantic" }, // Florida
  "13": { region: "South", division: "South Atlantic" }, // Georgia
  "16": { region: "West", division: "Mountain" }, // Idaho
  "17": { region: "Midwest", division: "East North Central" }, // Illinois
  "18": { region: "Midwest", division: "East North Central" }, // Indiana
  "19": { region: "Midwest", division: "West North Central" }, // Iowa
  "20": { region: "Midwest", division: "West North Central" }, // Kansas
  "21": { region: "South", division: "East South Central" }, // Kentucky
  "22": { region: "South", division: "West South Central" }, // Louisiana
  "23": { region: "Northeast", division: "New England" }, // Maine
  "24": { region: "South", division: "South Atlantic" }, // Maryland
  "25": { region: "Northeast", division: "New England" }, // Massachusetts
  "26": { region: "Midwest", division: "East North Central" }, // Michigan
  "27": { region: "Midwest", division: "West North Central" }, // Minnesota
  "28": { region: "South", division: "East South Central" }, // Mississippi
  "29": { region: "Midwest", division: "West North Central" }, // Missouri
  "30": { region: "West", division: "Mountain" }, // Montana
  "31": { region: "Midwest", division: "West North Central" }, // Nebraska
  "32": { region: "West", division: "Mountain" }, // Nevada
  "33": { region: "Northeast", division: "New England" }, // New Hampshire
  "34": { region: "Northeast", division: "Middle Atlantic" }, // New Jersey
  "35": { region: "West", division: "Mountain" }, // New Mexico
  "36": { region: "Northeast", division: "Middle Atlantic" }, // New York
  "37": { region: "South", division: "South Atlantic" }, // North Carolina
  "38": { region: "Midwest", division: "West North Central" }, // North Dakota
  "39": { region: "Midwest", division: "East North Central" }, // Ohio
  "40": { region: "South", division: "West South Central" }, // Oklahoma
  "41": { region: "West", division: "Pacific" }, // Oregon
  "42": { region: "Northeast", division: "Middle Atlantic" }, // Pennsylvania
  "44": { region: "Northeast", division: "New England" }, // Rhode Island
  "45": { region: "South", division: "South Atlantic" }, // South Carolina
  "46": { region: "Midwest", division: "West North Central" }, // South Dakota
  "47": { region: "South", division: "East South Central" }, // Tennessee
  "48": { region: "South", division: "West South Central" }, // Texas
  "49": { region: "West", division: "Mountain" }, // Utah
  "50": { region: "Northeast", division: "New England" }, // Vermont
  "51": { region: "South", division: "South Atlantic" }, // Virginia
  "53": { region: "West", division: "Pacific" }, // Washington
  "54": { region: "South", division: "South Atlantic" }, // West Virginia
  "55": { region: "Midwest", division: "East North Central" }, // Wisconsin
  "56": { region: "West", division: "Mountain" }, // Wyoming
}

export const REGION_ORDER: CensusRegion[] = [
  "Northeast",
  "Midwest",
  "South",
  "West",
]

export const DIVISION_ORDER: CensusDivision[] = [
  "New England",
  "Middle Atlantic",
  "East North Central",
  "West North Central",
  "South Atlantic",
  "East South Central",
  "West South Central",
  "Mountain",
  "Pacific",
]

/** Curated eCommerce sales ($) for a realistic demo distribution. */
const SALES_OVERRIDES: Record<string, number> = {
  California: 4_286_000,
  Texas: 2_962_000,
  Florida: 2_292_000,
  "New York": 2_138_000,
  Pennsylvania: 1_264_000,
  Illinois: 1_195_000,
  Ohio: 1_068_000,
  Georgia: 1_023_000,
  "North Carolina": 956_000,
  Michigan: 892_000,
  "New Jersey": 853_000,
  Virginia: 804_000,
  Washington: 754_000,
  Arizona: 719_000,
  Massachusetts: 679_000,
  Tennessee: 642_000,
  Indiana: 596_000,
  Missouri: 559_000,
  Maryland: 537_000,
  Wisconsin: 505_000,
  Colorado: 486_000,
  Minnesota: 464_000,
  "South Carolina": 427_000,
  Alabama: 386_000,
  Louisiana: 364_000,
  Kentucky: 344_000,
  Oregon: 327_000,
  Oklahoma: 307_000,
  Connecticut: 295_000,
  Utah: 273_000,
  Iowa: 253_000,
  Nevada: 239_000,
  Arkansas: 217_000,
  Mississippi: 204_000,
  Kansas: 192_000,
  "New Mexico": 179_000,
  Nebraska: 156_000,
  Idaho: 142_000,
  "West Virginia": 123_000,
  Hawaii: 0,
  "New Hampshire": 110_000,
  Maine: 102_000,
  Montana: 89_000,
  "Rhode Island": 82_000,
  Delaware: 76_000,
  "South Dakota": 65_000,
  "North Dakota": 57_000,
  Alaska: 0,
  Vermont: 50_000,
  Wyoming: 37_000,
  "District of Columbia": 144_000,
}

function seededSales(name: string, fips: string): number {
  const override = SALES_OVERRIDES[name]
  if (override !== undefined) return override

  let hash = 0
  for (let i = 0; i < fips.length; i++) {
    hash = (hash * 33 + fips.charCodeAt(i)) >>> 0
  }
  return 36_000 + (hash % 270_000)
}

export type UsStateProperties = ChoroplethFeatureProperties & {
  name: string
  fips: string
  sales: number
  region: CensusRegion
  division: CensusDivision
  regionSales: number
  divisionSales: number
}

export type UsStatesGeoJSON = FeatureCollection<Geometry, UsStateProperties>

type StatesTopology = Topology<{ states: GeometryCollection }>

const topology = statesTopology as unknown as StatesTopology

const raw = feature(topology, topology.objects.states) as FeatureCollection<
  Geometry,
  { name?: string }
>

type TopoGeom = { id?: string | number }

function censusForFips(fips: string) {
  return (
    FIPS_CENSUS[fips] ?? {
      region: "South" as const,
      division: "South Atlantic" as const,
    }
  )
}

const mappedFeatures = raw.features
  .filter((f) => !EXCLUDED_FIPS.has(String(f.id ?? "")))
  .map((f) => {
    const fips = String(f.id ?? "")
    const name = f.properties?.name ?? `State ${fips}`
    const sales = seededSales(name, fips)
    const { region, division } = censusForFips(fips)
    return {
      ...f,
      properties: {
        ...f.properties,
        name,
        fips,
        sales,
        region,
        division,
        regionSales: 0,
        divisionSales: 0,
      } satisfies UsStateProperties,
    }
  })

const regionTotals = Object.fromEntries(
  REGION_ORDER.map((r) => [r, 0])
) as Record<CensusRegion, number>

const divisionTotals = Object.fromEntries(
  DIVISION_ORDER.map((d) => [d, 0])
) as Record<CensusDivision, number>

for (const f of mappedFeatures) {
  regionTotals[f.properties.region] += f.properties.sales
  divisionTotals[f.properties.division] += f.properties.sales
}

export const usStatesGeo: UsStatesGeoJSON = {
  type: "FeatureCollection",
  features: mappedFeatures.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      regionSales: regionTotals[f.properties.region],
      divisionSales: divisionTotals[f.properties.division],
    },
  })),
}

export const salesValues = usStatesGeo.features.map((f) => f.properties.sales)

export const salesMin = Math.min(...salesValues)
export const salesMax = Math.max(...salesValues)
export const salesTotal = salesValues.reduce((sum, n) => sum + n, 0)

export const regionSalesValues = REGION_ORDER.map((r) => regionTotals[r])
export const regionSalesMin = Math.min(...regionSalesValues)
export const regionSalesMax = Math.max(...regionSalesValues)

export const divisionSalesValues = DIVISION_ORDER.map((d) => divisionTotals[d])
export const divisionSalesMin = Math.min(...divisionSalesValues)
export const divisionSalesMax = Math.max(...divisionSalesValues)

export function getValueBin(
  value: number,
  min: number,
  max: number
): 0 | 1 | 2 | 3 | 4 {
  if (max === min) return 2
  const t = (value - min) / (max - min)
  if (t < 0.2) return 0
  if (t < 0.4) return 1
  if (t < 0.6) return 2
  if (t < 0.8) return 3
  return 4
}

export function getSalesBin(value: number): 0 | 1 | 2 | 3 | 4 {
  return getValueBin(value, salesMin, salesMax)
}

export function legendStopsFor(min: number, max: number) {
  return [0, 1, 2, 3, 4].map((bin) => {
    const lo = min + (max - min) * (bin * 0.2)
    const hi = min + (max - min) * ((bin + 1) * 0.2)
    return { bin, lo, hi }
  })
}

export const legendStops = legendStopsFor(salesMin, salesMax)

export function getGroupKey(
  props: UsStateProperties,
  mode: MapViewMode
): string {
  if (mode === "region") return props.region
  if (mode === "division") return props.division
  return props.fips
}

export function getMetricValue(
  props: UsStateProperties,
  mode: MapViewMode
): number {
  if (mode === "region") return props.regionSales
  if (mode === "division") return props.divisionSales
  return props.sales
}

export function getMetricRange(mode: MapViewMode): {
  min: number
  max: number
} {
  if (mode === "region") {
    return { min: regionSalesMin, max: regionSalesMax }
  }
  if (mode === "division") {
    return { min: divisionSalesMin, max: divisionSalesMax }
  }
  return { min: salesMin, max: salesMax }
}

function buildGroupMesh(
  getGroup: (fips: string) => string
): MultiLineString {
  return mesh(topology, topology.objects.states, (a, b) => {
    const geomA = a as TopoGeom
    const geomB = b as TopoGeom
    const idA = String(geomA.id ?? "")
    const idB = String(geomB.id ?? "")

    if (EXCLUDED_FIPS.has(idA) || EXCLUDED_FIPS.has(idB)) {
      return false
    }

    // Exterior coastlines of included states
    if (a === b) {
      return true
    }

    return getGroup(idA) !== getGroup(idB)
  }) as MultiLineString
}

/** Thick outline paths: coasts + borders where adjacent states differ by group. */
export const regionOutlineMesh = buildGroupMesh(
  (fips) => censusForFips(fips).region
)

export const divisionOutlineMesh = buildGroupMesh(
  (fips) => censusForFips(fips).division
)

export const regionSummaries = REGION_ORDER.map((region) => ({
  key: region,
  name: region,
  sales: regionTotals[region],
  states: usStatesGeo.features.filter((f) => f.properties.region === region)
    .length,
}))

export const divisionSummaries = DIVISION_ORDER.map((division) => ({
  key: division,
  name: division,
  sales: divisionTotals[division],
  states: usStatesGeo.features.filter((f) => f.properties.division === division)
    .length,
}))
