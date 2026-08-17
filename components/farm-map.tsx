import type { FarmStand } from "@/lib/types";

export function FarmMap({ stands }: { stands: FarmStand[] }) {
  const mapStands = stands.map((stand) => ({
    name: stand.name,
    address: [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", "),
    hours: stand.hours,
    latitude: stand.latitude,
    longitude: stand.longitude,
  }));
  const standData = JSON.stringify(mapStands).replaceAll("<", "\\u003c");
  const mapDocument = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}body{font-family:system-ui,sans-serif}.leaflet-popup-content strong,.leaflet-popup-content span,.leaflet-popup-content small{display:block}.leaflet-popup-content strong{font-family:Georgia,serif;font-size:19px;color:#183d2c;margin-bottom:5px}.leaflet-popup-content span{color:#4f5d55;line-height:1.4}.leaflet-popup-content small{color:#2f674b;font-weight:700;margin-top:8px}.farm-pin{display:grid;place-items:center;width:30px!important;height:30px!important;border:3px solid white;border-radius:50% 50% 50% 0;background:#e96b3a;box-shadow:0 4px 12px #3458;transform:rotate(-45deg)}</style>
</head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const stands=${standData};
const map=L.map('map',{scrollWheelZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const icon=L.divIcon({className:'farm-pin',html:'',iconSize:[36,36],iconAnchor:[18,34],popupAnchor:[0,-30]});
const points=[];
const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
stands.forEach(s=>{const point=[s.latitude,s.longitude];points.push(point);const content='<strong>'+safe(s.name)+'</strong><span>'+safe(s.address)+'</span>'+(s.hours?'<small>'+safe(s.hours)+'</small>':'');L.marker(point,{icon}).addTo(map).bindPopup(content);});
if(points.length===1)map.setView(points[0],13);else map.fitBounds(points,{padding:[45,45],maxZoom:13});
</script></body></html>`;

  return (
    <iframe
      className="leaflet-farm-map"
      title="Interactive map of active farm stands"
      srcDoc={mapDocument}
      sandbox="allow-scripts allow-popups"
    />
  );
}
