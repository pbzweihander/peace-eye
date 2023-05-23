import * as ms from "milsymbol";

import { AircraftToSidcIcon } from "./dcs/aircraft";
import { type Settings } from "./settings";
import { type TacviewObject } from "./tacview";

export const colorMode: ms.ColorMode = ms.ColorMode(
  "#ffffff",
  "#17c2f6",
  "#ff8080",
  "#FDE68A",
  "#ffffff"
);
const symbolCache: Record<string, ms.Symbol> = {};

export function filterObject(
  object: TacviewObject,
  settings: Settings
): boolean {
  const types = object.type ?? [];
  if (types.length === 0) {
    return false;
  }
  if (
    !settings.view.showGround &&
    types.includes("Ground") &&
    object.name !== "FARP"
  ) {
    return false;
  }
  if (types.includes("Parachutist")) {
    return false;
  }
  if (types.includes("Misc")) {
    return false;
  }
  if (types.includes("Projectile")) {
    return false;
  }
  if (types.includes("Weapon")) {
    return false;
  }
  if (types.includes("Air") && object.estimatedSpeed < 25) {
    return false;
  }
  return true;
}

export function objectColor(object: TacviewObject): string {
  if (object.coalition === undefined) {
    return colorMode.Neutral;
  } else if (object.coalition === "Enemies") {
    return colorMode.Friend;
  } else if (object.coalition === "Allies") {
    return colorMode.Hostile;
  } else {
    return colorMode.Unknown;
  }
}

export function sidcToSymbol(sidc: string): ms.Symbol {
  if (symbolCache[sidc] != null) {
    return symbolCache[sidc];
  } else {
    const symbol = new ms.Symbol(sidc, {
      size: 16,
      frame: true,
      fill: false,
      colorMode,
      strokeWidth: 8,
      infoSize: 100,
    });
    symbolCache[sidc] = symbol;

    return symbol;
  }
}

export function objectToSymbol(object: TacviewObject): ms.Symbol {
  const sidc = getSidc(object);
  return sidcToSymbol(sidc);
}

// Reference: https://sidc.milsymb.net/
function getSidc(object: TacviewObject): string {
  let ident = "4";
  if (object.coalition === "Allies") {
    ident = "6";
  } else if (object.coalition === "Enemies") {
    ident = "3";
  }

  const types = object.type ?? [];

  if (types.includes("Bullseye")) {
    return `100${ident}2500002102000000`;
  }

  let set = "25";
  if (types.includes("Air")) {
    set = "01";
  } else if (types.includes("Ground")) {
    if (types.includes("Static")) {
      set = "20";
    } else {
      set = "10";
    }
  } else if (types.includes("Sea")) {
    set = "30";
  }

  let icon = "0000000000";
  if (object.name !== undefined) {
    if (AircraftToSidcIcon[object.name] !== undefined) {
      icon = AircraftToSidcIcon[object.name];
    } else if (object.name === "FARP") {
      icon = "1120000000";
    }
  }
  if (icon === "0000000000") {
    let mainIcon = "000000";
    let modifier = "0000";
    if (types.includes("AntiAircraft")) {
      mainIcon = "1301000000";
    }
    if (mainIcon === "000000" && types.includes("Infantry")) {
      mainIcon = "121100";
    }
    if (types.includes("Tank")) {
      mainIcon = "120500";
    } else if (types.includes("Vehicle")) {
      modifier = "0051";
    }
    if (types.includes("Warship")) {
      mainIcon = "120000";
    }
    if (types.includes("AircraftCarrier")) {
      mainIcon = "120100";
    }
    icon = `${mainIcon}${modifier}`;
  }

  return `100${ident}${set}0000${icon}`;
}

export function makeObjectName(object: TacviewObject): string {
  let name = object.name ?? "";
  if (
    object.pilot != null &&
    (object.group == null || !object.pilot.startsWith(object.group))
  ) {
    name = `${object.pilot} (${name})`;
  }
  return name;
}
