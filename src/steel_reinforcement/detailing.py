"""CSV IO and schedule summarization."""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from steel_reinforcement.cutting import CuttingPlan
from steel_reinforcement.models import RebarMark


_SPLIT_RE = re.compile(r"[+;,\s]+")


@dataclass(frozen=True)
class RebarScheduleRow:
    mark: str
    member: str
    diameter_mm: int
    quantity: int
    single_length_mm: int
    total_length_m: float
    unit_weight_kg_per_m: float
    total_weight_kg: float
    steel_grade: str
    shape_code: str
    remark: str


@dataclass(frozen=True)
class DiameterSummary:
    diameter_mm: int
    quantity: int
    total_length_m: float
    total_weight_kg: float


def read_schedule_csv(path: str | Path) -> list[RebarMark]:
    """Read a schedule CSV into rebar marks."""

    with Path(path).open("r", newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        return [_row_to_mark(row, index + 2) for index, row in enumerate(reader)]


def to_schedule_rows(marks: Iterable[RebarMark]) -> list[RebarScheduleRow]:
    return [
        RebarScheduleRow(
            mark=mark.mark,
            member=mark.member,
            diameter_mm=mark.diameter_mm,
            quantity=mark.quantity,
            single_length_mm=mark.single_length_mm,
            total_length_m=round(mark.total_length_m, 3),
            unit_weight_kg_per_m=round(mark.unit_weight_kg_per_m, 3),
            total_weight_kg=round(mark.total_weight_kg, 3),
            steel_grade=mark.steel_grade,
            shape_code=mark.shape_code,
            remark=mark.remark,
        )
        for mark in marks
    ]


def summarize_by_diameter(marks: Iterable[RebarMark]) -> list[DiameterSummary]:
    totals: dict[int, dict[str, float]] = {}
    for mark in marks:
        bucket = totals.setdefault(mark.diameter_mm, {"quantity": 0, "length": 0.0, "weight": 0.0})
        bucket["quantity"] += mark.quantity
        bucket["length"] += mark.total_length_m
        bucket["weight"] += mark.total_weight_kg

    return [
        DiameterSummary(
            diameter_mm=diameter,
            quantity=int(values["quantity"]),
            total_length_m=round(values["length"], 3),
            total_weight_kg=round(values["weight"], 3),
        )
        for diameter, values in sorted(totals.items())
    ]


def write_schedule_csv(path: str | Path, marks: Iterable[RebarMark]) -> None:
    rows = to_schedule_rows(marks)
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "mark",
                "member",
                "diameter_mm",
                "quantity",
                "single_length_mm",
                "total_length_m",
                "unit_weight_kg_per_m",
                "total_weight_kg",
                "steel_grade",
                "shape_code",
                "remark",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def write_cutting_plan_csv(path: str | Path, plan: CuttingPlan) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "diameter_mm",
                "stock_no",
                "stock_length_mm",
                "pieces",
                "used_length_mm",
                "waste_mm",
                "utilization",
            ],
        )
        writer.writeheader()
        for stock_no, stock_bar in enumerate(plan.stock_bars, start=1):
            writer.writerow(
                {
                    "diameter_mm": stock_bar.diameter_mm,
                    "stock_no": stock_no,
                    "stock_length_mm": stock_bar.stock_length_mm,
                    "pieces": " + ".join(
                        f"{piece.mark}:{piece.length_mm}" for piece in stock_bar.pieces
                    ),
                    "used_length_mm": stock_bar.used_length_mm,
                    "waste_mm": stock_bar.waste_mm,
                    "utilization": round(stock_bar.utilization, 4),
                }
            )


def _row_to_mark(row: dict[str, str], line_no: int) -> RebarMark:
    try:
        return RebarMark(
            mark=_required(row, "mark"),
            member=row.get("member", "").strip(),
            diameter_mm=int(_required(row, "diameter_mm")),
            quantity=int(_required(row, "quantity")),
            segment_lengths_mm=tuple(_parse_int_list(_required(row, "segments_mm"))),
            hooks=tuple(_parse_text_list(row.get("hooks", ""))),
            steel_grade=row.get("steel_grade", "").strip(),
            remark=row.get("remark", "").strip(),
        )
    except Exception as exc:
        raise ValueError(f"invalid schedule row at CSV line {line_no}: {exc}") from exc


def _required(row: dict[str, str], field: str) -> str:
    value = row.get(field, "")
    if value is None or not value.strip():
        raise ValueError(f"{field} is required")
    return value.strip()


def _parse_int_list(value: str) -> list[int]:
    parts = [part for part in _SPLIT_RE.split(value.strip()) if part]
    if not parts:
        raise ValueError("empty length list")
    return [int(part) for part in parts]


def _parse_text_list(value: str) -> list[str]:
    if not value.strip():
        return []
    return [part.strip() for part in _SPLIT_RE.split(value.strip()) if part.strip()]
