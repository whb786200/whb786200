"""Serializable API payload helpers."""

from __future__ import annotations


def agent_task_to_dict(task) -> dict[str, object]:
    return {
        "task_id": task.task_id,
        "role": task.role.value,
        "title": task.title,
        "objective": task.objective,
        "inputs": task.inputs,
        "expected_outputs": list(task.expected_outputs),
        "work_package_id": task.work_package_id,
        "status": task.status.value,
        "created_at": task.created_at.isoformat(),
    }


def change_report_to_dict(report) -> dict[str, object]:
    return {
        "impacted_count": report.impacted_count,
        "unchanged_count": report.unchanged_count,
        "total_delta_weight_kg": report.total_delta_weight_kg,
        "added": [mark_delta_to_dict(delta) for delta in report.added],
        "removed": [mark_delta_to_dict(delta) for delta in report.removed],
        "modified": [mark_delta_to_dict(delta) for delta in report.modified],
    }


def mark_delta_to_dict(delta) -> dict[str, object]:
    return {
        "mark": delta.mark,
        "change_type": delta.change_type,
        "old_weight_kg": delta.old_weight_kg,
        "new_weight_kg": delta.new_weight_kg,
        "delta_weight_kg": delta.delta_weight_kg,
        "old_quantity": delta.old_quantity,
        "new_quantity": delta.new_quantity,
        "old_length_mm": delta.old_length_mm,
        "new_length_mm": delta.new_length_mm,
    }
