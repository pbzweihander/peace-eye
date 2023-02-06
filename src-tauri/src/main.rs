#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    collections::{HashMap, HashSet, VecDeque},
    time::Duration,
};

use serde::Serialize;
use tacview_realtime_client::acmi::{
    record::{
        global_property::GlobalProperty,
        object_property::{Coords, ObjectProperty, Tag},
        Record,
    },
    Header,
};
use tauri::{AppHandle, Manager};
use time::OffsetDateTime;
use tokio::{
    spawn,
    sync::Mutex,
    task::JoinHandle,
    time::{interval, sleep},
};
use tracing_subscriber::prelude::*;

static TACVIEW_STATE: Mutex<Option<TacviewState>> = Mutex::const_new(None);
static TACVIEW_READER_TASK_HANDLE: Mutex<Option<JoinHandle<()>>> = Mutex::const_new(None);
static TACVIEW_STATE_EMIT_TASK_HANDLE: Mutex<Option<JoinHandle<()>>> = Mutex::const_new(None);

const MAX_TRACK_LENGTH: usize = 30;

/// In nautical miles
fn get_range((lat1, lon1): (f64, f64), (lat2, lon2): (f64, f64)) -> f64 {
    const R: f64 = 6371.;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();

    let d_lat_half_sin = (d_lat / 2.).sin();
    let d_lon_half_sin = (d_lon / 2.).sin();

    let a = d_lat_half_sin * d_lat_half_sin
        + d_lon_half_sin * d_lon_half_sin * lat1_rad.cos() * lat2_rad.cos();
    let c = 2. * a.sqrt().atan2((1. - a).sqrt());
    let d = R * c;
    d * 0.539957
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct TacviewGlobalProperties {
    #[serde(with = "time::serde::rfc3339::option")]
    reference_time: Option<OffsetDateTime>,
    author: Option<String>,
    title: Option<String>,
    comments: Option<String>,
    reference_longitude: Option<f64>,
    reference_latitude: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct TacviewObject {
    #[serde(skip)]
    tracks: VecDeque<(f64, Coords)>,

    /// in knot
    estimated_speed: f64,
    /// in 1000 feet per minute
    estimated_altitude_rate: f64,

    coords: Option<Coords>,
    name: Option<String>,
    #[serde(rename = "type")]
    ty: Option<HashSet<Tag>>,
    callsign: Option<String>,
    pilot: Option<String>,
    squawk: Option<String>,
    group: Option<String>,
    coalition: Option<String>,
}

impl TacviewObject {
    fn update_estimated_speed(&mut self, reference_latitude: f64, reference_longitude: f64) {
        if self.tracks.len() < 2 {
            self.estimated_speed = -1.;
            return;
        }

        let first_track = self.tracks.front().unwrap();
        let last_track = self.tracks.back().unwrap();

        let seconds = first_track.0 - last_track.0;
        let range = get_range(
            (
                reference_latitude + first_track.1.latitude.unwrap(),
                reference_longitude + first_track.1.longitude.unwrap(),
            ),
            (
                reference_latitude + last_track.1.latitude.unwrap(),
                reference_longitude + last_track.1.longitude.unwrap(),
            ),
        );

        self.estimated_speed = range / seconds * 3600.;
    }

    fn update_estimated_altitude_rate(&mut self) {
        if self.tracks.len() < 2 {
            self.estimated_altitude_rate = 0.;
            return;
        }

        let first_track = self.tracks.front().unwrap();
        let last_track = self.tracks.back().unwrap();

        let seconds = first_track.0 - last_track.0;
        let altitude_delta = first_track.1.altitude.unwrap() - last_track.1.altitude.unwrap();

        self.estimated_altitude_rate = altitude_delta * 3.28084 / 1000. / seconds * 60.;
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TacviewState {
    header: Header,
    global_properties: TacviewGlobalProperties,
    objects: HashMap<u64, TacviewObject>,
    current_timeframe: Option<f64>,
    blue_bullseye: Option<TacviewObject>,
    red_bullseye: Option<TacviewObject>,
}

impl TacviewState {
    fn update(&mut self, record: Record) {
        match record {
            Record::Remove(id) => {
                self.objects.remove(&id);
            }
            Record::Frame(timeframe) => {
                self.current_timeframe = Some(timeframe);
            }
            Record::Event(_) => {
                // TODO:
            }
            Record::GlobalProperties(global_properties) => {
                for global_property in global_properties {
                    match global_property {
                        GlobalProperty::ReferenceTime(time) => {
                            self.global_properties.reference_time = Some(time);
                        }
                        GlobalProperty::Author(author) => {
                            self.global_properties.author = Some(author);
                        }
                        GlobalProperty::Title(title) => {
                            self.global_properties.title = Some(title);
                        }
                        GlobalProperty::Comments(comments) => {
                            self.global_properties.comments = Some(comments);
                        }
                        GlobalProperty::ReferenceLongitude(longitude) => {
                            self.global_properties.reference_longitude = Some(longitude);
                        }
                        GlobalProperty::ReferenceLatitude(latitude) => {
                            self.global_properties.reference_latitude = Some(latitude);
                        }
                        _ => {}
                    }
                }
            }
            Record::Update(id, object_properties) => {
                let object = self.objects.entry(id).or_default();
                for object_property in object_properties {
                    match object_property {
                        ObjectProperty::T(coords) => {
                            let object_coords = object.coords.get_or_insert_with(Default::default);
                            object_coords.update(&coords);
                            if let Some(timeframe) = self.current_timeframe {
                                if object
                                    .ty
                                    .as_ref()
                                    .map(|ty| ty.contains(&Tag::Air))
                                    .unwrap_or(false)
                                    && object_coords.latitude.is_some()
                                    && object_coords.longitude.is_some()
                                    && object_coords.altitude.is_some()
                                {
                                    object.tracks.push_front((timeframe, object_coords.clone()));
                                    object.tracks.truncate(MAX_TRACK_LENGTH);
                                    if let Some(reference_latitude) =
                                        self.global_properties.reference_latitude
                                    {
                                        if let Some(reference_longitude) =
                                            self.global_properties.reference_longitude
                                        {
                                            object.update_estimated_speed(
                                                reference_latitude,
                                                reference_longitude,
                                            );
                                        }
                                    }
                                    object.update_estimated_altitude_rate();
                                }
                            }
                        }
                        ObjectProperty::Name(value) => {
                            object.name = Some(value);
                        }
                        ObjectProperty::Type(value) => {
                            object.ty = Some(value);
                        }
                        ObjectProperty::Callsign(value) => {
                            object.callsign = Some(value);
                        }
                        ObjectProperty::Pilot(value) => {
                            object.pilot = Some(value);
                        }
                        ObjectProperty::Squawk(value) => {
                            object.squawk = Some(value);
                        }
                        ObjectProperty::Group(value) => {
                            object.group = Some(value);
                        }
                        ObjectProperty::Coalition(value) => {
                            object.coalition = Some(value);
                        }
                        _ => {}
                    }
                }
                if let Some(ty) = &object.ty {
                    if ty.contains(&Tag::Bullseye) {
                        if object.coalition == Some("Enemies".to_string()) {
                            self.blue_bullseye = Some(object.clone());
                        } else if object.coalition == Some("Allies".to_string()) {
                            self.red_bullseye = Some(object.clone());
                        }
                    }
                }
            }
        }
    }
}

async fn tacview_reader_task(
    app: AppHandle,
    host: String,
    port: u16,
    username: String,
    password: String,
) {
    loop {
        let mut reader =
            match tacview_realtime_client::connect((host.as_str(), port), &username, &password)
                .await
            {
                Ok(reader) => reader,
                Err(error) => {
                    tracing::error!(%error, "failed to connect");
                    if let Err(error) =
                        app.emit_all("error", format!("failed to connect: {}", error))
                    {
                        tracing::error!(%error, "failed to emit error");
                    }
                    sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };
        loop {
            match reader.next().await {
                Ok(record) => {
                    let mut state = TACVIEW_STATE.lock().await;
                    let state = state.get_or_insert_with(|| TacviewState {
                        header: reader.header.clone(),
                        global_properties: Default::default(),
                        objects: HashMap::new(),
                        current_timeframe: None,
                        blue_bullseye: None,
                        red_bullseye: None,
                    });
                    state.update(record);
                }
                Err(error) => {
                    tracing::error!(%error, "failed to read from server");
                    if let Err(error) =
                        app.emit_all("error", format!("failed to read from server: {}", error))
                    {
                        tracing::error!(%error, "failed to emit error");
                    }
                    break;
                }
            }
        }
        sleep(Duration::from_secs(5)).await;
    }
}

async fn spawn_tacview_reader_task(
    app: AppHandle,
    host: String,
    port: u16,
    username: String,
    password: String,
) {
    let mut task_handle = TACVIEW_READER_TASK_HANDLE.lock().await;
    let new_handle = spawn(tacview_reader_task(app, host, port, username, password));
    if let Some(task_handle) = task_handle.replace(new_handle) {
        task_handle.abort();
    }
}

async fn tacview_state_emit_task(app: AppHandle) {
    let mut interval = interval(Duration::from_secs(2));
    loop {
        interval.tick().await;
        let state = TACVIEW_STATE.lock().await;
        if let Some(state) = &*state {
            if let Err(error) = app.emit_all("tacview-state", &state) {
                tracing::error!(%error, "failed to emit tacview state");
            }
        }
    }
}

async fn spawn_tacview_state_emit_task(app: AppHandle) {
    let mut task_handle = TACVIEW_STATE_EMIT_TASK_HANDLE.lock().await;
    let new_handle = spawn(tacview_state_emit_task(app));
    if let Some(task_handle) = task_handle.replace(new_handle) {
        task_handle.abort();
    }
}

#[tauri::command]
async fn connect(app: AppHandle, host: String, port: u16, username: String, password: String) {
    spawn_tacview_reader_task(app.clone(), host, port, username, password).await;
    spawn_tacview_state_emit_task(app).await;
}

#[tauri::command]
async fn disconnect() {
    let reader_task_handle = TACVIEW_READER_TASK_HANDLE.lock().await;
    if let Some(task_handle) = &*reader_task_handle {
        task_handle.abort();
    }
    let emit_task_handle = TACVIEW_STATE_EMIT_TASK_HANDLE.lock().await;
    if let Some(task_handle) = &*emit_task_handle {
        task_handle.abort();
    }
}

fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![connect, disconnect])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
