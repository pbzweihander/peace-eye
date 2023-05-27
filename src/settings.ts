export function defaultSettings(): Settings {
  return {
    view: {
      showGround: true,
      showSlowAir: false,
    },
  };
}

export interface Settings {
  view: ViewSettings;
}

export interface ViewSettings {
  showGround: boolean;
  showSlowAir: boolean;
}
