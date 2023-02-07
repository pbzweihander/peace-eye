export function defaultSettings(): Settings {
  return {
    view: {
      showGround: true,
    },
  };
}

export interface Settings {
  view: ViewSettings;
}

export interface ViewSettings {
  showGround: boolean;
}
