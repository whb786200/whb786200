"""Lightweight reinforcement design optimization helpers."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import product

from steel_reinforcement.models import area_mm2, theoretical_weight_kg_per_m


DEFAULT_DIAMETERS_MM = (8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40)


@dataclass(frozen=True)
class BarSelection:
    diameter_mm: int
    count: int
    provided_area_mm2: float
    excess_area_mm2: float
    weight_kg_per_m: float

    @property
    def utilization(self) -> float:
        return 1.0 - self.excess_area_mm2 / self.provided_area_mm2


def select_rebar_area(
    required_area_mm2: float,
    *,
    diameters_mm: tuple[int, ...] = DEFAULT_DIAMETERS_MM,
    max_bars: int = 12,
    top_n: int = 5,
) -> list[BarSelection]:
    """Find bar count/diameter choices meeting a required reinforcement area."""

    if required_area_mm2 <= 0:
        raise ValueError("required_area_mm2 must be positive")
    if max_bars <= 0:
        raise ValueError("max_bars must be positive")
    if top_n <= 0:
        raise ValueError("top_n must be positive")
    if not diameters_mm:
        raise ValueError("diameters_mm cannot be empty")

    candidates: list[BarSelection] = []
    for diameter, count in product(sorted(set(diameters_mm)), range(1, max_bars + 1)):
        provided = area_mm2(diameter) * count
        if provided >= required_area_mm2:
            candidates.append(
                BarSelection(
                    diameter_mm=diameter,
                    count=count,
                    provided_area_mm2=round(provided, 2),
                    excess_area_mm2=round(provided - required_area_mm2, 2),
                    weight_kg_per_m=round(theoretical_weight_kg_per_m(diameter) * count, 3),
                )
            )

    return sorted(
        candidates,
        key=lambda item: (item.excess_area_mm2, item.weight_kg_per_m, item.count, item.diameter_mm),
    )[:top_n]
