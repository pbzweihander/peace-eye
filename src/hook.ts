import { invoke } from "@tauri-apps/api";
import { useMemo, useState } from "react";

export function useCurrentVersion(): string {
  const [currentVersion, setCurrentVersion] = useState("-.-.-");

  useMemo(() => {
    invoke<string>("get_current_version")
      .then((version) => {
        setCurrentVersion(version);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return currentVersion;
}
