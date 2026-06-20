from steel_reinforcement.detailing import read_schedule_csv, summarize_by_diameter
from steel_reinforcement.models import RebarMark, area_mm2, theoretical_weight_kg_per_m


def test_rebar_mark_calculates_length_and_weight():
    mark = RebarMark(
        mark="B1-01",
        diameter_mm=20,
        quantity=2,
        segment_lengths_mm=(4000, 300, 4000),
        hooks=("90", "90"),
    )

    assert mark.hook_allowance_mm == 480
    assert mark.single_length_mm == 8780
    assert mark.total_length_m == 17.56
    assert round(mark.total_weight_kg, 3) == 43.303


def test_summarize_by_diameter_groups_quantities_and_weight():
    marks = [
        RebarMark("A", 12, 2, (1000,)),
        RebarMark("B", 12, 3, (2000,)),
        RebarMark("C", 16, 1, (3000,)),
    ]

    summaries = summarize_by_diameter(marks)

    assert [item.diameter_mm for item in summaries] == [12, 16]
    assert summaries[0].quantity == 5
    assert summaries[0].total_length_m == 8.0


def test_read_schedule_csv_supports_example():
    marks = read_schedule_csv("examples/sample_bars.csv")

    assert len(marks) == 5
    assert marks[0].single_length_mm == 9180
    assert marks[1].hooks == ("135", "135")


def test_nominal_area_and_weight_helpers():
    assert round(area_mm2(20), 2) == 314.16
    assert round(theoretical_weight_kg_per_m(20), 3) == 2.466
