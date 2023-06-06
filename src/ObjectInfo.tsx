import * as mgrs from "mgrs";
import { useCallback, type ReactElement } from "react";
import { useMap } from "react-map-gl";

import { type Terrain } from "./dcs/terrain";
import { type ObjectSettings } from "./objectSettings";
import { type TacviewObject } from "./tacview";
import { tagToString } from "./tacview/record/objectProperty";
import {
  formatDDM,
  formatDMS,
  getBearing,
  getCardinal,
  getRange,
  meterToFeet,
} from "./util";

export interface ObjectInfoProps {
  object: TacviewObject;
  referenceLatitude: number;
  referenceLongitude: number;
  bullseyeCoords: [number, number] | undefined;
  onClose: () => void;
  objectSettings?: ObjectSettings;
  setObjectSettings?: (objectSettings: ObjectSettings) => void;
  terrain: Terrain;
  geomagnetismModel: any;
  useMagneticHeading: boolean;
}

export default function ObjectInfo(props: ObjectInfoProps): ReactElement {
  const map = useMap();

  const parseRange = useCallback((v: string): number => {
    let vv = Number(v);
    if (vv < 0) {
      vv = 0;
    }
    return vv;
  }, []);

  const {
    object,
    referenceLatitude,
    referenceLongitude,
    bullseyeCoords,
    onClose,
    objectSettings,
    setObjectSettings,
    terrain,
    geomagnetismModel,
    useMagneticHeading,
  } = props;

  const coords: [number, number] | undefined =
    object.coords?.latitude !== undefined &&
    object.coords?.longitude !== undefined
      ? [
          referenceLatitude + object.coords.latitude,
          referenceLongitude + object.coords.longitude,
        ]
      : undefined;
  const objectTypes = object.type ?? [];

  let heading = object.coords?.heading;
  if (useMagneticHeading && heading != null && coords != null) {
    heading = heading - (geomagnetismModel.point(coords).decl as number);
  }
  if (heading != null) {
    heading = Math.round((heading + 360) % 360);
  }

  let bullseyeInfo: string = "";
  if (bullseyeCoords !== undefined && coords !== undefined) {
    let bullseyeBearing = getBearing(bullseyeCoords, coords, terrain);
    if (useMagneticHeading) {
      bullseyeBearing =
        bullseyeBearing -
        (geomagnetismModel.point(bullseyeCoords).decl as number);
    }
    bullseyeBearing = Math.round((bullseyeBearing + 360) % 360);
    const bullseyeRange = Math.round(getRange(bullseyeCoords, coords));
    bullseyeInfo = `${bullseyeBearing.toString().padStart(3, "0")}${getCardinal(
      bullseyeBearing
    )} / ${bullseyeRange}`;
  }

  return (
    <div className="flex flex-col rounded-sm border border-gray-500 bg-gray-200 text-base">
      <div className="flex flex-row gap-2 bg-gray-400 p-2 text-sm">
        <b>{object.group}</b>
        <button
          className="btn-error btn-xs btn ml-auto"
          onClick={() => {
            onClose();
          }}
        >
          Close
        </button>
      </div>
      <div className="flex flex-row p-2">
        <div className="flex flex-col">
          <div>{object.name}</div>
          <div>{object.pilot}</div>
          {(object.type?.includes("Air") ?? false) && (
            <>
              <div>
                Heading:{" "}
                {heading != null &&
                  `${Math.round(heading)
                    .toString()
                    .padStart(3, "0")}${getCardinal(heading)}`}
              </div>
              <div>
                Altitude:{" "}
                {object.coords?.altitude !== undefined &&
                  Math.round(meterToFeet(object.coords.altitude))}
              </div>
              <div>
                GS:{" "}
                {object.estimatedSpeed >= 0 &&
                  Math.round(object.estimatedSpeed)}
              </div>
            </>
          )}
          {objectTypes.length > 0 && (
            <div>
              Type:{" "}
              {objectTypes.map((ty) => {
                const tagStr = tagToString(ty);
                return (
                  <span key={tagStr} className="mr-1 text-sm">
                    {tagStr}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {objectSettings !== undefined && (
          <>
            <div className="divider divider-horizontal" />
            <div className="form-control flex-grow pr-4">
              <button
                className="btn-accent btn-block btn-sm btn mb-2"
                onClick={() => {
                  if (coords !== undefined) {
                    map.current?.flyTo({
                      center: [coords[1], coords[0]],
                      duration: 1000,
                    });
                  }
                }}
              >
                Center
              </button>
              <div className="join mb-2 w-full">
                <div className="join-item flex w-12 items-center justify-center bg-warning px-2 text-xs">
                  <span>WR</span>
                </div>
                <input
                  className="input-bordered input input-xs join-item w-full"
                  type="number"
                  min="0"
                  value={objectSettings.warningRange}
                  onChange={(e) => {
                    if (setObjectSettings !== undefined) {
                      objectSettings.warningRange = parseRange(e.target.value);
                      setObjectSettings(objectSettings);
                    }
                  }}
                />
              </div>
              <div className="join w-full">
                <div className="join-item flex w-12 items-center justify-center bg-error px-2 text-xs">
                  <span>TR</span>
                </div>
                <input
                  className="input-bordered input input-xs w-full"
                  type="number"
                  min="0"
                  value={objectSettings.threatRange}
                  onChange={(e) => {
                    if (setObjectSettings !== undefined) {
                      objectSettings.threatRange = parseRange(e.target.value);
                      setObjectSettings(objectSettings);
                    }
                  }}
                />
              </div>
              <label className="label cursor-pointer">
                <span className="label-text">Watch</span>
                <input
                  className="checkbox-accent checkbox"
                  type="checkbox"
                  checked={objectSettings.watch}
                  onChange={(e) => {
                    if (setObjectSettings !== undefined) {
                      objectSettings.watch = e.target.checked;
                      setObjectSettings(objectSettings);
                    }
                  }}
                />
              </label>
            </div>
          </>
        )}
      </div>
      {coords !== undefined && (
        <div className="flex flex-col p-2">
          <div className="flex w-full flex-row">
            <span className="mr-2 flex-grow">DMS</span>
            <span className="font-mono">{formatDMS(coords)}</span>
          </div>
          <div className="flex w-full flex-row">
            <span className="mr-2 flex-grow">DDM</span>
            <span className="font-mono">{formatDDM(coords)}</span>
          </div>
          <div className="flex w-full flex-row">
            <span className="mr-2 flex-grow">MGRS</span>
            <span className="font-mono">
              {mgrs.forward([coords[1], coords[0]])}
            </span>
          </div>
          {bullseyeInfo != null && (
            <div className="flex w-full flex-row">
              <span className="mr-2 flex-grow">Bullseye</span>
              <span className="font-mono">{bullseyeInfo}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
