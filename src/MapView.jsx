import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import init, { wasm_intersection } from '../geo-wasm/pkg/geo_wasm.js'

let wasmReady = false

async function ensureWasm() {
  if (!wasmReady) {
    await init()
    wasmReady = true
  }
}

export default function MapView({ scenario }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [28.97, 41.01],
      zoom: 10,
    })

    mapRef.current = map

    map.on('load', () => {
      map.addSource('polygon-a', { type: 'geojson', data: emptyFeature() })
      map.addSource('polygon-b', { type: 'geojson', data: emptyFeature() })
      map.addSource('intersection', { type: 'geojson', data: emptyFeature() })

      map.addLayer({ id: 'polygon-a-fill', type: 'fill', source: 'polygon-a',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.3 } })
      map.addLayer({ id: 'polygon-b-fill', type: 'fill', source: 'polygon-b',
        paint: { 'fill-color': '#f97316', 'fill-opacity': 0.3 } })
      map.addLayer({ id: 'intersection-fill', type: 'fill', source: 'intersection',
        paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.6 } })

      map.addLayer({ id: 'polygon-a-line', type: 'line', source: 'polygon-a',
        paint: { 'line-color': '#3b82f6', 'line-width': 2 } })
      map.addLayer({ id: 'polygon-b-line', type: 'line', source: 'polygon-b',
        paint: { 'line-color': '#f97316', 'line-width': 2 } })
      map.addLayer({ id: 'intersection-line', type: 'line', source: 'intersection',
        paint: { 'line-color': '#22c55e', 'line-width': 3 } })

      loadScenario(map, scenario)
    })

    return () => map.remove()
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    loadScenario(map, scenario)
  }, [scenario])

  return (
    <div style={{ position: 'relative', height: '500px', flex: '0 0 55%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(255,255,255,0.92)', padding: '10px 14px',
        borderRadius: 8, fontSize: 13, lineHeight: '1.7',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div><span style={{ color: '#3b82f6', fontWeight: 700 }}>&#9632;</span> Polygon A</div>
        <div><span style={{ color: '#f97316', fontWeight: 700 }}>&#9632;</span> Polygon B</div>
        <div><span style={{ color: '#22c55e', fontWeight: 700 }}>&#9632;</span> Kesisim alani</div>
      </div>
    </div>
  )
}

function emptyFeature() {
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } }
}

async function loadScenario(map, scenario) {
  const [aData, bData] = await Promise.all([
    fetch(`/${scenario}-a.geojson`).then((r) => r.json()),
    fetch(`/${scenario}-b.geojson`).then((r) => r.json()),
  ])

  map.getSource('polygon-a').setData(aData)
  map.getSource('polygon-b').setData(bData)

  await ensureWasm()
  const a_str = JSON.stringify(aData.geometry)
  const b_str = JSON.stringify(bData.geometry)
  const resultStr = wasm_intersection(a_str, b_str)
  const resultGeom = JSON.parse(resultStr)

  map.getSource('intersection').setData({
    type: 'Feature',
    geometry: resultGeom,
    properties: {},
  })

  // Fit bounds to both polygons
  const allCoords = [
    ...aData.geometry.coordinates[0],
    ...bData.geometry.coordinates[0],
  ]
  const lngs = allCoords.map((c) => c[0])
  const lats = allCoords.map((c) => c[1])
  map.fitBounds(
    [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
    { padding: 40, duration: 500 }
  )
}
