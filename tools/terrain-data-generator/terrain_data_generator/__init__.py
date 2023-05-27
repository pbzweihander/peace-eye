import dataclasses
import typing
import json

from dcs.terrain import (
    Caucasus,
    Nevada,
    Normandy,
    PersianGulf,
    TheChannel,
    Syria,
    MarianaIslands,
)

terrains = [
    Caucasus(),
    Nevada(),
    Normandy(),
    PersianGulf(),
    TheChannel(),
    Syria(),
    MarianaIslands(),
]


@dataclasses.dataclass(frozen=True)
class ExportProjection:
    centralMeridian: int
    falseEasting: float
    falseNorthing: float
    scaleFactor: float


@dataclasses.dataclass(frozen=True)
class ExportAirport:
    name: str
    position: typing.Tuple[float, float]


@dataclasses.dataclass(frozen=True)
class ExportTerrain:
    name: str
    center: typing.Tuple[float, float]
    airports: typing.List[ExportAirport]
    projection: ExportProjection


def main():
    for terrain in terrains:
        projection = terrain.projection_parameters
        export_projection = ExportProjection(
            centralMeridian=projection.central_meridian,
            falseEasting=projection.false_easting,
            falseNorthing=projection.false_northing,
            scaleFactor=projection.scale_factor,
        )
        export_airports: typing.List[ExportAirport] = []
        for airport in terrain.airport_list():
            pos = airport.position.latlng()
            export_airports.append(
                ExportAirport(name=airport.name, position=(pos.lat, pos.lng))
            )
        pos = terrain.map_view_default.position.latlng()
        export_terrain = ExportTerrain(
            name=terrain.name,
            center=(pos.lat, pos.lng),
            airports=export_airports,
            projection=export_projection,
        )

        with open(f"../../src/data/terrain/{terrain.name.lower()}.json", "w") as file:
            file.write(json.dumps(dataclasses.asdict(export_terrain), indent=2))


if __name__ == "__main__":
    main()
