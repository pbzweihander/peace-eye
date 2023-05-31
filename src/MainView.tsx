import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import circle from "@turf/circle";
import { type Feature, type FeatureCollection } from "geojson";
import geomagnetism from "geomagnetism";
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
import CursorInfo from "./CursorInfo";
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
import { moveCoords, nmToMeter } from "./util";

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
  const [selectedAirportIndex, setSelectedAirportIndex] = useState<
    number | undefined
  >(undefined);
  const [rulerStartCoords, setRulerStartCoords] = useState<
    [number, number] | undefined
  >(undefined);

  const geomagnetismModel = useMemo(() => {
    if (state.globalProperties.referenceTime != null) {
      return geomagnetism.model(new Date(state.globalProperties.referenceTime));
    } else {
      return geomagnetism.model();
    }
  }, [state.globalProperties.referenceTime]);

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

  const terrain =
    referenceLatitude !== undefined && referenceLongitude !== undefined
      ? getTerrainFromReferencePoint(referenceLatitude, referenceLongitude)
      : undefined;

  // TODO: Config coalition for bullseye
  const ownedBullseye = state.blueBullseye;
  const bullseyeCoords: [number, number] | undefined =
    referenceLatitude !== undefined &&
    referenceLongitude !== undefined &&
    ownedBullseye?.coords?.latitude !== undefined &&
    ownedBullseye?.coords?.longitude !== undefined
      ? [
          referenceLatitude + ownedBullseye.coords.latitude,
          referenceLongitude + ownedBullseye.coords.longitude,
        ]
      : undefined;

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
            filterObject(object, settings) &&
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
      <div className="flex h-full flex-col items-center justify-center">
        <div className="mb-3">
          <Spinner />
        </div>
        <div>
          <button
            className="btn-warning btn-sm btn"
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

  if (terrain === undefined) {
    // Display error screen
    return (
      <div className="flex h-full flex-col items-center justify-center">
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

  // Entity = Object + Airport
  let selectedEntity: TacviewObject | undefined;
  let isObjectSelected = false;
  if (selectedObjectId !== undefined) {
    selectedEntity = state.objects[selectedObjectId];
    isObjectSelected = true;
  } else if (selectedAirportIndex !== undefined) {
    const airport = terrain.airports[selectedAirportIndex];
    selectedEntity = {
      estimatedSpeed: 0,
      estimatedAltitudeRate: 0,
      coords: {
        latitude: airport.position[0] - referenceLatitude,
        longitude: airport.position[1] - referenceLongitude,
      },
      name: airport.name,
    };
  }

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
        <div className="absolute left-0 top-0 m-2">
          {selectedEntity !== undefined && (
            <ObjectInfo
              object={selectedEntity}
              referenceLatitude={referenceLatitude}
              referenceLongitude={referenceLongitude}
              bullseyeCoords={bullseyeCoords}
              onClose={() => {
                setSelectedObjectId(undefined);
                setSelectedAirportIndex(undefined);
              }}
              objectSettings={
                isObjectSelected
                  ? objectSettingsInventory[selectedObjectId!] ??
                    defaultObjectSettings()
                  : undefined
              }
              setObjectSettings={
                isObjectSelected
                  ? (objectSettings) => {
                      setObjectSettingsInventory((objectSettingsInventory) => {
                        objectSettingsInventory[selectedObjectId!] =
                          objectSettings;
                        return { ...objectSettingsInventory };
                      });
                    }
                  : undefined
              }
              terrain={terrain}
              geomagnetismModel={geomagnetismModel}
              useMagneticHeading={settings.view.useMagneticHeading}
            />
          )}
        </div>
        <div className="absolute right-0 top-0 m-2">
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
        <CursorInfo
          cursorCoords={cursorCoords}
          bullseyeCoords={bullseyeCoords}
          terrain={terrain}
          geomagnetismModel={geomagnetismModel}
          useMagneticHeading={settings.view.useMagneticHeading}
          showCursorCoords={settings.view.showCursorCoords}
        />
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
          <BraaInfo
            start={rulerStartCoords}
            end={cursorCoords}
            terrain={terrain}
            geomagnetismModel={geomagnetismModel}
            useMagneticHeading={settings.view.useMagneticHeading}
          />
        )}
        {terrain.airports.map((airport, idx) => (
          <AirportMarker
            key={airport.name}
            airport={airport}
            selected={selectedAirportIndex === idx}
            onClick={() => {
              setSelectedObjectId(undefined);
              setSelectedAirportIndex(idx);
            }}
          />
        ))}
        {Object.entries(state.objects)
          .filter(
            ([id, object]) =>
              selectedObjectId === Number(id) || filterObject(object, settings)
          )
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
                  setSelectedAirportIndex(undefined);
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
