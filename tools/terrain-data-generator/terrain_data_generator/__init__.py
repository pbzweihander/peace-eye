import dataclasses
import typing
import json

from dcs.mapping import Point
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
class ExportAirport:
    name: str
    position: typing.Tuple[float, float]


@dataclasses.dataclass(frozen=True)
class ExportTerrain:
    name: str
    center: typing.Tuple[float, float]
    airports: typing.List[ExportAirport]


def main():
    for terrain in terrains:
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
        )

        with open(f"../../src/data/terrain/{terrain.name.lower()}.json", "w") as file:
            file.write(json.dumps(dataclasses.asdict(export_terrain), indent=2))


if __name__ == "__main__":
    main()
