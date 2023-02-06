import { type ReactElement } from "react";
import { type MapboxEvent, Marker } from "react-map-gl";

import Symbol from "./Symbol";
import { makeObjectName, objectColor, objectToSymbol } from "./entity";
import { type TacviewObject } from "./tacview";

export interface ObjectMarkerProps {
  object: TacviewObject;
  referenceLatitude: number;
  referenceLongitude: number;
  selected: boolean;
  onClick?: (evt: MapboxEvent<MouseEvent>) => void;
}

export default function ObjectMarker(props: ObjectMarkerProps): ReactElement {
  const { object, referenceLatitude, referenceLongitude, selected, onClick } =
    props;
  if (
    object.coords?.latitude === undefined ||
    object.coords?.longitude === undefined
  ) {
    return <></>;
  }

  const symbol = objectToSymbol(object);

  const symbolElement = <Symbol symbol={symbol} />;

  const isAir = object.type?.includes("Air") ?? false;
  const isFarp = object.name === "FARP";

  const altitude = ((object.coords?.altitude ?? 0) * 3.28084) / 1000;

  const color = objectColor(object);

  return (
    <>
      <Marker
        latitude={referenceLatitude + object.coords.latitude}
        longitude={referenceLongitude + object.coords.longitude}
        onClick={onClick}
        anchor="center"
      >
        {selected ? (
          <div className="p-2 rounded-full border-2 border-white">
            {symbolElement}
          </div>
        ) : (
          symbolElement
        )}
      </Marker>
      {isFarp && (
        <Marker
          latitude={referenceLatitude + object.coords.latitude}
          longitude={referenceLongitude + object.coords.longitude}
          onClick={onClick}
          anchor="bottom"
        >
          <div className="text-white mb-3">FARP</div>
        </Marker>
      )}
      {isAir && (
        <Marker
          latitude={referenceLatitude + object.coords.latitude}
          longitude={referenceLongitude + object.coords.longitude}
          onClick={onClick}
          anchor="left"
        >
          <div
            className="ml-5 text-white bg-slate-600/50 border px-0.5 rounded-sm w-fit"
            style={{ borderColor: color }}
          >
            {makeObjectName(object)}
          </div>
          <div className="ml-5">
            <span className="text-white mr-1">{altitude.toFixed(1)}</span>
            <span className="text-orange-500 mr-1">
              {Math.round(object.estimatedSpeed)}
            </span>
            <span className="text-cyan-500">
              {object.estimatedAltitudeRate.toFixed(1)}
            </span>
          </div>
        </Marker>
      )}
    </>
  );
}
