import { getRange } from "../../util";
import { Caucasus } from "./caucasus";
import { MarianaIslands } from "./marianaislands";
import { Nevada } from "./nevada";
import { Normandy } from "./normandy";
import { PersianGulf } from "./persiangulf";
import { Syria } from "./syria";
import { TheChannel } from "./thechannel";

export interface Terrain {
  name: string;
  center: [number, number];
  airports: Airport[];
}

export interface Airport {
  name: string;
  position: [number, number];
}

export const Terrains = [
  Caucasus,
  Nevada,
  Normandy,
  PersianGulf,
  TheChannel,
  Syria,
  MarianaIslands,
];

export function getTerrainFromReferencePoint(
  refLat: number,
  refLng: number
): Terrain | undefined {
  for (const terrain of Terrains) {
    if (getRange([refLat, refLng], terrain.center) < 500.0) {
      return terrain;
    }
  }
  return undefined;
}
