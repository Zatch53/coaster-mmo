import { useEffect } from "react";
import PixiCanvas from "./PixiCanvas";
import Palette from "./Palette";
import { connect } from "./ws";

export default function ParkPage() {
  useEffect(() => {
    connect();
  }, []);

  return (
    <div className="park-layout">
      <div className="canvas-wrap">
        <PixiCanvas />
      </div>
      <Palette />
    </div>
  );
}
