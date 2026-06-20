"""One-dimensional cutting stock optimizer for reinforcing bars."""

from __future__ import annotations

from dataclasses import dataclass, field
from itertools import count
from typing import Iterable

from steel_reinforcement.models import RebarMark


@dataclass(frozen=True)
class CutPiece:
    mark: str
    diameter_mm: int
    length_mm: int


@dataclass
class StockBar:
    diameter_mm: int
    stock_length_mm: int
    cut_loss_mm: int = 0
    pieces: list[CutPiece] = field(default_factory=list)

    @property
    def cut_loss_total_mm(self) -> int:
        return max(len(self.pieces) - 1, 0) * self.cut_loss_mm

    @property
    def used_length_mm(self) -> int:
        return sum(piece.length_mm for piece in self.pieces) + self.cut_loss_total_mm

    @property
    def waste_mm(self) -> int:
        return self.stock_length_mm - self.used_length_mm

    @property
    def utilization(self) -> float:
        return self.used_length_mm / self.stock_length_mm if self.stock_length_mm else 0.0

    def can_fit(self, piece: CutPiece) -> bool:
        extra_loss = self.cut_loss_mm if self.pieces else 0
        return self.used_length_mm + extra_loss + piece.length_mm <= self.stock_length_mm

    def add(self, piece: CutPiece) -> None:
        if not self.can_fit(piece):
            raise ValueError("piece does not fit this stock bar")
        self.pieces.append(piece)


@dataclass(frozen=True)
class CuttingPlan:
    stock_bars: tuple[StockBar, ...]

    @property
    def total_stock_bars(self) -> int:
        return len(self.stock_bars)

    @property
    def total_stock_length_mm(self) -> int:
        return sum(stock.stock_length_mm for stock in self.stock_bars)

    @property
    def total_used_length_mm(self) -> int:
        return sum(stock.used_length_mm for stock in self.stock_bars)

    @property
    def total_waste_mm(self) -> int:
        return sum(stock.waste_mm for stock in self.stock_bars)

    @property
    def utilization(self) -> float:
        if self.total_stock_length_mm == 0:
            return 0.0
        return self.total_used_length_mm / self.total_stock_length_mm


def optimize_cutting(
    marks: Iterable[RebarMark],
    *,
    stock_length_mm: int = 12000,
    cut_loss_mm: int = 0,
) -> CuttingPlan:
    """Optimize cutting with a first-fit decreasing heuristic, grouped by diameter."""

    if stock_length_mm <= 0:
        raise ValueError("stock_length_mm must be positive")
    if cut_loss_mm < 0:
        raise ValueError("cut_loss_mm cannot be negative")

    pieces = _expand_pieces(marks)
    for piece in pieces:
        if piece.length_mm > stock_length_mm:
            raise ValueError(
                f"piece {piece.mark} length {piece.length_mm} exceeds stock length {stock_length_mm}"
            )

    by_diameter: dict[int, list[CutPiece]] = {}
    for piece in pieces:
        by_diameter.setdefault(piece.diameter_mm, []).append(piece)

    stock_bars: list[StockBar] = []
    for diameter in sorted(by_diameter):
        diameter_stocks: list[StockBar] = []
        sorted_pieces = sorted(
            by_diameter[diameter],
            key=lambda piece: (piece.length_mm, piece.mark),
            reverse=True,
        )
        for piece in sorted_pieces:
            for stock_bar in diameter_stocks:
                if stock_bar.can_fit(piece):
                    stock_bar.add(piece)
                    break
            else:
                stock_bar = StockBar(
                    diameter_mm=diameter,
                    stock_length_mm=stock_length_mm,
                    cut_loss_mm=cut_loss_mm,
                )
                stock_bar.add(piece)
                diameter_stocks.append(stock_bar)
        stock_bars.extend(diameter_stocks)

    return CuttingPlan(stock_bars=tuple(stock_bars))


def _expand_pieces(marks: Iterable[RebarMark]) -> list[CutPiece]:
    pieces: list[CutPiece] = []
    serials = count(1)
    for mark in marks:
        for _ in range(mark.quantity):
            pieces.append(
                CutPiece(
                    mark=f"{mark.mark}#{next(serials)}",
                    diameter_mm=mark.diameter_mm,
                    length_mm=mark.single_length_mm,
                )
            )
    return pieces
