import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generatePolygon(centerLng, centerLat, baseRadius, vertexCount, rand) {
  const coords = []
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * 2 * Math.PI
    const radius = baseRadius * (0.75 + rand() * 0.5)
    const lng = centerLng + radius * Math.cos(angle)
    const lat = centerLat + radius * Math.sin(angle)
    coords.push([lng, lat])
  }
  // Close the ring
  coords.push(coords[0])
  return coords
}

function makeFeature(coords, name, vertexCount, scenario) {
  return {
    type: 'Feature',
    properties: { name, vertexCount, scenario },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  }
}

const publicDir = join(__dirname, '..', 'public')
const CENTER_LNG = 28.97
const CENTER_LAT = 41.01
const BASE_RADIUS = 0.04
const OFFSET = BASE_RADIUS * 0.6

// --- Small scenario ---
const randSmallA = seededRandom(42)
const smallACoords = generatePolygon(CENTER_LNG, CENTER_LAT, BASE_RADIUS, 20, randSmallA)
const smallA = makeFeature(smallACoords, 'polygon-a-small', 20, 'small')

const randSmallB = seededRandom(99)
const smallBCoords = generatePolygon(CENTER_LNG + OFFSET, CENTER_LAT + OFFSET, BASE_RADIUS, 20, randSmallB)
const smallB = makeFeature(smallBCoords, 'polygon-b-small', 20, 'small')

// --- Large scenario ---
const randLargeA = seededRandom(42)
const largeACoords = generatePolygon(CENTER_LNG, CENTER_LAT, BASE_RADIUS, 1000, randLargeA)
const largeA = makeFeature(largeACoords, 'polygon-a-large', 1000, 'large')

const randLargeB = seededRandom(99)
const largeBCoords = generatePolygon(CENTER_LNG + OFFSET, CENTER_LAT + OFFSET, BASE_RADIUS, 1000, randLargeB)
const largeB = makeFeature(largeBCoords, 'polygon-b-large', 1000, 'large')

// Write files
writeFileSync(join(publicDir, 'small-a.geojson'), JSON.stringify(smallA, null, 2))
writeFileSync(join(publicDir, 'small-b.geojson'), JSON.stringify(smallB, null, 2))
writeFileSync(join(publicDir, 'large-a.geojson'), JSON.stringify(largeA, null, 2))
writeFileSync(join(publicDir, 'large-b.geojson'), JSON.stringify(largeB, null, 2))

console.log('✓ small-a.geojson  — 20 vertex')
console.log('✓ small-b.geojson  — 20 vertex')
console.log('✓ large-a.geojson  — 1000 vertex')
console.log('✓ large-b.geojson  — 1000 vertex')

// Verification using turf (optional, if @turf/turf is installed)
try {
  const turf = (await import('@turf/turf')).default || await import('@turf/turf')
  const areaKm2 = turf.area(smallA) / 1e6
  console.log(`Toplam alan (small-a): ~${areaKm2.toFixed(2)} km²`)

  const intersection = turf.intersect(turf.featureCollection([smallA, smallB]))
  if (intersection) {
    console.log('Çakışma kontrolü: intersection boş değil ✓')
  } else {
    console.log('UYARI: intersection boş! Offset veya radius kontrol et.')
  }
} catch (e) {
  console.log('(Turf doğrulama atlandı — npm install sonrası çalıştırın)')
}
