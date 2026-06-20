"""Design revision impact analysis for rebar schedules."""

from __future__ import annotations

from dataclasses import dataclass

from steel_reinforcement.models import RebarMark


@dataclass(frozen=True)
class MarkDelta:
    mark: str
    change_type: str
    old_weight_kg: float
    new_weight_kg: float
    delta_weight_kg: float
    old_quantity: int
    new_quantity: int
    old_length_mm: int
    new_length_mm: int


@dataclass(frozen=True)
class ChangeImpactReport:
    added: tuple[MarkDelta, ...]
    removed: tuple[MarkDelta, ...]
    modified: tuple[MarkDelta, ...]
    unchanged_count: int

    @property
    def total_delta_weight_kg(self) -> float:
        deltas = self.added + self.removed + self.modified
        return round(sum(delta.delta_weight_kg for delta in deltas), 3)

    @property
    def impacted_count(self) -> int:
        return len(self.added) + len(self.removed) + len(self.modified)


def compare_schedules(old_marks: list[RebarMark], new_marks: list[RebarMark]) -> ChangeImpactReport:
    old_map = {mark.mark: mark for mark in old_marks}
    new_map = {mark.mark: mark for mark in new_marks}

    added = tuple(
        _delta(None, new_map[mark], "added") for mark in sorted(set(new_map) - set(old_map))
    )
    removed = tuple(
        _delta(old_map[mark], None, "removed") for mark in sorted(set(old_map) - set(new_map))
    )
    modified_items: list[MarkDelta] = []
    unchanged_count = 0
    for mark in sorted(set(old_map) & set(new_map)):
        old = old_map[mark]
        new = new_map[mark]
        if _mark_signature(old) == _mark_signature(new):
            unchanged_count += 1
        else:
            modified_items.append(_delta(old, new, "modified"))

    return ChangeImpactReport(
        added=added,
        removed=removed,
        modified=tuple(modified_items),
        unchanged_count=unchanged_count,
    )


def _delta(old: RebarMark | None, new: RebarMark | None, change_type: str) -> MarkDelta:
    mark = new.mark if new else old.mark
    old_weight = old.total_weight_kg if old else 0.0
    new_weight = new.total_weight_kg if new else 0.0
    return MarkDelta(
        mark=mark,
        change_type=change_type,
        old_weight_kg=round(old_weight, 3),
        new_weight_kg=round(new_weight, 3),
        delta_weight_kg=round(new_weight - old_weight, 3),
        old_quantity=old.quantity if old else 0,
        new_quantity=new.quantity if new else 0,
        old_length_mm=old.single_length_mm if old else 0,
        new_length_mm=new.single_length_mm if new else 0,
    )


def _mark_signature(mark: RebarMark) -> tuple[object, ...]:
    return (
        mark.diameter_mm,
        mark.quantity,
        mark.segment_lengths_mm,
        mark.hooks,
        mark.steel_grade,
        mark.member,
        mark.remark,
    )
