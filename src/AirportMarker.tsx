import { type ReactElement } from "react";
import { Marker } from "react-map-gl";

import Symbol from "./Symbol";
import { type Airport } from "./dcs/terrain";
import { sidcToSymbol } from "./entity";

export interface AirportMarkerProps {
  airport: Airport;
  selected: boolean;
  onClick: () => void;
}

export default function AirportMarker(props: AirportMarkerProps): ReactElement {
  const { airport, selected, onClick } = props;

  const symbol = sidcToSymbol("10012000001213010000");
  const symbolElement = <Symbol symbol={symbol} />;

  return (
    <>
      <Marker
        latitude={airport.position[0]}
        longitude={airport.position[1]}
        anchor="center"
        onClick={() => {
          onClick();
        }}
      >
        {selected ? (
          <div className="rounded-full border-2 border-white p-2">
            {symbolElement}
          </div>
        ) : (
          symbolElement
        )}
      </Marker>
      <Marker
        latitude={airport.position[0]}
        longitude={airport.position[1]}
        anchor="bottom"
        onClick={() => {
          onClick();
        }}
      >
        <div className="mb-3 text-white">{airport.name}</div>
      </Marker>
    </>
  );
}
