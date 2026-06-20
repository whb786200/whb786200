"""Command line interface."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from steel_reinforcement.api import agent_task_to_dict, change_report_to_dict
from steel_reinforcement.agents import plan_agent_tasks, summarize_task_board
from steel_reinforcement.change import compare_schedules
from steel_reinforcement.cutting import optimize_cutting
from steel_reinforcement.design import DEFAULT_DIAMETERS_MM, select_rebar_area
from steel_reinforcement.detailing import (
    read_schedule_csv,
    summarize_by_diameter,
    write_cutting_plan_csv,
    write_schedule_csv,
)
from steel_reinforcement.project import RebarStatus, build_demo_project
from steel_reinforcement.server import run_server
from steel_reinforcement.storage import load_project, project_to_dict, save_project
from steel_reinforcement.workflow import next_statuses


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="steelreinforcement",
        description="Rebar detailing and optimization toolkit.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    summarize = subparsers.add_parser("summarize", help="Create a rebar schedule summary CSV.")
    summarize.add_argument("input", type=Path)
    summarize.add_argument("--out", type=Path, required=True)

    cuts = subparsers.add_parser("optimize-cuts", help="Create a stock cutting plan CSV.")
    cuts.add_argument("input", type=Path)
    cuts.add_argument("--stock-length-mm", type=int, default=12000)
    cuts.add_argument("--cut-loss-mm", type=int, default=0)
    cuts.add_argument("--out", type=Path, required=True)

    select = subparsers.add_parser("select-bars", help="Select bar count and diameter by area.")
    select.add_argument("--required-area-mm2", type=float, required=True)
    select.add_argument(
        "--diameters",
        default=",".join(str(diameter) for diameter in DEFAULT_DIAMETERS_MM),
        help="Comma-separated diameters in mm.",
    )
    select.add_argument("--max-bars", type=int, default=12)
    select.add_argument("--top-n", type=int, default=5)

    project_demo = subparsers.add_parser(
        "project-demo",
        help="Build a project-management model from a schedule CSV.",
    )
    project_demo.add_argument("input", type=Path)
    project_demo.add_argument("--out", type=Path)

    project_init = subparsers.add_parser(
        "project-init",
        help="Create and save a project JSON file from a schedule CSV.",
    )
    project_init.add_argument("input", type=Path)
    project_init.add_argument("--out", type=Path, required=True)

    agent_tasks = subparsers.add_parser(
        "agent-tasks",
        help="Plan AI-agent tasks from a schedule CSV demo project.",
    )
    agent_tasks.add_argument("input", type=Path)
    agent_tasks.add_argument("--out", type=Path)

    project_status = subparsers.add_parser("project-status", help="Show project JSON status.")
    project_status.add_argument("project", type=Path)

    advance = subparsers.add_parser(
        "advance-package",
        help="Advance a work package status in a project JSON file.",
    )
    advance.add_argument("project", type=Path)
    advance.add_argument("package_id")
    advance.add_argument("to_status", choices=[status.value for status in RebarStatus])
    advance.add_argument("--actor", default="system")
    advance.add_argument("--note", default="")
    advance.add_argument("--out", type=Path)

    project_agent_tasks = subparsers.add_parser(
        "project-agent-tasks",
        help="Plan AI-agent tasks from a saved project JSON file.",
    )
    project_agent_tasks.add_argument("project", type=Path)
    project_agent_tasks.add_argument("--out", type=Path)

    compare = subparsers.add_parser(
        "compare-schedules",
        help="Compare two schedule CSV files and report design-change impact.",
    )
    compare.add_argument("old", type=Path)
    compare.add_argument("new", type=Path)
    compare.add_argument("--out", type=Path)

    serve = subparsers.add_parser("serve", help="Run local project management dashboard.")
    serve.add_argument("project", type=Path)
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8765)
    serve.add_argument("--web-dir", type=Path, default=Path("web"))

    args = parser.parse_args(argv)

    if args.command == "summarize":
        marks = read_schedule_csv(args.input)
        write_schedule_csv(args.out, marks)
        summaries = summarize_by_diameter(marks)
        print(f"wrote {args.out}")
        for summary in summaries:
            print(
                f"D{summary.diameter_mm}: qty={summary.quantity}, "
                f"length={summary.total_length_m:.3f}m, weight={summary.total_weight_kg:.3f}kg"
            )
        return 0

    if args.command == "optimize-cuts":
        marks = read_schedule_csv(args.input)
        plan = optimize_cutting(
            marks,
            stock_length_mm=args.stock_length_mm,
            cut_loss_mm=args.cut_loss_mm,
        )
        write_cutting_plan_csv(args.out, plan)
        print(f"wrote {args.out}")
        print(
            f"stock_bars={plan.total_stock_bars}, "
            f"waste={plan.total_waste_mm}mm, utilization={plan.utilization:.2%}"
        )
        return 0

    if args.command == "select-bars":
        diameters = tuple(int(value.strip()) for value in args.diameters.split(",") if value.strip())
        selections = select_rebar_area(
            args.required_area_mm2,
            diameters_mm=diameters,
            max_bars=args.max_bars,
            top_n=args.top_n,
        )
        for item in selections:
            print(
                f"{item.count}D{item.diameter_mm}: area={item.provided_area_mm2:.2f}mm2, "
                f"excess={item.excess_area_mm2:.2f}mm2, weight={item.weight_kg_per_m:.3f}kg/m"
            )
        return 0

    if args.command == "project-demo":
        project = build_demo_project(read_schedule_csv(args.input))
        data = _project_summary_dict(project)
        if args.out:
            _write_json(args.out, data)
            print(f"wrote {args.out}")
        print(
            f"project={project.project_id}, members={len(project.members)}, "
            f"work_packages={len(project.work_packages)}, "
            f"weight={project.total_rebar_weight_kg:.3f}kg"
        )
        return 0

    if args.command == "project-init":
        project = build_demo_project(read_schedule_csv(args.input))
        save_project(project, args.out)
        print(f"wrote {args.out}")
        print(
            f"project={project.project_id}, members={len(project.members)}, "
            f"work_packages={len(project.work_packages)}"
        )
        return 0

    if args.command == "agent-tasks":
        project = build_demo_project(read_schedule_csv(args.input))
        tasks = plan_agent_tasks(project)
        data = [agent_task_to_dict(task) for task in tasks]
        if args.out:
            _write_json(args.out, data)
            print(f"wrote {args.out}")
        board = summarize_task_board(tasks)
        for role, count in board.items():
            print(f"{role.value}: {count}")
        return 0

    if args.command == "project-status":
        project = load_project(args.project)
        _print_project_status(project)
        return 0

    if args.command == "advance-package":
        project = load_project(args.project)
        if args.package_id not in project.work_packages:
            raise SystemExit(f"unknown package_id: {args.package_id}")
        package = project.work_packages[args.package_id]
        package.transition_to(RebarStatus(args.to_status), actor=args.actor, note=args.note)
        save_project(project, args.out or args.project)
        print(
            f"{package.package_id}: {package.history[-1].from_status.value} "
            f"-> {package.status.value}"
        )
        return 0

    if args.command == "project-agent-tasks":
        project = load_project(args.project)
        tasks = plan_agent_tasks(project)
        data = [agent_task_to_dict(task) for task in tasks]
        if args.out:
            _write_json(args.out, data)
            print(f"wrote {args.out}")
        for role, count in summarize_task_board(tasks).items():
            print(f"{role.value}: {count}")
        return 0

    if args.command == "compare-schedules":
        report = compare_schedules(read_schedule_csv(args.old), read_schedule_csv(args.new))
        data = change_report_to_dict(report)
        if args.out:
            _write_json(args.out, data)
            print(f"wrote {args.out}")
        print(
            f"impacted={report.impacted_count}, unchanged={report.unchanged_count}, "
            f"delta_weight={report.total_delta_weight_kg:.3f}kg"
        )
        return 0

    if args.command == "serve":
        run_server(args.project, host=args.host, port=args.port, web_dir=args.web_dir)
        return 0

    parser.error(f"unknown command: {args.command}")
    return 2


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _project_summary_dict(project) -> dict[str, object]:
    return {
        **project_to_dict(project),
        "project_id": project.project_id,
        "name": project.name,
        "total_rebar_weight_kg": round(project.total_rebar_weight_kg, 3),
        "status_counts": {status.value: count for status, count in project.status_counts().items()},
        "members": [
            {
                "member_id": member.member_id,
                "name": member.name,
                "member_type": member.member_type.value,
                "location": member.location.key,
                "drawing": member.drawing.key,
                "rebar_mark_count": len(member.rebar_marks),
                "total_weight_kg": round(member.total_weight_kg, 3),
            }
            for member in project.members.values()
        ],
        "work_packages": [
            {
                "package_id": package.package_id,
                "package_type": package.package_type.value,
                "title": package.title,
                "status": package.status.value,
                "owner": package.owner,
                "member_ids": package.member_ids,
                "next_statuses": [
                    status.value
                    for status in ([] if package.status == RebarStatus.CLOSED else next_statuses(package.status))
                ],
            }
            for package in project.work_packages.values()
        ],
    }


def _print_project_status(project) -> None:
    print(
        f"project={project.project_id}, members={len(project.members)}, "
        f"work_packages={len(project.work_packages)}, "
        f"weight={project.total_rebar_weight_kg:.3f}kg"
    )
    for status, count in project.status_counts().items():
        print(f"{status.value}: {count}")
    for package in project.work_packages.values():
        next_values = ", ".join(status.value for status in next_statuses(package.status))
        print(
            f"{package.package_id} [{package.package_type.value}] "
            f"{package.status.value} -> {next_values or 'none'}"
        )


if __name__ == "__main__":
    raise SystemExit(main())
