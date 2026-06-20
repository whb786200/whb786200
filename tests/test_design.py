import pytest

from steel_reinforcement.design import select_rebar_area


def test_select_rebar_area_returns_low_excess_candidates():
    selections = select_rebar_area(
        1600,
        diameters_mm=(16, 18, 20, 22, 25),
        max_bars=8,
        top_n=3,
    )

    assert len(selections) == 3
    assert selections[0].provided_area_mm2 >= 1600
    assert selections[0].excess_area_mm2 <= selections[1].excess_area_mm2


def test_select_rebar_area_validates_required_area():
    with pytest.raises(ValueError, match="required_area_mm2"):
        select_rebar_area(0)
