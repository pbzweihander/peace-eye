import classNames from "classnames";
import { useState, type ReactElement } from "react";

export interface SettingsModalProps {
  onDisconnect: (() => void) | (() => Promise<void>);
}

export default function SettingsModal(props: SettingsModalProps): ReactElement {
  const [selectedTab, setSelectedTab] = useState("connection");

  return (
    <>
      <input type="checkbox" id="setting-modal" className="modal-toggle" />
      <div className="modal">
        <div className="modal-box bg-gray-200 border border-gray-500">
          <div className="flex flex-row w-full mb-2 px-2">
            <span className="text-xl">Settings</span>
            <div className="ml-auto">
              <label htmlFor="setting-modal" className="btn btn-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </label>
            </div>
          </div>
          <div className="tabs">
            <a
              className={classNames(
                "tab tab-bordered",
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
                "tab tab-bordered",
                selectedTab === "about" && "tab-active"
              )}
              onClick={() => {
                setSelectedTab("about");
              }}
            >
              About
            </a>
          </div>
          <div className="p-2">
            {selectedTab === "connection" && (
              <div>
                <button
                  className="btn btn-error"
                  onClick={async () => {
                    await props.onDisconnect();
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
            {selectedTab === "about" && (
              <div>
                peace-eye
                <br />
                Created by pbzweihander
                <br />
                Contact: pbzweihander@gmail.com
                <br />
                <a
                  className="link link-primary"
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
        </div>
      </div>
    </>
  );
}
