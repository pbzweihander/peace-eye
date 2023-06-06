import classNames from "classnames";
import { useState, type ReactElement } from "react";

import { useCurrentVersion } from "./hook";
import { type Settings } from "./settings";

export interface SettingsModalProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  onDisconnect: (() => void) | (() => Promise<void>);
}

export default function SettingsModal(props: SettingsModalProps): ReactElement {
  const [selectedTab, setSelectedTab] = useState("view");

  const currentVersion = useCurrentVersion();

  const { settings, setSettings, onDisconnect } = props;

  return (
    <>
      <dialog id="settingsModal" className="modal">
        <form
          method="dialog"
          className="modal-box border border-gray-500 bg-gray-200"
        >
          <div className="mb-2 flex w-full flex-row px-2">
            <span className="text-xl">Settings</span>
            <div className="ml-auto">
              <button className="btn-sm btn">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="tabs">
            <a
              className={classNames(
                "tab-bordered tab",
                selectedTab === "view" && "tab-active"
              )}
              onClick={() => {
                setSelectedTab("view");
              }}
            >
              View
            </a>
            <a
              className={classNames(
                "tab-bordered tab",
                selectedTab === "connection" && "tab-active"
              )}
              onClick={() => {
                setSelectedTab("connection");
              }}
            >
              Connection
            </a>
            <a
              className={classNames(
                "tab-bordered tab",
                selectedTab === "about" && "tab-active"
              )}
              onClick={() => {
                setSelectedTab("about");
              }}
            >
              About
            </a>
          </div>
          <div className="px-2 pb-2 pt-4">
            {selectedTab === "view" && (
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Use magnetic heading</span>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={settings.view.useMagneticHeading}
                    onChange={(e) => {
                      settings.view.useMagneticHeading = e.target.checked;
                      setSettings(settings);
                    }}
                  />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text">Show ground objects</span>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={settings.view.showGround}
                    onChange={(e) => {
                      settings.view.showGround = e.target.checked;
                      setSettings(settings);
                    }}
                  />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text">
                    Show air objects slower than 25 knots
                  </span>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={settings.view.showSlowAir}
                    onChange={(e) => {
                      settings.view.showSlowAir = e.target.checked;
                      setSettings(settings);
                    }}
                  />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text">Show weapon objects</span>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={settings.view.showWeapon}
                    onChange={(e) => {
                      settings.view.showWeapon = e.target.checked;
                      setSettings(settings);
                    }}
                  />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text">Show cursor coordinates</span>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={settings.view.showCursorCoords}
                    onChange={(e) => {
                      settings.view.showCursorCoords = e.target.checked;
                      setSettings(settings);
                    }}
                  />
                </label>
              </div>
            )}
            {selectedTab === "connection" && (
              <div>
                <button
                  className="btn-error btn"
                  onClick={async () => {
                    await onDisconnect();
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
            {selectedTab === "about" && (
              <div>
                <span className="font-mono text-lg">
                  peace-eye v{currentVersion}
                </span>
                <br />
                Created by pbzweihander
                <br />
                Contact: pbzweihander@gmail.com
                <br />
                <a
                  className="link-primary link"
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/pbzweihander/peace-eye"
                >
                  https://github.com/pbzweihander/peace-eye
                </a>
                <br />
                Distributed under the terms of MIT license
              </div>
            )}
          </div>
        </form>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>
    </>
  );
}
