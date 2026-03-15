import { useState } from 'react'
import MapView from './MapView.jsx'
import { runBenchmark } from './benchmark.js'

function fmt(n, decimals = 4) {
  return n == null ? '—' : n.toFixed(decimals)
}

function fmtOps(n) {
  return n == null ? '—' : Math.round(n).toLocaleString()
}

function ratio(a, b) {
  if (a == null || b == null || b === 0) return '—'
  return (a / b).toFixed(2) + 'x'
}

function ResultTable({ results, scenario }) {
  if (!results || results.length < 2) return null
  const turf = results.find((r) => r.name === 'Turf.js')
  const wasm = results.find((r) => r.name === 'Rust WASM')
  const label = scenario === 'small' ? 'Kucuk Polygon (~20 vertex)' : 'Buyuk Polygon (~1000 vertex)'

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{label}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={th}>Metrik</th>
            <th style={th}>Turf.js</th>
            <th style={th}>Rust WASM</th>
            <th style={th}>Fark</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>ops/saniye</td>
            <td style={td}>{fmtOps(turf?.ops)}</td>
            <td style={td}>{fmtOps(wasm?.ops)}</td>
            <td style={{ ...td, color: '#16a34a', fontWeight: 600 }}>{ratio(wasm?.ops, turf?.ops)}</td>
          </tr>
          {[
            ['Ortalama (ms)', 'mean'],
            ['Min (ms)', 'min'],
            ['Max (ms)', 'max'],
            ['Std Sapma (ms)', 'sd'],
            ['P75 (ms)', 'p75'],
            ['P99 (ms)', 'p99'],
          ].map(([label, key]) => (
            <tr key={key}>
              <td style={td}>{label}</td>
              <td style={td}>{fmt(turf?.[key])}</td>
              <td style={td}>{fmt(wasm?.[key])}</td>
              <td style={td}>{key === 'ops' ? ratio(wasm?.[key], turf?.[key]) : ratio(turf?.[key], wasm?.[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const th = {
  padding: '6px 10px', textAlign: 'left', fontWeight: 600,
  borderBottom: '2px solid #e2e8f0',
}
const td = {
  padding: '5px 10px', borderBottom: '1px solid #e2e8f0',
}

export default function App() {
  const [scenario, setScenario] = useState('small')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState({}) // { small: [...], large: [...] }
  const currentResults = results[scenario]

  async function handleBenchmark() {
    setRunning(true)
    try {
      const res = await runBenchmark(scenario)
      setResults((prev) => ({ ...prev, [scenario]: res }))
    } catch (e) {
      console.error('Benchmark error:', e)
      alert('Benchmark hatasi: ' + e.message)
    } finally {
      setRunning(false)
    }
  }

  const smallRes = results['small']
  const largeRes = results['large']
  const bothDone = smallRes && largeRes

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>Turf.js vs Rust WASM — Polygon Intersection Benchmark</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setScenario('small')}
            style={btnStyle(scenario === 'small')}
          >
            Kucuk Polygon (20v)
          </button>
          <button
            onClick={() => setScenario('large')}
            style={btnStyle(scenario === 'large')}
          >
            Buyuk Polygon (1000v)
          </button>
          <button
            onClick={handleBenchmark}
            disabled={running}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
              background: running ? '#94a3b8' : '#16a34a', color: '#fff', fontWeight: 600, fontSize: 14,
            }}
          >
            {running ? 'Calisıyor... (500 iter)' : 'Benchmark Baslat'}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <MapView scenario={scenario} />

        {/* Results panel */}
        <div style={{
          flex: '0 0 45%', height: 500, overflowY: 'auto',
          border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
        }}>
          {!currentResults && !running && (
            <p style={{ color: '#64748b', marginTop: 40, textAlign: 'center' }}>
              Senaryo secip "Benchmark Baslat"a tiklayin.
            </p>
          )}
          {running && (
            <p style={{ color: '#64748b', marginTop: 40, textAlign: 'center' }}>
              Benchmark calisiyor, lutfen bekleyin...
            </p>
          )}
          {currentResults && <ResultTable results={currentResults} scenario={scenario} />}

          {bothDone && (
            <div>
              <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Ozet Karsilastirma</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={th}>Senaryo</th>
                    <th style={th}>Turf.js ops/sn</th>
                    <th style={th}>WASM ops/sn</th>
                    <th style={th}>Hiz Farki</th>
                    <th style={th}>Std Sapma Farki</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Kucuk polygon', smallRes],
                    ['Buyuk polygon', largeRes],
                  ].map(([label, res]) => {
                    const t = res.find((r) => r.name === 'Turf.js')
                    const w = res.find((r) => r.name === 'Rust WASM')
                    return (
                      <tr key={label}>
                        <td style={td}>{label}</td>
                        <td style={td}>{fmtOps(t?.ops)}</td>
                        <td style={td}>{fmtOps(w?.ops)}</td>
                        <td style={{ ...td, color: '#16a34a', fontWeight: 600 }}>{ratio(w?.ops, t?.ops)}</td>
                        <td style={td}>{ratio(t?.sd, w?.sd)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function btnStyle(active) {
  return {
    padding: '8px 16px', borderRadius: 6, border: '2px solid',
    borderColor: active ? '#3b82f6' : '#cbd5e1',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1d4ed8' : '#475569',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontSize: 14,
  }
}
