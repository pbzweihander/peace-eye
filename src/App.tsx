import { listen } from "@tauri-apps/api/event";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, type ReactElement } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ConnectView from "./ConnectView";
import MainView from "./MainView";

export default function App(): ReactElement {
  useEffect(() => {
    const unlisten = listen<string>("error", (event) => {
      toast.error(event.payload);
    });

    return () => {
      unlisten
        .then((f) => {
          f();
        })
        .catch((error) => {
          console.log(error);
        });
    };
  }, []);

  return (
    <>
      <HashRouter>
        <Routes>
          <Route path="/" element={<ConnectView />} />
          <Route path="/connected" element={<MainView />} />
        </Routes>
      </HashRouter>
      <ToastContainer />
    </>
  );
}
