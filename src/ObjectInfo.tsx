import * as mgrs from "mgrs";
import { useCallback, type ReactElement } from "react";
import { useMap } from "react-map-gl";

import { type ObjectSettings } from "./objectSettings";
import { type TacviewObject } from "./tacview";
import { tagToString } from "./tacview/record/objectProperty";
import { formatDDM, formatDMS, getCardinal, meterToFeet } from "./util";

export interface ObjectInfoProps {
  object: TacviewObject;
  referenceLatitude: number;
  referenceLongitude: number;
  onClose: () => void;
  objectSettings?: ObjectSettings;
  setObjectSettings?: (objectSettings: ObjectSettings) => void;
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
    onClose,
    objectSettings,
    setObjectSettings,
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

  return (
    <div className="flex flex-col bg-gray-200 border border-gray-500 rounded-sm text-base">
      <div className="p-2 bg-gray-400 text-sm flex flex-row gap-2">
        <b>{object.group}</b>
        <button
          className="btn btn-xs btn-error ml-auto"
          onClick={() => {
            onClose();
          }}
        >
          Close
        </button>
      </div>
      <div className="p-2 flex flex-row">
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
            <div className="flex-grow pr-4">
              <button
                className="btn btn-block btn-sm btn-accent mb-2"
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
              <label className="input-group input-group-xs w-full mb-2">
                <span className="w-12 bg-warning">WR</span>
                <input
                  className="input input-xs input-bordered w-full"
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
              </label>
              <label className="input-group input-group-xs w-full mb-2">
                <span className="w-12 bg-error">TR</span>
                <input
                  className="input input-xs input-bordered w-full"
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
              </label>
              <label className="input-group input-group-xs w-fit">
                <span className="bg-secondary cursor-pointer">Watch</span>
                <input
                  className="checkbox"
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
        <div className="p-2 flex flex-col">
          <div className="flex flex-row w-full">
            <span className="mr-2 flex-grow">DMS</span>
            <span className="font-mono">{formatDMS(coords)}</span>
          </div>
          <div className="flex flex-row w-full">
            <span className="mr-2 flex-grow">DDM</span>
            <span className="font-mono">{formatDDM(coords)}</span>
          </div>
          <div className="flex flex-row w-full">
            <span className="mr-2 flex-grow">MGRS</span>
            <span className="font-mono">
              {mgrs.forward([coords[1], coords[0]])}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
