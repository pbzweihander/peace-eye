export interface Coords {
  readonly longitude?: number;
  readonly latitude?: number;
  readonly altitude?: number;
  readonly roll?: number;
  readonly pitch?: number;
  readonly yaw?: number;
  readonly u?: number;
  readonly v?: number;
  readonly heading?: number;
}

export type Tag =
  | "Air"
  | "Ground"
  | "Sea"
  | "Weapon"
  | "Sensor"
  | "Navaid"
  | "Misc"
  | "Static"
  | "Heavy"
  | "Medium"
  | "Light"
  | "Minor"
  | "FixedWing"
  | "Rotorcraft"
  | "Armor"
  | "AntiAircraft"
  | "Vehicle"
  | "Watercraft"
  | "Human"
  | "Biologic"
  | "Missile"
  | "Rocket"
  | "Bomb"
  | "Torpedo"
  | "Projectile"
  | "Beam"
  | "Decoy"
  | "Building"
  | "Bullseye"
  | "Waypoint"
  | "Tank"
  | "Warship"
  | "AircraftCarrier"
  | "Submarine"
  | "Infantry"
  | "Parachutist"
  | "Shell"
  | "Bullet"
  | "Grenade"
  | "Flare"
  | "Chaff"
  | "SmokeGrenade"
  | "Aerodrome"
  | "Container"
  | "Shrapnel"
  | "Explosion"
  | { other: string };

export function tagToString(tag: Tag): string {
  if (typeof tag === "string") {
    return tag;
  } else {
    return tag.other;
  }
}
