import proj4 from "proj4";

import { type Terrain } from "./dcs/terrain";

function toRadians(n: number): number {
  return n * (Math.PI / 180);
}

function toDegrees(n: number): number {
  return n * (180 / Math.PI);
}

export function meterToFeet(meters: number): number {
  return meters * 3.28084;
}

export function nmToMeter(nm: number): number {
  return nm * 1852;
}

export function getBearing(
  startCoords: [number, number],
  endCoords: [number, number],
  terrain: Terrain
): number {
  const [startX, startY] = toMercProj(startCoords, terrain);
  const [endX, endY] = toMercProj(endCoords, terrain);

  return (toDegrees(Math.atan2(endX - startX, endY - startY)) + 360) % 360;
}

// In nautical miles
export function getRange(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 0.539957;
}

export function getCardinal(angle: number): string {
  const degreePerDirection = 360 / 8;
  const offsetAngle = angle + degreePerDirection / 2;

  return offsetAngle >= 0 * degreePerDirection &&
    offsetAngle < 1 * degreePerDirection
    ? "N"
    : offsetAngle >= 1 * degreePerDirection &&
      offsetAngle < 2 * degreePerDirection
    ? "NE"
    : offsetAngle >= 2 * degreePerDirection &&
      offsetAngle < 3 * degreePerDirection
    ? "E"
    : offsetAngle >= 3 * degreePerDirection &&
      offsetAngle < 4 * degreePerDirection
    ? "SE"
    : offsetAngle >= 4 * degreePerDirection &&
      offsetAngle < 5 * degreePerDirection
    ? "S"
    : offsetAngle >= 5 * degreePerDirection &&
      offsetAngle < 6 * degreePerDirection
    ? "SW"
    : offsetAngle >= 6 * degreePerDirection &&
      offsetAngle < 7 * degreePerDirection
    ? "W"
    : "NW";
}

export function moveCoords(
  lat1: number,
  lon1: number,
  brng: number,
  dist: number
): [number, number] {
  const a = 6378137;
  const b = 6356752.3142;
  const f = 1 / 298.257223563; // WGS-84 ellipsiod
  const s = dist;
  const alpha1 = toRadians(brng);
  const sinAlpha1 = Math.sin(alpha1);
  const cosAlpha1 = Math.cos(alpha1);
  const tanU1 = (1 - f) * Math.tan(toRadians(lat1));
  const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
  const sinU1 = tanU1 * cosU1;
  const sigma1 = Math.atan2(tanU1, cosAlpha1);
  const sinAlpha = cosU1 * sinAlpha1;
  const cosSqAlpha = 1 - sinAlpha * sinAlpha;
  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  let sigma = s / (b * A);
  let sigmaP = 2 * Math.PI;

  let sinSigma: number = 0;
  let cosSigma: number = 0;
  let cos2SigmaM = 0;

  while (Math.abs(sigma - sigmaP) > 1e-12) {
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    cos2SigmaM = Math.cos(2 * sigma1 + sigma);

    const deltaSigma =
      B *
      sinSigma *
      (cos2SigmaM +
        (B / 4) *
          (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            (B / 6) *
              cos2SigmaM *
              (-3 + 4 * sinSigma * sinSigma) *
              (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    sigmaP = sigma;
    sigma = s / (b * A) + deltaSigma;
  }

  const tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
  const lat2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
    (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
  );
  const lambda = Math.atan2(
    sinSigma * sinAlpha1,
    cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1
  );
  const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
  const L =
    lambda -
    (1 - C) *
      f *
      sinAlpha *
      (sigma +
        C *
          sinSigma *
          (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  return [toDegrees(lat2), lon1 + toDegrees(L)];
}

function toDegreesMinutesAndSeconds(coordinate: number, size: number): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  return (
    degrees.toString().padStart(size, "0") +
    "°" +
    minutes.toString().padStart(2, "0") +
    "'" +
    seconds.toString().padStart(2, "0") +
    '"'
  );
}

function toDegreesDecimalMinutes(coordinate: number, size: number): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;

  return degrees.toString().padStart(size, "0") + "°" + minutes.toFixed(5);
}

export function formatDMS([lat, lng]: [number, number]): string {
  const latitude = toDegreesMinutesAndSeconds(lat, 2);
  const latitudeCardinal = lat >= 0 ? "N" : "S";

  const longitude = toDegreesMinutesAndSeconds(lng, 3);
  const longitudeCardinal = lng >= 0 ? "E" : "W";

  return `${latitudeCardinal}${latitude} ${longitudeCardinal}${longitude}`;
}

export function formatDDM([lat, lng]: [number, number]): string {
  const latitude = toDegreesDecimalMinutes(lat, 2);
  const latitudeCardinal = lat >= 0 ? "N" : "S";
  const longitude = toDegreesDecimalMinutes(lng, 3);
  const longitudeCardinal = lng >= 0 ? "E" : "W";
  return `${latitudeCardinal}${latitude} ${longitudeCardinal}${longitude}`;
}

export function toMercProj(
  [lat, lng]: [number, number],
  terrain: Terrain
): [number, number] {
  const projection = terrain.projection;
  // Reference: https://github.com/pydcs/dcs/blob/8fdeda106ba7e847a5d0a1ed358a1463636b513d/dcs/terrain/projections/transversemercator.py
  const fromProjection = [
    "+proj=tmerc",
    "+lat_0=0",
    `+lon_0=${projection.centralMeridian}`,
    `+k_0=${projection.scaleFactor}`,
    `+x_0=${projection.falseEasting}`,
    `+y_0=${projection.falseNorthing}`,
    "+towgs84=0,0,0,0,0,0,0",
    "+units=m",
    "+vunits=m",
    "+ellps=WGS84",
    "+no_defs",
    "+axis=neu",
  ].join(" ");
  return proj4(fromProjection, [lng, lat]);
}
