import type { FarmStand } from "@/lib/types";

export function FarmMap({ stands, userLocation = null }: { stands: FarmStand[]; userLocation?: { latitude: number; longitude: number } | null }) {
  const distanceInMiles = (latitude: number | null, longitude: number | null) => {
    if (!userLocation || latitude === null || longitude === null) return null;
    const toRadians = (value: number) => value * Math.PI / 180;
    const latitudeDelta = toRadians(latitude - userLocation.latitude);
    const longitudeDelta = toRadians(longitude - userLocation.longitude);
    const value = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(toRadians(userLocation.latitude)) * Math.cos(toRadians(latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };
  const mapStands = stands.map((stand) => ({
    id: stand.id,
    name: stand.name,
    location: [stand.city, stand.state].filter(Boolean).join(", ") || [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", "),
    availableItems: stand.inventory.filter((item) => item.status !== "sold_out").length,
    distanceMiles: distanceInMiles(stand.latitude, stand.longitude),
    latitude: stand.latitude,
    longitude: stand.longitude,
  }));
  const standData = JSON.stringify(mapStands).replaceAll("<", "\\u003c");
  const locationData = JSON.stringify(userLocation).replaceAll("<", "\\u003c");
  const mapDocument = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}body{font-family:system-ui,sans-serif}.leaflet-popup-content{min-width:190px;margin:17px}.leaflet-popup-content strong,.leaflet-popup-content span,.leaflet-popup-content small{display:block}.leaflet-popup-content strong{font-family:Georgia,serif;font-size:19px;color:#183d2c;margin-bottom:5px}.leaflet-popup-content span{color:#4f5d55;line-height:1.4}.leaflet-popup-content small{color:#2f674b;font-weight:700;margin-top:8px}.leaflet-popup-content a{display:inline-block;margin-top:13px;padding:8px 11px;border-radius:6px;color:white;background:#183d2c;font-size:12px;font-weight:800;text-decoration:none}.farm-pin{display:grid;place-items:center;width:30px!important;height:30px!important;border:3px solid white;border-radius:50% 50% 50% 0;background:#e96b3a;box-shadow:0 4px 12px #3458;transform:rotate(-45deg)}.user-pin{width:18px!important;height:18px!important;border:4px solid white;border-radius:50%;background:#2574d8;box-shadow:0 2px 10px #2348}</style>
</head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const stands=${standData};
const userLocation=${locationData};
const map=L.map('map',{scrollWheelZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const icon=L.divIcon({className:'farm-pin',html:'',iconSize:[36,36],iconAnchor:[18,34],popupAnchor:[0,-30]});
const points=[];
const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
stands.forEach(s=>{const point=[s.latitude,s.longitude];points.push(point);const distance=s.distanceMiles===null?'':(s.distanceMiles<10?s.distanceMiles.toFixed(1):Math.round(s.distanceMiles))+' miles away';const inventory=s.availableItems===1?'1 item available':s.availableItems+' items available';const meta=[distance,inventory].filter(Boolean).join(' · ');const content='<strong>'+safe(s.name)+'</strong><span>'+safe(s.location||'Central New York')+'</span><small>'+safe(meta)+'</small><a href="/farms/'+encodeURIComponent(s.id)+'" target="_top">View details →</a>';L.marker(point,{icon}).addTo(map).bindPopup(content);});
if(userLocation){const userPoint=[userLocation.latitude,userLocation.longitude];points.push(userPoint);const userIcon=L.divIcon({className:'user-pin',html:'',iconSize:[18,18],iconAnchor:[9,9]});L.marker(userPoint,{icon:userIcon,zIndexOffset:1000}).addTo(map).bindPopup('<strong>Your location</strong>');}
if(points.length===1)map.setView(points[0],13);else map.fitBounds(points,{padding:[45,45],maxZoom:13});
</script></body></html>`;

  return (
    <iframe
      className="leaflet-farm-map"
      title="Interactive map of active farm stands"
      srcDoc={mapDocument}
      sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation"
    />
  );
}
