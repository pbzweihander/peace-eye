export function defaultSettings(): Settings {
  return {
    view: {
      useMagneticHeading: true,
      showGround: true,
      showSlowAir: false,
      showWeapon: false,
      showCursorCoords: false,
    },
  };
}

export interface Settings {
  view: ViewSettings;
}

export interface ViewSettings {
  useMagneticHeading: boolean;
  showGround: boolean;
  showSlowAir: boolean;
  showWeapon: boolean;
  showCursorCoords: boolean;
}
