from pathlib import Path

from steel_reinforcement.change import compare_schedules
from steel_reinforcement.detailing import read_schedule_csv
from steel_reinforcement.project import RebarStatus, build_demo_project
from steel_reinforcement.storage import load_project, save_project


def test_project_json_round_trip(tmp_path: Path):
    project = build_demo_project(read_schedule_csv("examples/sample_bars.csv"))
    path = tmp_path / "project.json"

    save_project(project, path)
    loaded = load_project(path)

    assert loaded.project_id == project.project_id
    assert len(loaded.members) == len(project.members)
    assert len(loaded.work_packages) == len(project.work_packages)
    assert round(loaded.total_rebar_weight_kg, 3) == round(project.total_rebar_weight_kg, 3)


def test_loaded_project_can_advance_package(tmp_path: Path):
    project = build_demo_project(read_schedule_csv("examples/sample_bars.csv"))
    package = next(
        package for package in project.work_packages.values() if package.status == RebarStatus.DRAFT
    )
    path = tmp_path / "project.json"
    save_project(project, path)

    loaded = load_project(path)
    loaded.work_packages[package.package_id].transition_to(
        RebarStatus.DETAILING,
        actor="planner",
        note="start detailing",
    )

    assert loaded.work_packages[package.package_id].status == RebarStatus.DETAILING
    assert loaded.work_packages[package.package_id].history[-1].note == "start detailing"


def test_compare_schedules_reports_added_and_modified_marks():
    old_marks = read_schedule_csv("examples/sample_bars.csv")
    new_marks = read_schedule_csv("examples/sample_bars_rev_b.csv")

    report = compare_schedules(old_marks, new_marks)

    assert [delta.mark for delta in report.added] == ["B1-03"]
    assert [delta.mark for delta in report.modified] == ["B1-01"]
    assert report.unchanged_count == 4
    assert report.total_delta_weight_kg > 0
