export function defaultSettings(): Settings {
  return {
    view: {
      useMagneticHeading: true,
      showGround: true,
      showSlowAir: false,
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
}
