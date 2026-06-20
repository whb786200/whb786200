"""JSON persistence for rebar project management models."""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

from steel_reinforcement.models import RebarMark
from steel_reinforcement.project import (
    ChangeSet,
    DrawingRevision,
    MemberType,
    PackageType,
    ProjectLocation,
    ProjectMember,
    RebarProject,
    RebarStatus,
    StatusEvent,
    WorkPackage,
)


SCHEMA_VERSION = 1


def save_project(project: RebarProject, path: str | Path) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(project_to_dict(project), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_project(path: str | Path) -> RebarProject:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return project_from_dict(data)


def project_to_dict(project: RebarProject) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "project_id": project.project_id,
        "name": project.name,
        "members": [_member_to_dict(member) for member in project.members.values()],
        "work_packages": [_package_to_dict(package) for package in project.work_packages.values()],
        "changes": [_change_to_dict(change) for change in project.changes.values()],
    }


def project_from_dict(data: dict[str, Any]) -> RebarProject:
    version = data.get("schema_version")
    if version != SCHEMA_VERSION:
        raise ValueError(f"unsupported project schema_version: {version}")

    project = RebarProject(project_id=data["project_id"], name=data["name"])
    for member_data in data.get("members", []):
        project.members[member_data["member_id"]] = _member_from_dict(member_data)
    for package_data in data.get("work_packages", []):
        project.work_packages[package_data["package_id"]] = _package_from_dict(package_data)
    for change_data in data.get("changes", []):
        project.changes[change_data["change_id"]] = _change_from_dict(change_data)
    return project


def _member_to_dict(member: ProjectMember) -> dict[str, Any]:
    return {
        "member_id": member.member_id,
        "member_type": member.member_type.value,
        "name": member.name,
        "location": {
            "building": member.location.building,
            "level": member.location.level,
            "zone": member.location.zone,
            "grid": member.location.grid,
        },
        "drawing": _drawing_to_dict(member.drawing),
        "attributes": member.attributes,
        "rebar_marks": [_mark_to_dict(mark) for mark in member.rebar_marks],
    }


def _member_from_dict(data: dict[str, Any]) -> ProjectMember:
    location = data["location"]
    return ProjectMember(
        member_id=data["member_id"],
        member_type=MemberType(data["member_type"]),
        name=data.get("name", ""),
        location=ProjectLocation(
            building=location["building"],
            level=location["level"],
            zone=location.get("zone", ""),
            grid=location.get("grid", ""),
        ),
        drawing=_drawing_from_dict(data["drawing"]),
        attributes=data.get("attributes", {}),
        rebar_marks=[_mark_from_dict(mark_data) for mark_data in data.get("rebar_marks", [])],
    )


def _package_to_dict(package: WorkPackage) -> dict[str, Any]:
    return {
        "package_id": package.package_id,
        "package_type": package.package_type.value,
        "title": package.title,
        "member_ids": package.member_ids,
        "status": package.status.value,
        "owner": package.owner,
        "due_on": package.due_on.isoformat() if package.due_on else None,
        "metadata": package.metadata,
        "history": [_event_to_dict(event) for event in package.history],
    }


def _package_from_dict(data: dict[str, Any]) -> WorkPackage:
    return WorkPackage(
        package_id=data["package_id"],
        package_type=PackageType(data["package_type"]),
        title=data["title"],
        member_ids=list(data["member_ids"]),
        status=RebarStatus(data["status"]),
        owner=data.get("owner", ""),
        due_on=_date_or_none(data.get("due_on")),
        metadata=data.get("metadata", {}),
        history=[_event_from_dict(event_data) for event_data in data.get("history", [])],
    )


def _change_to_dict(change: ChangeSet) -> dict[str, Any]:
    return {
        "change_id": change.change_id,
        "title": change.title,
        "source_revision": _drawing_to_dict(change.source_revision),
        "target_revision": _drawing_to_dict(change.target_revision),
        "impacted_member_ids": change.impacted_member_ids,
        "reason": change.reason,
        "created_at": change.created_at.isoformat(),
    }


def _change_from_dict(data: dict[str, Any]) -> ChangeSet:
    return ChangeSet(
        change_id=data["change_id"],
        title=data["title"],
        source_revision=_drawing_from_dict(data["source_revision"]),
        target_revision=_drawing_from_dict(data["target_revision"]),
        impacted_member_ids=list(data["impacted_member_ids"]),
        reason=data.get("reason", ""),
        created_at=datetime.fromisoformat(data["created_at"]),
    )


def _drawing_to_dict(drawing: DrawingRevision) -> dict[str, Any]:
    return {
        "drawing_no": drawing.drawing_no,
        "revision": drawing.revision,
        "issued_on": drawing.issued_on.isoformat(),
        "title": drawing.title,
        "source_uri": drawing.source_uri,
    }


def _drawing_from_dict(data: dict[str, Any]) -> DrawingRevision:
    return DrawingRevision(
        drawing_no=data["drawing_no"],
        revision=data["revision"],
        issued_on=date.fromisoformat(data["issued_on"]),
        title=data.get("title", ""),
        source_uri=data.get("source_uri", ""),
    )


def _event_to_dict(event: StatusEvent) -> dict[str, Any]:
    return {
        "from_status": event.from_status.value,
        "to_status": event.to_status.value,
        "actor": event.actor,
        "at": event.at.isoformat(),
        "note": event.note,
    }


def _event_from_dict(data: dict[str, Any]) -> StatusEvent:
    return StatusEvent(
        from_status=RebarStatus(data["from_status"]),
        to_status=RebarStatus(data["to_status"]),
        actor=data["actor"],
        at=datetime.fromisoformat(data["at"]),
        note=data.get("note", ""),
    )


def _mark_to_dict(mark: RebarMark) -> dict[str, Any]:
    return {
        "mark": mark.mark,
        "diameter_mm": mark.diameter_mm,
        "quantity": mark.quantity,
        "segment_lengths_mm": list(mark.segment_lengths_mm),
        "hooks": list(mark.hooks),
        "steel_grade": mark.steel_grade,
        "member": mark.member,
        "remark": mark.remark,
    }


def _mark_from_dict(data: dict[str, Any]) -> RebarMark:
    return RebarMark(
        mark=data["mark"],
        diameter_mm=int(data["diameter_mm"]),
        quantity=int(data["quantity"]),
        segment_lengths_mm=tuple(int(value) for value in data["segment_lengths_mm"]),
        hooks=tuple(data.get("hooks", [])),
        steel_grade=data.get("steel_grade", ""),
        member=data.get("member", ""),
        remark=data.get("remark", ""),
    )


def _date_or_none(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None
