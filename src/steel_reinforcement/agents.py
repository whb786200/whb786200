"""AI-agent task contracts for digital rebar project management."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from steel_reinforcement.project import PackageType, RebarProject, RebarStatus, WorkPackage


class AgentRole(str, Enum):
    DRAWING_PARSER = "drawing_parser"
    DETAILING = "detailing"
    RULE_CHECKER = "rule_checker"
    DESIGN_OPTIMIZER = "design_optimizer"
    CUTTING_OPTIMIZER = "cutting_optimizer"
    CHANGE_IMPACT = "change_impact"
    PROJECT_MANAGER = "project_manager"
    COST_CONTROLLER = "cost_controller"
    FIELD_FEEDBACK = "field_feedback"


class AgentTaskStatus(str, Enum):
    OPEN = "open"
    RUNNING = "running"
    NEEDS_REVIEW = "needs_review"
    DONE = "done"
    BLOCKED = "blocked"


@dataclass(frozen=True)
class AgentTask:
    task_id: str
    role: AgentRole
    title: str
    objective: str
    inputs: dict[str, Any]
    expected_outputs: tuple[str, ...]
    work_package_id: str | None = None
    status: AgentTaskStatus = AgentTaskStatus.OPEN
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class AgentFinding:
    severity: str
    message: str
    reference: str = ""
    recommendation: str = ""


@dataclass(frozen=True)
class AgentResult:
    task_id: str
    status: AgentTaskStatus
    summary: str
    findings: tuple[AgentFinding, ...] = ()
    artifacts: dict[str, str] = field(default_factory=dict)
    completed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def plan_agent_tasks(project: RebarProject) -> list[AgentTask]:
    """Create agent tasks from current project packages and status."""

    tasks: list[AgentTask] = []
    for package in project.work_packages.values():
        tasks.extend(_tasks_for_package(project, package))
    if project.changes:
        tasks.append(
            AgentTask(
                task_id=_task_id(),
                role=AgentRole.CHANGE_IMPACT,
                title="分析图纸版本变更影响",
                objective="对比设计变更，识别受影响构件并生成返工任务。",
                inputs={"change_ids": list(project.changes)},
                expected_outputs=("impact_report", "rework_work_packages"),
            )
        )
    tasks.append(
        AgentTask(
            task_id=_task_id(),
            role=AgentRole.PROJECT_MANAGER,
            title="汇总钢筋项目风险",
            objective="汇总项目状态、逾期工作包、高风险工程量和下一步行动。",
            inputs={
                "project_id": project.project_id,
                "status_counts": {status.value: count for status, count in project.status_counts().items()},
                "total_rebar_weight_kg": round(project.total_rebar_weight_kg, 3),
            },
            expected_outputs=("daily_brief", "risk_register", "next_action_list"),
        )
    )
    return tasks


def summarize_task_board(tasks: list[AgentTask]) -> dict[AgentRole, int]:
    counts = {role: 0 for role in AgentRole}
    for task in tasks:
        counts[task.role] += 1
    return {role: count for role, count in counts.items() if count}


def _tasks_for_package(project: RebarProject, package: WorkPackage) -> list[AgentTask]:
    member_refs = [_member_ref(project, member_id) for member_id in package.member_ids]
    common_inputs = {
        "project_id": project.project_id,
        "package_id": package.package_id,
        "package_status": package.status.value,
        "members": member_refs,
    }

    if package.package_type == PackageType.DETAILING:
        return [
            AgentTask(
                task_id=_task_id(),
                role=AgentRole.DETAILING,
                title=f"生成翻样表初稿：{package.title}",
                objective="根据构件数据生成或更新钢筋翻样明细。",
                inputs=common_inputs,
                expected_outputs=("bbs_rows", "quantity_summary", "assumptions"),
                work_package_id=package.package_id,
            ),
            AgentTask(
                task_id=_task_id(),
                role=AgentRole.RULE_CHECKER,
                title=f"校核翻样规则：{package.title}",
                objective="检查钢筋长度、弯钩、锚固占位、间距和可施工性风险。",
                inputs=common_inputs,
                expected_outputs=("rule_check_findings", "required_human_reviews"),
                work_package_id=package.package_id,
            ),
        ]

    if package.package_type == PackageType.CUTTING:
        return [
            AgentTask(
                task_id=_task_id(),
                role=AgentRole.CUTTING_OPTIMIZER,
                title=f"优化钢筋下料组合：{package.title}",
                objective="按直径生成下料方案，并提出原材使用优化建议。",
                inputs=common_inputs | {"target_status": RebarStatus.OPTIMIZED.value},
                expected_outputs=("cutting_plan", "waste_report", "stock_purchase_advice"),
                work_package_id=package.package_id,
            )
        ]

    if package.package_type == PackageType.PROCUREMENT:
        return [
            AgentTask(
                task_id=_task_id(),
                role=AgentRole.COST_CONTROLLER,
                title=f"生成采购建议：{package.title}",
                objective="对比需求量、库存、损耗和已审批工作包，生成采购建议。",
                inputs=common_inputs,
                expected_outputs=("procurement_schedule", "cost_delta", "approval_flags"),
                work_package_id=package.package_id,
            )
        ]

    return [
        AgentTask(
            task_id=_task_id(),
            role=AgentRole.PROJECT_MANAGER,
            title=f"协调工作包：{package.title}",
            objective="跟踪工作包状态、阻塞事项和交接要求。",
            inputs=common_inputs,
            expected_outputs=("handoff_checklist", "blocker_list"),
            work_package_id=package.package_id,
        )
    ]


def _member_ref(project: RebarProject, member_id: str) -> dict[str, Any]:
    member = project.members[member_id]
    return {
        "member_id": member.member_id,
        "name": member.name,
        "type": member.member_type.value,
        "location": member.location.key,
        "drawing": member.drawing.key,
        "rebar_mark_count": len(member.rebar_marks),
        "rebar_weight_kg": round(member.total_weight_kg, 3),
    }


def _task_id() -> str:
    return f"AT-{uuid4().hex[:8].upper()}"
