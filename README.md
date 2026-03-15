# Turf.js vs Rust WASM — Polygon Intersection Benchmark

## Motivation

Turf.js is the go-to library for vector analysis in web GIS applications.
But as datasets grow, JavaScript's garbage collector becomes a bottleneck —
causing unpredictable frame drops and inconsistent latency.

This project explores whether compiling the same algorithm to WebAssembly
via Rust can deliver measurable, production-relevant improvements.

---

## Results

### Small Polygon (~20 vertices)

![Small Polygon Benchmark Result](assets/small-polygon-result.png)

| Metric       | Turf.js | Rust WASM | Diff   |
|--------------|---------|-----------|--------|
| ops/sec      | 2,442   | 30,811    | 12.62x |
| Mean (ms)    | 418.36  | 26.24     | 15.95x |
| Min (ms)     | 300.00  | 0.00      | —      |
| Max (ms)     | 600.00  | 200.00    | 3.00x  |
| Std Dev (ms) | 59.65   | 44.71     | 1.33x  |
| P75 (ms)     | 500.00  | 100.00    | 5.00x  |
| P99 (ms)     | 500.00  | 100.00    | 5.00x  |

**Result:** For small polygons, Rust WASM is ~12.6x faster than Turf.js.

---

### Large Polygon (~1000 vertices)

![Large Polygon Benchmark Result](assets/large-polygon-result.png)

| Metric       | Turf.js    | Rust WASM | Diff   |
|--------------|------------|-----------|--------|
| ops/sec      | 5          | 196       | 38.39x |
| Mean (ms)    | 195.81     | 5.10      | 38.40x |
| Min (ms)     | 188.60     | 4.90      | 38.49x |
| Max (ms)     | 231.60     | 5.70      | 40.63x |
| Std Dev (ms) | 6.16       | 0.14      | 44.99x |
| P75 (ms)     | 197.25     | 5.20      | 37.93x |
| P99 (ms)     | 211.60     | 5.41      | 39.13x |

> **Note on units:** All timing values are in milliseconds (ms). Raw TinyBench
> output is in seconds; values here have been converted for readability.

**Result:** For large, complex polygons, Rust WASM is ~38.4x faster than Turf.js.

---

## Summary

| Scenario      | Turf.js ops/sec | WASM ops/sec | Speed Diff | Std Dev Diff |
|---------------|-----------------|--------------|------------|--------------|
| Small polygon | 2,442           | 30,811       | **12.62x** | 1.33x        |
| Large polygon | 5               | 196          | **38.39x** | **44.99x**   |

As polygon complexity increases, WASM's advantage grows dramatically. WASM also
produces significantly more consistent results on the large polygon test — std dev
is 44.99x lower, meaning far fewer GC-induced latency spikes.

---

## Test Environment

- **Browser**: Chrome 133
- **OS**: macOS 15.x
- **CPU**: Apple M_ / Intel Core i_

> Results will vary by machine and browser. The relative ratios (Turf vs WASM)
> are more meaningful than absolute numbers.

---

## Benchmark Methodology

- **Tool**: [TinyBench](https://github.com/tinylibs/tinybench)
- **Iterations**: 500 for the small scenario, 100 for the large scenario
- **Warmup**: TinyBench default warmup (16 iterations, 250ms)
- **Data**: Seeded random polygons around Istanbul center — seed `42` for polygon A,
  seed `99` for polygon B — fully reproducible
- **Algorithm**: Martinez-Rueda family on both sides (Turf: `polyclip-ts`,
  WASM: `geo` crate `BooleanOps` trait via Martinez-Rueda)

### What Is Being Measured?

This benchmark measures a **real-world usage** scenario:

- **Turf.js side**: Intersection computed on pre-parsed JavaScript objects
- **WASM side**: Receive JSON string → parse JSON → convert GeoJSON to geo types →
  compute intersection → serialize result back to JSON string

WASM therefore carries the full serialization/deserialization cost of crossing the
JS/WASM boundary. This is a realistic reflection of how you would actually use WASM
in a web application. **Raw algorithm speed is not being measured.**

---

## Fairness Note

The benchmark is broadly fair but has a few asymmetries worth noting:

| Condition | Effect |
|-----------|--------|
| WASM parses JSON and converts GeoJSON types on every iteration; Turf uses pre-parsed JS objects | **Disadvantages WASM** |
| WASM serializes the result to a JSON string; Turf returns a JS object directly | **Disadvantages WASM** |
| Turf creates a new `featureCollection([a,b])` object on every iteration | **Disadvantages Turf** (minimal) |
| Turf always runs first (JIT still warming up); WASM runs second (CPU cache warmer) | **Unclear** |
| Turf allocates JS objects each iteration, which can trigger GC; WASM uses linear memory | **Disadvantages Turf** (unclear magnitude) |

**Overall:** WASM produces these results while bearing the serialization/deserialization
overhead. If raw intersection performance were measured in isolation, the gap would
be even larger.

---

## Project Structure

```
turf-vs-wasm/
└── intersection-benchmark/
    ├── src/
    │   ├── App.jsx            # UI and benchmark orchestration
    │   ├── benchmark.js       # Measurement logic with TinyBench
    │   └── MapView.jsx        # MapLibre map view
    ├── scripts/
    │   └── generate-data.js   # GeoJSON test data generator (seeds: 42, 99)
    ├── public/
    │   ├── small-a.geojson    # ~20 vertex polygon (seed 42)
    │   ├── small-b.geojson    # ~20 vertex polygon (seed 99)
    │   ├── large-a.geojson    # ~1000 vertex polygon (seed 42)
    │   └── large-b.geojson    # ~1000 vertex polygon (seed 99)
    └── geo-wasm/
        ├── src/lib.rs         # Rust WASM intersection implementation
        └── pkg/               # Compiled WASM binary and JS bindings
```

---

## Development

```bash
cd intersection-benchmark
npm install
npm run dev
```

To regenerate test data:

```bash
npm run generate
```

To recompile WASM (requires `wasm-pack`):

```bash
cd geo-wasm
wasm-pack build --target web --release
```
