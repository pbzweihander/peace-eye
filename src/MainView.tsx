import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import circle from "@turf/circle";
import { type Feature, type FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import Map, { AttributionControl, Layer, Source } from "react-map-gl";
import { useNavigate } from "react-router-dom";

import AirportMarker from "./AirportMarker";
import BraaInfo from "./BraaInfo";
import ControlPanel from "./ControlPanel";
import ObjectInfo from "./ObjectInfo";
import ObjectMarker from "./ObjectMarker";
import SettingsModal from "./SettingsModal";
import Spinner from "./Spinner";
import { getTerrainFromReferencePoint } from "./dcs/terrain";
import { colorMode, filterObject } from "./entity";
import {
  defaultObjectSettings,
  type ObjectSettings,
  type ObjectSettingsInventory,
} from "./objectSettings";
import { defaultSettings } from "./settings";
import {
  type TacviewState,
  newTacviewState,
  type TacviewObject,
} from "./tacview";
import {
  getBearing,
  getCardinal,
  getRange,
  moveCoords,
  nmToMeter,
} from "./util";

export default function MainView(): ReactElement {
  const navigate = useNavigate();
  const [state, setState] = useState(newTacviewState());
  const [settings, setSettings] = useState(defaultSettings());
  const [objectSettingsInventory, setObjectSettingsInventory] =
    useState<ObjectSettingsInventory>({});
  const [cursorCoords, setCursorCoords] = useState<[number, number]>([0, 0]);
  const [selectedObjectId, setSelectedObjectId] = useState<number | undefined>(
    undefined
  );
  const [rulerStartCoords, setRulerStartCoords] = useState<
    [number, number] | undefined
  >(undefined);

  const onDisconnect = useCallback(async () => {
    setState(newTacviewState());
    await invoke("disconnect");
    navigate("/");
  }, []);

  // Spawn tacview-state event listener
  useEffect(() => {
    const unlisten = listen<TacviewState>("tacview-state", (event) => {
      setState(event.payload);
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

  const referenceLatitude = state.globalProperties.referenceLatitude;
  const referenceLongitude = state.globalProperties.referenceLongitude;

  // TODO: Config coalition for bullseye
  const ownedBullseye = state.blueBullseye;
  // Calculate bullseye info of cursor
  const cursorBulls = useMemo<[number, number] | undefined>(() => {
    if (
      referenceLatitude === undefined ||
      referenceLongitude === undefined ||
      ownedBullseye?.coords?.latitude === undefined ||
      ownedBullseye?.coords?.longitude === undefined
    ) {
      return undefined;
    }

    const bullseyeCoords: [number, number] = [
      referenceLatitude + ownedBullseye.coords.latitude,
      referenceLongitude + ownedBullseye.coords.longitude,
    ];
    const bearing = Math.round(getBearing(bullseyeCoords, cursorCoords));
    const range = Math.round(getRange(bullseyeCoords, cursorCoords));

    return [bearing, range];
  }, [cursorCoords, state.blueBullseye, state.redBullseye]);

  // Populate GeoJson data for ruler
  const rulerGeoJson: FeatureCollection = useMemo(() => {
    if (rulerStartCoords === undefined) {
      return {
        type: "FeatureCollection",
        features: [],
      };
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: [],
          geometry: {
            type: "LineString",
            coordinates: [
              [rulerStartCoords[1], rulerStartCoords[0]],
              [cursorCoords[1], cursorCoords[0]],
            ],
          },
        },
      ],
    };
  }, [rulerStartCoords, cursorCoords]);

  // Populate GeoJson for track vector line
  const trackVectorLineGeoJson: FeatureCollection = useMemo(() => {
    if (referenceLatitude === undefined || referenceLongitude === undefined) {
      return {
        type: "FeatureCollection",
        features: [],
      };
    }

    return {
      type: "FeatureCollection",
      features: Object.values(state.objects)
        .filter(
          (object) =>
            object.type?.includes("Air") === true &&
            object.coords?.latitude !== undefined &&
            object.coords?.longitude !== undefined &&
            object.coords?.heading !== undefined
        )
        .map((object) => {
          const endCoords = moveCoords(
            referenceLatitude + object.coords!.latitude!,
            referenceLongitude + object.coords!.longitude!,
            object.coords!.heading!,
            // knot -> meter per second -> 1 minute
            object.estimatedSpeed * 0.514444 * 60
          );
          return {
            type: "Feature",
            properties: {
              coalition: object.coalition,
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [
                  referenceLongitude + object.coords!.longitude!,
                  referenceLatitude + object.coords!.latitude!,
                ],
                [endCoords[1], endCoords[0]],
              ],
            },
          };
        }),
    };
  }, [state.objects]);

  // Populate GeoJson data for warning/threat range
  // Note that because of limitation of map-gl, this is actually group of lines instead of a circle
  const rangeGeoJson: FeatureCollection = useMemo((): FeatureCollection => {
    if (referenceLatitude === undefined || referenceLongitude === undefined) {
      return {
        type: "FeatureCollection",
        features: [],
      };
    }

    return {
      type: "FeatureCollection",
      features: Object.entries(objectSettingsInventory)
        .map(([id, objectSettings]): [ObjectSettings, TacviewObject] => {
          const object = state.objects[Number(id)];
          return [objectSettings, object];
        })
        .filter(
          ([_objectSettings, object]) =>
            object?.coords?.latitude !== undefined &&
            object?.coords?.longitude !== undefined
        )
        .map(([objectSettings, object]): Feature[] => {
          const coords = [
            referenceLongitude + object.coords!.longitude!,
            referenceLatitude + object.coords!.latitude!,
          ];
          const ret: Feature[] = [];

          if (objectSettings.warningRange > 0) {
            ret.push(
              circle(coords, nmToMeter(objectSettings.warningRange) / 1000.0, {
                steps: 50,
                units: "kilometers",
                properties: { type: "warning" },
              })
            );
          }
          if (objectSettings.threatRange > 0) {
            ret.push(
              circle(coords, nmToMeter(objectSettings.threatRange) / 1000.0, {
                steps: 50,
                units: "kilometers",
                properties: { type: "threat" },
              })
            );
          }

          return ret;
        })
        .flat(),
    };
  }, [state.objects, objectSettingsInventory]);

  const watchingObjects = useMemo(() => {
    return Object.entries(objectSettingsInventory)
      .map(
        ([id, objectSettingsInventory]): [
          number,
          TacviewObject | undefined
        ] => {
          const nid = Number(id);
          if (objectSettingsInventory.watch) {
            return [nid, state.objects[nid]];
          } else {
            return [nid, undefined];
          }
        }
      )
      .filter(([_id, object]) => object !== undefined)
      .map(([id, object]): [number, TacviewObject] => [id, object!]);
  }, [state.objects, objectSettingsInventory]);

  if (referenceLatitude === undefined || referenceLongitude === undefined) {
    // Display loading screen
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="mb-3">
          <Spinner />
        </div>
        <div>
          <button
            className="btn btn-sm btn-warning"
            onClick={async () => {
              await onDisconnect();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const terrain = getTerrainFromReferencePoint(
    referenceLatitude,
    referenceLongitude
  );

  if (terrain === undefined) {
    // Display error screen
    return (
      <div className="h-full flex flex-col items-center justify-center">
        Cannot find terrain from reference point ({referenceLatitude},{" "}
        {referenceLongitude}).
        <br />
        This is a bug. <br />
        Please contact to pbzweihander@gmail.com
      </div>
    );
  }

  const initalViewState = {
    latitude: terrain.center[0],
    longitude: terrain.center[1],
    zoom: 6,
  };

  return (
    <>
      <Map
        mapLib={maplibregl}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
        style={{ width: "100vw", height: "100vh" }}
        initialViewState={initalViewState}
        doubleClickZoom={false}
        dragRotate={false}
        keyboard={false}
        attributionControl={false}
        onMouseMove={(e) => {
          setCursorCoords([e.lngLat.lat, e.lngLat.lng]);
        }}
        onMouseDown={(e) => {
          if (e.originalEvent.button === 2) {
            e.preventDefault();
            setRulerStartCoords([e.lngLat.lat, e.lngLat.lng]);
          }
        }}
        onMouseUp={(e) => {
          if (e.originalEvent.button === 2) {
            e.preventDefault();
            setRulerStartCoords(undefined);
          }
        }}
      >
        <AttributionControl position="bottom-left" />
        <div className="m-2 absolute left-0 top-0">
          {selectedObjectId !== undefined &&
            state.objects[selectedObjectId] !== undefined && (
              <ObjectInfo
                object={state.objects[selectedObjectId]}
                referenceLatitude={referenceLatitude}
                referenceLongitude={referenceLongitude}
                onClose={() => {
                  setSelectedObjectId(undefined);
                }}
                objectSettings={
                  objectSettingsInventory[selectedObjectId] ??
                  defaultObjectSettings()
                }
                setObjectSettings={(objectSettings) => {
                  setObjectSettingsInventory((objectSettingsInventory) => {
                    objectSettingsInventory[selectedObjectId] = objectSettings;
                    return { ...objectSettingsInventory };
                  });
                }}
              />
            )}
        </div>
        <div className="m-2 absolute right-0 top-0">
          <ControlPanel
            objects={Object.entries(state.objects).map(([id, object]) => [
              Number(id),
              object,
            ])}
            watchingObjects={watchingObjects}
            onObjectClick={(id) => {
              setSelectedObjectId(id);
            }}
          />
        </div>
        {cursorBulls !== undefined && (
          <div className="absolute right-0 bottom-0 max-w-xl max-h-32 text-yellow-600 text-3xl bg-gray-400 bg-opacity-20 p-1">
            {`${cursorBulls[0].toString().padStart(3, "0")}${getCardinal(
              cursorBulls[0]
            )} / ${cursorBulls[1]}`}
          </div>
        )}
        <Source id="ruler" type="geojson" data={rulerGeoJson}>
          <Layer
            id="ruler"
            type="line"
            paint={{ "line-width": 2, "line-color": "#ffff00" }}
          />
        </Source>
        <Source
          id="track-vector-line"
          type="geojson"
          data={trackVectorLineGeoJson}
        >
          <Layer
            id="track-vector-line"
            type="line"
            paint={{
              "line-width": 1,
              "line-color": {
                type: "categorical",
                property: "coalition",
                stops: [
                  ["Enemies", colorMode.Friend],
                  ["Allies", colorMode.Hostile],
                ],
                default: colorMode.Neutral,
              },
            }}
          />
        </Source>
        <Source id="range-circle" type="geojson" data={rangeGeoJson}>
          <Layer
            id="range-circle"
            type="line"
            paint={{
              "line-opacity": 0.75,
              "line-width": 1,
              "line-color": {
                type: "categorical",
                property: "type",
                stops: [
                  ["warning", "#fbbd23"],
                  ["threat", "#f87272"],
                ],
                default: colorMode.Neutral,
              },
            }}
          />
        </Source>
        {rulerStartCoords !== undefined && (
          <BraaInfo start={rulerStartCoords} end={cursorCoords} />
        )}
        {terrain.airports.map((airport) => (
          <AirportMarker key={airport.name} airport={airport} />
        ))}
        {Object.entries(state.objects)
          .filter(([_id, object]) => filterObject(object, settings))
          .map(([id, object]) => {
            return (
              <ObjectMarker
                key={id}
                object={object}
                referenceLatitude={referenceLatitude}
                referenceLongitude={referenceLongitude}
                selected={selectedObjectId === Number(id)}
                onClick={() => {
                  setSelectedObjectId(Number(id));
                }}
              />
            );
          })}
      </Map>
      <SettingsModal
        settings={settings}
        setSettings={(settings) => {
          setSettings({ ...settings });
        }}
        onDisconnect={onDisconnect}
      />
    </>
  );
}
