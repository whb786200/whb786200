"""Domain models for reinforcement schedules."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import pi


STEEL_DENSITY_KG_PER_M3 = 7850
THEORETICAL_WEIGHT_FACTOR = 0.006165

HOOK_EXTENSION_FACTORS = {
    "none": 0.0,
    "0": 0.0,
    "90": 12.0,
    "135": 10.0,
    "180": 8.0,
}


@dataclass(frozen=True)
class RebarMark:
    """A line item in a bar bending schedule."""

    mark: str
    diameter_mm: int
    quantity: int
    segment_lengths_mm: tuple[int, ...]
    hooks: tuple[str, ...] = field(default_factory=tuple)
    steel_grade: str = ""
    member: str = ""
    remark: str = ""

    def __post_init__(self) -> None:
        if not self.mark:
            raise ValueError("mark is required")
        if self.diameter_mm <= 0:
            raise ValueError("diameter_mm must be positive")
        if self.quantity <= 0:
            raise ValueError("quantity must be positive")
        if not self.segment_lengths_mm:
            raise ValueError("at least one segment length is required")
        if any(length <= 0 for length in self.segment_lengths_mm):
            raise ValueError("segment lengths must be positive")

        normalized_hooks = tuple((hook or "none").strip().lower() for hook in self.hooks)
        unknown = [hook for hook in normalized_hooks if hook not in HOOK_EXTENSION_FACTORS]
        if unknown:
            raise ValueError(f"unsupported hook type(s): {', '.join(unknown)}")
        object.__setattr__(self, "hooks", normalized_hooks)

    @property
    def hook_allowance_mm(self) -> int:
        allowance = sum(HOOK_EXTENSION_FACTORS[hook] for hook in self.hooks) * self.diameter_mm
        return round(allowance)

    @property
    def single_length_mm(self) -> int:
        return sum(self.segment_lengths_mm) + self.hook_allowance_mm

    @property
    def total_length_m(self) -> float:
        return self.single_length_mm * self.quantity / 1000

    @property
    def unit_weight_kg_per_m(self) -> float:
        return theoretical_weight_kg_per_m(self.diameter_mm)

    @property
    def total_weight_kg(self) -> float:
        return self.total_length_m * self.unit_weight_kg_per_m

    @property
    def shape_code(self) -> str:
        segments = "+".join(str(length) for length in self.segment_lengths_mm)
        hooks = ";".join(self.hooks) if self.hooks else "none"
        return f"{segments}|{hooks}"


def theoretical_weight_kg_per_m(diameter_mm: int) -> float:
    """Return theoretical steel bar mass in kg/m."""

    if diameter_mm <= 0:
        raise ValueError("diameter_mm must be positive")
    return THEORETICAL_WEIGHT_FACTOR * diameter_mm**2


def area_mm2(diameter_mm: int) -> float:
    """Return nominal bar cross-sectional area in mm2."""

    if diameter_mm <= 0:
        raise ValueError("diameter_mm must be positive")
    return pi * diameter_mm**2 / 4
