import { useQuery } from "@tanstack/react-query";
import { API_URL } from "./api";

interface Stats {
  pieceCount: number;
  peerCount: number;
}

export default function HelpPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/stats`);
      if (!res.ok) throw new Error("failed to load stats");
      return res.json();
    },
    refetchInterval: 5000,
  });

  return (
    <div className="help-page">
      <h1>How it works</h1>
      <p>
        Everyone who visits shares the same park. Pick a piece from the palette, choose a rotation,
        color and build height, then left-click a tile to place it. Right-click removes a piece you
        placed. Drag to pan the camera and scroll to zoom.
      </p>
      <ul>
        <li>
          <strong>Track pieces</strong> (straight/curve/up/down) chain together to form coaster paths —
          the white line shows the direction the piece points.
        </li>
        <li>
          <strong>Station</strong> marks where a ride begins and ends.
        </li>
        <li>
          <strong>Standalone rides</strong> (Ferris wheel, carousel, drop tower) are single-tile
          attractions you can drop anywhere.
        </li>
        <li>Use height +/- to build elevated track or go underground.</li>
      </ul>
      <p className="stats-line">
        {isLoading ? "Loading park stats…" : `${data?.pieceCount ?? 0} pieces placed · ${data?.peerCount ?? 0} builders online right now`}
      </p>
      <p className="note">
        This is an early build: cart physics/ride simulation aren't implemented yet — right now it's a
        shared world-building sandbox for laying out track and ride placement.
      </p>
    </div>
  );
}
