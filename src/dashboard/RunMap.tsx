import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RunPoint } from '../data/run';

/*
 * A run's route on a street map (OpenStreetMap tiles through Leaflet): the line, a ring
 * where it starts and a dot where it ends. The map is made once; a new route replaces the
 * line and the view moves to fit it.
 */
export default function RunMap({ route, label }: { route: RunPoint[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    // The map is laid out once its box has a size.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const accent = getComputedStyle(box.current!).getPropertyValue('--run-line').trim() || '#3048e8';
    // A white casing under the line keeps it readable over busy streets.
    L.polyline(route, { color: '#ffffff', weight: 7, opacity: 0.9, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(g);
    L.polyline(route, { color: accent, weight: 4, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(g);
    L.circleMarker(route[0], { radius: 6, color: accent, weight: 3, fillColor: '#ffffff', fillOpacity: 1 }).bindTooltip('Mulai').addTo(g);
    L.circleMarker(route[route.length - 1], { radius: 6, color: '#ffffff', weight: 2, fillColor: accent, fillOpacity: 1 }).bindTooltip('Selesai').addTo(g);
    m.fitBounds(L.latLngBounds(route), { padding: [28, 28] });
  }, [route]);

  return <div ref={box} className="rn-map" role="application" aria-label={label} />;
}
