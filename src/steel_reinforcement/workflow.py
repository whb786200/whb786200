"""Status workflow for rebar project management."""

from __future__ import annotations

from steel_reinforcement.project import RebarStatus


ALLOWED_TRANSITIONS: dict[RebarStatus, set[RebarStatus]] = {
    RebarStatus.DRAFT: {RebarStatus.DETAILING},
    RebarStatus.DETAILING: {RebarStatus.CHECKING, RebarStatus.DRAFT},
    RebarStatus.CHECKING: {RebarStatus.APPROVED, RebarStatus.DETAILING},
    RebarStatus.APPROVED: {RebarStatus.OPTIMIZED, RebarStatus.DETAILING},
    RebarStatus.OPTIMIZED: {RebarStatus.ISSUED_FOR_FABRICATION, RebarStatus.APPROVED},
    RebarStatus.ISSUED_FOR_FABRICATION: {RebarStatus.FABRICATED, RebarStatus.OPTIMIZED},
    RebarStatus.FABRICATED: {RebarStatus.DELIVERED},
    RebarStatus.DELIVERED: {RebarStatus.INSTALLED},
    RebarStatus.INSTALLED: {RebarStatus.INSPECTED},
    RebarStatus.INSPECTED: {RebarStatus.CLOSED, RebarStatus.INSTALLED},
    RebarStatus.CLOSED: set(),
}


def validate_transition(from_status: RebarStatus, to_status: RebarStatus) -> None:
    allowed = ALLOWED_TRANSITIONS[from_status]
    if to_status not in allowed:
        options = ", ".join(status.value for status in sorted(allowed, key=lambda item: item.value))
        raise ValueError(
            f"invalid transition {from_status.value} -> {to_status.value}; "
            f"allowed next status: {options or 'none'}"
        )


def next_statuses(status: RebarStatus) -> tuple[RebarStatus, ...]:
    return tuple(sorted(ALLOWED_TRANSITIONS[status], key=lambda item: item.value))


def workflow_mermaid() -> str:
    lines = ["flowchart LR"]
    for from_status, targets in ALLOWED_TRANSITIONS.items():
        for to_status in targets:
            lines.append(f"  {from_status.value} --> {to_status.value}")
    return "\n".join(lines)
