import { type ReactElement } from "react";
import { Marker } from "react-map-gl";

import { getBearing, getCardinal, getRange } from "./util";

export interface BraaInfoProps {
  start: [number, number];
  end: [number, number];
  geomagnetismModel: any;
  useMagneticHeading: boolean;
}

export default function BraaInfo(props: BraaInfoProps): ReactElement {
  const range = Math.round(getRange(props.start, props.end));
  let bearing = getBearing(props.start, props.end);
  if (props.useMagneticHeading) {
    bearing =
      bearing + (props.geomagnetismModel.point(props.end).decl as number);
  }
  bearing = Math.round((bearing + 360) % 360);
  const cardinal = getCardinal(bearing);

  return (
    <Marker latitude={props.end[0]} longitude={props.end[1]}>
      <div className="text-xl bg-slate-400 p-0.5 translate-x-full">
        {bearing.toString().padStart(3, "0")}
        {cardinal} / {range}
      </div>
    </Marker>
  );
}
