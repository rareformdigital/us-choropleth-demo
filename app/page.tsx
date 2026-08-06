import { UsChoroplethDemo } from "@/components/us-choropleth-demo"

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_15%_-10%,oklch(0.93_0.03_205/0.7),transparent_50%),radial-gradient(900px_circle_at_90%_10%,oklch(0.94_0.02_230/0.5),transparent_45%),linear-gradient(180deg,oklch(0.99_0.005_205),oklch(0.97_0.01_220))] dark:bg-[radial-gradient(1000px_circle_at_20%_-5%,oklch(0.28_0.05_230/0.45),transparent_50%),radial-gradient(800px_circle_at_85%_0%,oklch(0.25_0.04_210/0.35),transparent_45%),linear-gradient(180deg,oklch(0.16_0.02_250),oklch(0.13_0.015_240))]"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Bklit · Choropleth
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            United States sales
          </h1>
          <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
            A polished US-only eCommerce sales map built with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              @bklit/choropleth-chart
            </code>
            . Toggle between state, Census division, and region views. Click the
            map (or the list) to filter the stats panel by that geography.
          </p>
        </header>

        <UsChoroplethDemo />
      </div>
    </main>
  )
}
