import { Bench } from 'tinybench'
import * as turf from '@turf/turf'
import init, { wasm_intersection } from '../geo-wasm/pkg/geo_wasm.js'

let wasmInitialized = false

export async function runBenchmark(scenario) {
  if (!wasmInitialized) {
    await init()
    wasmInitialized = true
    console.log('[WASM] init tamamlandı')
  }

  const [aData, bData] = await Promise.all([
    fetch(`/${scenario}-a.geojson`).then((r) => r.json()),
    fetch(`/${scenario}-b.geojson`).then((r) => r.json()),
  ])

  // Prepare geometry objects for Turf (same refs every iteration)
  const a = aData
  const b = bData

  // Prepare geometry-only strings for WASM (JSON.stringify outside the loop)
  const a_str = JSON.stringify(aData.geometry)
  const b_str = JSON.stringify(bData.geometry)

  const iterations = scenario === 'large' ? 100 : 500
  const bench = new Bench({ iterations })

  bench.add('Turf.js', () => {
    turf.intersect(turf.featureCollection([a, b]))
  })

  bench.add('Rust WASM', () => {
    wasm_intersection(a_str, b_str)
  })

  await bench.run()

  return bench.tasks.map((t) => ({
    name: t.name,
    ops: t.result.hz,
    mean: t.result.mean * 1000,
    min: t.result.min * 1000,
    max: t.result.max * 1000,
    sd: t.result.sd * 1000,
    p75: t.result.p75 * 1000,
    p99: t.result.p99 * 1000,
  }))
}
