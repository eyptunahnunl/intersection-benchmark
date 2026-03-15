# Turf.js vs Rust WASM — Polygon Intersection Benchmark

Bu proje, **gercek dunya web uygulamasi kosullarinda** Turf.js ile Rust tabanli WebAssembly (WASM) arasindaki polygon intersection performansini karsilastirmaktadir. Odak noktasi saf algoritma hizi degil; bir web uygulamasinda her iki kutuphanenin **uçtan uca** (veri hazirlamadan sonuc almaya kadar) ne kadar sure aldigidir.

---

## Sonuclar

### Kucuk Polygon (~20 vertex)

![Kucuk Polygon Benchmark Sonucu](assets/small-polygon-result.png)

| Metrik         | Turf.js    | Rust WASM  | Fark    |
|----------------|------------|------------|---------|
| ops/saniye     | 2,442      | 30,811     | 12.62x  |
| Ortalama (ms)  | 418.36     | 26.24      | 15.95x  |
| Min (ms)       | 300.00     | 0.00       | —       |
| Max (ms)       | 600.00     | 200.00     | 3.00x   |
| Std Sapma (ms) | 59.65      | 44.71      | 1.33x   |
| P75 (ms)       | 500.00     | 100.00     | 5.00x   |
| P99 (ms)       | 500.00     | 100.00     | 5.00x   |

**Sonuc:** Kucuk polygonlarda Rust WASM, Turf.js'ten ~12.6x daha hizli.

---

### Buyuk Polygon (~1000 vertex)

![Buyuk Polygon Benchmark Sonucu](assets/large-polygon-result.png)

| Metrik         | Turf.js       | Rust WASM    | Fark    |
|----------------|---------------|--------------|---------|
| ops/saniye     | 5             | 196          | 38.39x  |
| Ortalama (ms)  | 195,805.00    | 5,098.98     | 38.40x  |
| Min (ms)       | 188,600.00    | 4,900.00     | 38.49x  |
| Max (ms)       | 231,600.00    | 5,700.00     | 40.63x  |
| Std Sapma (ms) | 6,164.57      | 137.02       | 44.99x  |
| P75 (ms)       | 197,250.00    | 5,200.00     | 37.93x  |
| P99 (ms)       | 211,602.00    | 5,408.00     | 39.13x  |

**Sonuc:** Buyuk ve karmasik polygonlarda Rust WASM, Turf.js'ten ~38.4x daha hizli.

---

## Ozet Karsilastirma

| Senaryo        | Turf.js ops/sn | WASM ops/sn | Hiz Farki | Std Sapma Farki |
|----------------|----------------|-------------|-----------|-----------------|
| Kucuk polygon  | 2,442          | 30,811      | **12.62x**| 1.33x           |
| Buyuk polygon  | 5              | 196         | **38.39x**| 44.99x          |

Polygon karmasikligi arttikca WASM'in avantaji dramatik bicimde buyumektedir. Ayrica WASM buyuk polygon testinde cok daha tutarli sonuclar vermektedir (std sapma 44.99x daha dusuk).

---

## Metrik Aciklamalari

| Metrik           | Aciklama |
|------------------|----------|
| **ops/saniye**   | Saniyede kac intersection islemi tamamlanabildigini gosterir. Ne kadar yuksekse o kadar iyi. |
| **Ortalama (ms)**| Tek bir intersection isleminin ortalama suresi. Ne kadar dusukse o kadar iyi. |
| **Min (ms)**     | En hizli olculen iterasyon suresi. Teorik en iyi performansi temsil eder. |
| **Max (ms)**     | En yavas olculen iterasyon suresi. En kotu durumu gosterir (GC pause, cache miss vb.). |
| **Std Sapma (ms)**| Surelerin ne kadar degisken oldugunu olcer. Dusuk deger = tutarli ve tahmin edilebilir performans. |
| **P75 (ms)**     | Iterasyonlarin %75'i bu sureden hizliydi. Tipik performansi temsil eder. |
| **P99 (ms)**     | Iterasyonlarin %99'u bu sureden hizliydi. En kotu senaryolarin neredeyse tamaminini kapsar (tail latency). |

---

## Proje Yapisi

```
turf-vs-wasm/
└── intersection-benchmark/
    ├── src/
    │   ├── App.jsx            # UI ve benchmark orkestrasyon
    │   ├── benchmark.js       # TinyBench ile olcum mantigi
    │   └── MapView.jsx        # MapLibre harita gorunumu
    ├── scripts/
    │   └── generate-data.js   # GeoJSON test verisi uretici
    ├── public/
    │   ├── small-a.geojson    # ~20 vertex polygon
    │   ├── small-b.geojson
    │   ├── large-a.geojson    # ~1000 vertex polygon
    │   └── large-b.geojson
    └── geo-wasm/
        ├── src/lib.rs         # Rust WASM intersection implementasyonu
        └── pkg/               # Derlenmi WASM binary ve JS bindings
```

---

## Benchmark Metodolojisi

- **Araci**: [TinyBench](https://github.com/tinylibs/tinybench)
- **Iterasyon**: Kucuk senaryo icin 500, buyuk senaryo icin 100
- **Warmup**: TinyBench varsayilan warmup (16 iterasyon, 250ms)
- **Veri**: Istanbul merkezi etrafinda seed'li random polygon (seed 42 ve 99 — tekrarlanabilir)
- **Algoritma**: Her iki tarafta da Martinez-Rueda ailesi (Turf: polyclip-ts, WASM: geo crate BooleanOps)

### Ne Olculuyor?

Bu benchmark **gercek dunya kullanimi** senaryosunu olcer:

- **Turf.js tarafinda**: Onceden parse edilmis JavaScript objeleri uzerinde intersection hesaplama
- **WASM tarafinda**: JSON string alma → JSON parse → GeoJSON tip donusumu → intersection hesaplama → sonucu JSON string'e serializasyon

Yani WASM, JS/WASM sinirini gecmek icin gereken serialization/deserialization maliyetini de tasimaktadir. Bu, pratikte bir web uygulamasinda WASM'i nasil kullanacaginizin gercekci bir yansimasi. **Saf algoritma hizi** olculmemektedir.

---

## Tarafsizlik Notu

Benchmark kabaca adil olmakla birlikte birkac asimetri mevcuttur:

| Durum | Etki |
|-------|------|
| WASM her iterasyonda JSON parse + GeoJSON tip donusumu yapiyor, Turf dogrudan JS objesi kullaniyor | **WASM aleyhine** |
| WASM sonucu JSON string'e serializasyon yapiyor, Turf dogrudan JS objesi donduruyor | **WASM aleyhine** |
| Turf her iterasyonda `featureCollection([a,b])` ile yeni bir obje olusturuyor | **Turf aleyhine** (minimal) |
| Turf her zaman ilk calistirildiginda JIT henuz isiniyor, WASM ikinci calistiginda CPU cache daha sicak | **Belirsiz** |
| Turf JS obje allocations yuzunden GC tetiklenebilir, WASM linear memory'de calisir | **Turf aleyhine** (belirsiz) |

**Genel degerlendirme:** WASM, serialization/deserialization maliyetini de ustlenerek bu sonuclari uretmektedir. Saf intersection hesaplamasi olculuyor olsaydi WASM farki cok daha buyuk olurdu.

---

## Gelistirme

```bash
cd intersection-benchmark
npm install
npm run dev
```

Test verisini yeniden uretmek icin:

```bash
npm run generate
```

WASM'i yeniden derlemek icin (`wasm-pack` gerekli):

```bash
cd geo-wasm
wasm-pack build --target web --release
```
