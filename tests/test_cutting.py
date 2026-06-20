import pytest

from steel_reinforcement.cutting import optimize_cutting
from steel_reinforcement.models import RebarMark


def test_optimize_cutting_groups_by_diameter():
    marks = [
        RebarMark("A", 12, 2, (6000,)),
        RebarMark("B", 12, 2, (3000,)),
        RebarMark("C", 16, 1, (5000,)),
    ]

    plan = optimize_cutting(marks, stock_length_mm=12000)

    assert plan.total_stock_bars == 3
    assert plan.total_waste_mm == 13000
    assert round(plan.utilization, 4) == 0.6389
    assert {stock.diameter_mm for stock in plan.stock_bars} == {12, 16}


def test_optimize_cutting_rejects_piece_longer_than_stock():
    marks = [RebarMark("A", 12, 1, (13000,))]

    with pytest.raises(ValueError, match="exceeds stock length"):
        optimize_cutting(marks, stock_length_mm=12000)


def test_cut_loss_is_applied_between_pieces():
    marks = [RebarMark("A", 12, 2, (6000,))]

    plan = optimize_cutting(marks, stock_length_mm=12010, cut_loss_mm=10)

    assert plan.total_stock_bars == 1
    assert plan.stock_bars[0].used_length_mm == 12010
