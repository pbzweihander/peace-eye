import { type ReactElement } from "react";
import { Marker } from "react-map-gl";

import Symbol from "./Symbol";
import { type Airport } from "./dcs/terrain";
import { sidcToSymbol } from "./entity";

export interface AirportMarkerProps {
  airport: Airport;
}

export default function AirportMarker(props: AirportMarkerProps): ReactElement {
  const { airport } = props;

  const symbol = sidcToSymbol("10012000001213010000");

  return (
    <>
      <Marker
        latitude={airport.position[0]}
        longitude={airport.position[1]}
        anchor="center"
      >
        <Symbol symbol={symbol} />
      </Marker>
      <Marker
        latitude={airport.position[0]}
        longitude={airport.position[1]}
        anchor="bottom"
      >
        <div className="text-white mb-3">{airport.name}</div>
      </Marker>
    </>
  );
}
