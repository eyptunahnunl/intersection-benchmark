use wasm_bindgen::prelude::*;
use geo::BooleanOps;

fn parse_polygon(s: &str) -> geo::Polygon<f64> {
    let gj_geom: geojson::Geometry = serde_json::from_str(s).expect("invalid GeoJSON geometry");
    let geom: geo::Geometry<f64> = geo::Geometry::try_from(&gj_geom).expect("geo conversion failed");
    match geom {
        geo::Geometry::Polygon(p) => p,
        _ => panic!("expected Polygon geometry"),
    }
}

#[wasm_bindgen]
pub fn wasm_intersection(a_str: &str, b_str: &str) -> String {
    let a = parse_polygon(a_str);
    let b = parse_polygon(b_str);
    let result: geo::MultiPolygon<f64> = a.intersection(&b);
    let geom: geo::Geometry<f64> = result.into();
    let gj_geom = geojson::Geometry::try_from(&geom).expect("geojson conversion failed");
    serde_json::to_string(&gj_geom).unwrap()
}
