import * as mgrs from "mgrs";
import { type ReactElement } from "react";

import { type Terrain } from "./dcs/terrain";
import {
  formatDDM,
  formatDMS,
  getBearing,
  getCardinal,
  getRange,
} from "./util";

export interface CursorInfoProps {
  cursorCoords: [number, number];
  bullseyeCoords: [number, number] | undefined;
  terrain: Terrain;
  geomagnetismModel: any;
  useMagneticHeading: boolean;
  showCursorCoords: boolean;
}

export default function CursorInfo(props: CursorInfoProps): ReactElement {
  let bullseyeInfo = "";
  if (props.bullseyeCoords !== undefined) {
    let bullseyeBearing = getBearing(
      props.bullseyeCoords,
      props.cursorCoords,
      props.terrain
    );
    if (props.useMagneticHeading) {
      bullseyeBearing =
        bullseyeBearing -
        (props.geomagnetismModel.point(props.bullseyeCoords).decl as number);
    }
    bullseyeBearing = Math.round((bullseyeBearing + 360) % 360);
    const bullseyeRange = Math.round(
      getRange(props.bullseyeCoords, props.cursorCoords)
    );
    bullseyeInfo = `${bullseyeBearing.toString().padStart(3, "0")}${getCardinal(
      bullseyeBearing
    )} / ${bullseyeRange}`;
  }

  if (props.showCursorCoords) {
    return (
      <div className="absolute right-0 bottom-0 flex w-[480px] flex-col bg-gray-400 bg-opacity-20 p-1 text-2xl text-yellow-600">
        <div className="flex w-full flex-row">
          <span className="mr-2 flex-grow">DMS</span>
          <span className="font-mono">{formatDMS(props.cursorCoords)}</span>
        </div>
        <div className="flex w-full flex-row">
          <span className="mr-2 flex-grow">DDM</span>
          <span className="font-mono">{formatDDM(props.cursorCoords)}</span>
        </div>
        <div className="flex w-full flex-row">
          <span className="mr-2 flex-grow">MGRS</span>
          <span className="font-mono">
            {mgrs.forward([props.cursorCoords[1], props.cursorCoords[0]])}
          </span>
        </div>
        {bullseyeInfo != null && (
          <div className="flex w-full flex-row">
            <span className="mr-2 flex-grow">Bullseye</span>
            <span className="font-mono">{bullseyeInfo}</span>
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div className="absolute right-0 bottom-0 bg-gray-400 bg-opacity-20 p-1 text-3xl text-yellow-600">
        {bullseyeInfo}
      </div>
    );
  }
}
