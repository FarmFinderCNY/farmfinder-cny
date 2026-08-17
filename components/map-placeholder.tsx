import type { FarmStand } from "@/lib/types";

export function MapPlaceholder({ stands }: { stands: FarmStand[] }) {
  const mapped = stands.filter((stand) => stand.latitude !== null && stand.longitude !== null);

  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="map-copy">
        <p className="eyebrow">Explore the region</p>
        <h2 id="map-title">Your next local stop is closer than you think.</h2>
        <p>
          {mapped.length > 0
            ? `${mapped.length} active ${mapped.length === 1 ? "stand is" : "stands are"} ready to plot.`
            : "Farm locations will appear here as they are added."}
        </p>
      </div>
      <div className="map-canvas" aria-label="Map integration area">
        <span className="road road-one" />
        <span className="road road-two" />
        <span className="map-pin pin-one">1</span>
        <span className="map-pin pin-two">2</span>
        <span className="map-pin pin-three">3</span>
        <div className="map-ready">Map integration ready</div>
      </div>
    </section>
  );
}
