"""Project management data model for digital rebar workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from steel_reinforcement.models import RebarMark


class MemberType(str, Enum):
    BEAM = "beam"
    SLAB = "slab"
    COLUMN = "column"
    WALL = "wall"
    FOOTING = "footing"
    STAIR = "stair"
    OTHER = "other"


class PackageType(str, Enum):
    DETAILING = "detailing"
    REVIEW = "review"
    CUTTING = "cutting"
    PROCUREMENT = "procurement"
    FABRICATION = "fabrication"
    DELIVERY = "delivery"
    INSTALLATION = "installation"
    INSPECTION = "inspection"


class RebarStatus(str, Enum):
    DRAFT = "draft"
    DETAILING = "detailing"
    CHECKING = "checking"
    APPROVED = "approved"
    OPTIMIZED = "optimized"
    ISSUED_FOR_FABRICATION = "issued_for_fabrication"
    FABRICATED = "fabricated"
    DELIVERED = "delivered"
    INSTALLED = "installed"
    INSPECTED = "inspected"
    CLOSED = "closed"


@dataclass(frozen=True)
class ProjectLocation:
    building: str
    level: str
    zone: str = ""
    grid: str = ""

    @property
    def key(self) -> str:
        parts = [self.building, self.level, self.zone, self.grid]
        return "/".join(part for part in parts if part)


@dataclass(frozen=True)
class DrawingRevision:
    drawing_no: str
    revision: str
    issued_on: date
    title: str = ""
    source_uri: str = ""

    @property
    def key(self) -> str:
        return f"{self.drawing_no}@{self.revision}"


@dataclass
class ProjectMember:
    member_id: str
    member_type: MemberType
    location: ProjectLocation
    drawing: DrawingRevision
    name: str = ""
    attributes: dict[str, Any] = field(default_factory=dict)
    rebar_marks: list[RebarMark] = field(default_factory=list)

    @property
    def total_weight_kg(self) -> float:
        return sum(mark.total_weight_kg for mark in self.rebar_marks)


@dataclass(frozen=True)
class StatusEvent:
    from_status: RebarStatus
    to_status: RebarStatus
    actor: str
    at: datetime
    note: str = ""


@dataclass
class WorkPackage:
    package_id: str
    package_type: PackageType
    title: str
    member_ids: list[str]
    status: RebarStatus = RebarStatus.DRAFT
    owner: str = ""
    due_on: date | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    history: list[StatusEvent] = field(default_factory=list)

    def transition_to(
        self,
        to_status: RebarStatus,
        *,
        actor: str,
        note: str = "",
        at: datetime | None = None,
    ) -> None:
        from steel_reinforcement.workflow import validate_transition

        validate_transition(self.status, to_status)
        event = StatusEvent(
            from_status=self.status,
            to_status=to_status,
            actor=actor,
            at=at or datetime.now(timezone.utc),
            note=note,
        )
        self.history.append(event)
        self.status = to_status


@dataclass
class ChangeSet:
    change_id: str
    title: str
    source_revision: DrawingRevision
    target_revision: DrawingRevision
    impacted_member_ids: list[str]
    reason: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RebarProject:
    project_id: str
    name: str
    members: dict[str, ProjectMember] = field(default_factory=dict)
    work_packages: dict[str, WorkPackage] = field(default_factory=dict)
    changes: dict[str, ChangeSet] = field(default_factory=dict)

    def add_member(self, member: ProjectMember) -> None:
        if member.member_id in self.members:
            raise ValueError(f"duplicate member_id: {member.member_id}")
        self.members[member.member_id] = member

    def create_work_package(
        self,
        package_type: PackageType,
        title: str,
        member_ids: list[str],
        *,
        status: RebarStatus = RebarStatus.DRAFT,
        owner: str = "",
        due_on: date | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> WorkPackage:
        missing = [member_id for member_id in member_ids if member_id not in self.members]
        if missing:
            raise ValueError(f"unknown member_id(s): {', '.join(missing)}")
        package = WorkPackage(
            package_id=f"WP-{uuid4().hex[:8].upper()}",
            package_type=package_type,
            title=title,
            member_ids=member_ids,
            status=status,
            owner=owner,
            due_on=due_on,
            metadata=metadata or {},
        )
        self.work_packages[package.package_id] = package
        return package

    @property
    def total_rebar_weight_kg(self) -> float:
        return sum(member.total_weight_kg for member in self.members.values())

    def status_counts(self) -> dict[RebarStatus, int]:
        counts = {status: 0 for status in RebarStatus}
        for package in self.work_packages.values():
            counts[package.status] += 1
        return {status: count for status, count in counts.items() if count}


def build_demo_project(marks: list[RebarMark]) -> RebarProject:
    """Create a small project model from schedule rows for demos and tests."""

    project = RebarProject(project_id="DEMO", name="SteelReinforcement Demo")
    drawing = DrawingRevision(
        drawing_no="S-001",
        revision="A",
        issued_on=date.today(),
        title="Typical structural reinforcement",
    )
    grouped: dict[str, list[RebarMark]] = {}
    for mark in marks:
        grouped.setdefault(mark.member or "Unassigned", []).append(mark)

    for index, (member_name, member_marks) in enumerate(sorted(grouped.items()), start=1):
        member_type = _infer_member_type(member_name)
        member = ProjectMember(
            member_id=f"M-{index:03d}",
            member_type=member_type,
            location=ProjectLocation(building="B1", level="L01", zone="Z1"),
            drawing=drawing,
            name=member_name,
            rebar_marks=member_marks,
        )
        project.add_member(member)

    all_member_ids = list(project.members)
    if all_member_ids:
        project.create_work_package(
            PackageType.DETAILING,
            "生成并复核钢筋翻样表",
            all_member_ids,
            owner="翻样员",
        )
        project.create_work_package(
            PackageType.CUTTING,
            "优化钢筋下料方案",
            all_member_ids,
            status=RebarStatus.APPROVED,
            owner="加工计划员",
        )
    return project


def _infer_member_type(member_name: str) -> MemberType:
    normalized = member_name.lower()
    if "beam" in normalized:
        return MemberType.BEAM
    if "slab" in normalized:
        return MemberType.SLAB
    if "column" in normalized:
        return MemberType.COLUMN
    if "wall" in normalized:
        return MemberType.WALL
    if "footing" in normalized or "foundation" in normalized:
        return MemberType.FOOTING
    return MemberType.OTHER
