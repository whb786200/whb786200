from datetime import date

import pytest

from steel_reinforcement.agents import AgentRole, plan_agent_tasks, summarize_task_board
from steel_reinforcement.models import RebarMark
from steel_reinforcement.project import (
    DrawingRevision,
    MemberType,
    PackageType,
    ProjectLocation,
    ProjectMember,
    RebarProject,
    RebarStatus,
    build_demo_project,
)
from steel_reinforcement.workflow import next_statuses, validate_transition


def test_build_demo_project_groups_marks_by_member():
    marks = [
        RebarMark("B1-01", 20, 2, (4000,), member="Beam B1"),
        RebarMark("S1-01", 12, 4, (3000,), member="Slab S1"),
    ]

    project = build_demo_project(marks)

    assert len(project.members) == 2
    assert len(project.work_packages) == 2
    assert project.total_rebar_weight_kg > 0
    assert {package.status for package in project.work_packages.values()} == {
        RebarStatus.DRAFT,
        RebarStatus.APPROVED,
    }
    assert {member.member_type for member in project.members.values()} == {
        MemberType.BEAM,
        MemberType.SLAB,
    }


def test_work_package_status_transition_records_history():
    project = RebarProject("P1", "Demo")
    drawing = DrawingRevision("S-001", "A", date(2026, 6, 19))
    member = ProjectMember(
        member_id="M-001",
        member_type=MemberType.BEAM,
        location=ProjectLocation("B1", "L01"),
        drawing=drawing,
        rebar_marks=[RebarMark("B1-01", 20, 1, (4000,))],
    )
    project.add_member(member)
    package = project.create_work_package(PackageType.DETAILING, "Detail beam", ["M-001"])

    package.transition_to(RebarStatus.DETAILING, actor="planner")

    assert package.status == RebarStatus.DETAILING
    assert package.history[-1].from_status == RebarStatus.DRAFT
    assert package.history[-1].actor == "planner"


def test_invalid_status_transition_is_rejected():
    with pytest.raises(ValueError, match="invalid transition"):
        validate_transition(RebarStatus.DRAFT, RebarStatus.CLOSED)


def test_next_statuses_are_deterministic():
    assert next_statuses(RebarStatus.DRAFT) == (RebarStatus.DETAILING,)


def test_plan_agent_tasks_creates_role_specific_tasks():
    project = build_demo_project(
        [RebarMark("B1-01", 20, 2, (4000,), member="Beam B1")]
    )

    tasks = plan_agent_tasks(project)
    board = summarize_task_board(tasks)

    assert board[AgentRole.DETAILING] == 1
    assert board[AgentRole.RULE_CHECKER] == 1
    assert board[AgentRole.CUTTING_OPTIMIZER] == 1
    assert board[AgentRole.PROJECT_MANAGER] == 1
    assert all(task.expected_outputs for task in tasks)
