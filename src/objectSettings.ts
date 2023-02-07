export function defaultObjectSettings(): ObjectSettings {
  return {
    warningRange: 0,
    threatRange: 0,
    watch: false,
  };
}

export interface ObjectSettings {
  warningRange: number;
  threatRange: number;
  watch: boolean;
}

export type ObjectSettingsInventory = Record<number, ObjectSettings>;
