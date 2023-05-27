import classNames from "classnames";
import { useState, type ReactElement } from "react";

import Symbol from "./Symbol";
import { makeObjectName, objectToSymbol } from "./entity";
import { type TacviewObject } from "./tacview";

export interface ControlPanelProps {
  objects: Array<[number, TacviewObject]>;
  watchingObjects: Array<[number, TacviewObject]>;
  onObjectClick: (id: number) => void;
}

export default function ControlPanel(props: ControlPanelProps): ReactElement {
  const [selectedTab, setSelectedTab] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { objects, watchingObjects, onObjectClick } = props;

  return (
    <div className="bg-gray-200">
      <div className="flex flex-row gap-2 rounded-sm bg-gray-300 p-2">
        <div>
          <button
            className={classNames(
              "btn-xs btn",
              selectedTab !== "search" && "btn-outline"
            )}
            onClick={() => {
              setSelectedTab((selectedTab) => {
                if (selectedTab === "search") {
                  return undefined;
                } else {
                  return "search";
                }
              });
            }}
          >
            Search
          </button>
        </div>
        <div>
          <button
            className={classNames(
              "btn-xs btn",
              selectedTab !== "watches" && "btn-outline"
            )}
            onClick={() => {
              setSelectedTab((selectedTab) => {
                if (selectedTab === "watches") {
                  return undefined;
                } else {
                  return "watches";
                }
              });
            }}
          >
            Watches
          </button>
        </div>
        <div className="ml-auto">
          <label className="btn-accent btn-xs btn" htmlFor="setting-modal">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </label>
        </div>
      </div>
      {selectedTab === "search" && (
        <>
          <div className="p-2">
            <input
              className="input-bordered input input-sm w-full"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>
          {search !== "" && (
            <div className="max-h-96 overflow-y-scroll">
              <ul className="menu">
                {objects
                  .filter(([_id, object]) =>
                    makeObjectName(object).toLowerCase().includes(search)
                  )
                  .map(([id, object]) => (
                    <li key={id}>
                      <a
                        onClick={() => {
                          onObjectClick(id);
                        }}
                      >
                        <Symbol symbol={objectToSymbol(object)} />
                        {makeObjectName(object)}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}
      {selectedTab === "watches" && (
        <div className="max-h-96 overflow-y-scroll">
          <ul className="menu">
            {watchingObjects.length === 0 ? (
              <li>
                <a>Empty</a>
              </li>
            ) : (
              watchingObjects.map(([id, object]) => (
                <li key={id}>
                  <a
                    onClick={() => {
                      onObjectClick(id);
                    }}
                  >
                    <Symbol symbol={objectToSymbol(object)} />
                    {makeObjectName(object)}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
