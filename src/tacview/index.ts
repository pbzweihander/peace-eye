import { type Coords, type Tag } from "./record/objectProperty";

export interface TacviewObject {
  readonly estimatedSpeed: number;
  readonly estimatedAltitudeRate: number;

  readonly coords?: Coords;
  readonly name?: string;
  readonly type?: Tag[];
  readonly callsign?: string;
  readonly pilot?: string;
  readonly squawk?: string;
  readonly group?: string;
  readonly coalition?: string;
}

export interface TacviewState {
  readonly header?: {
    readonly fileType: string;
    readonly fileVersion: string;
  };
  readonly globalProperties: {
    readonly referenceTime?: string;
    readonly author?: string;
    readonly title?: string;
    readonly comments?: string;
    readonly referenceLongitude?: number;
    readonly referenceLatitude?: number;
  };
  readonly objects: Record<number, TacviewObject>;
  readonly blueBullseye?: TacviewObject;
  readonly redBullseye?: TacviewObject;
}

export function newTacviewState(): TacviewState {
  return {
    header: undefined,
    globalProperties: {},
    objects: {},
  };
}
