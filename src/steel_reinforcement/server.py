"""Local HTTP dashboard and API server."""

from __future__ import annotations

import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from steel_reinforcement.api import agent_task_to_dict, change_report_to_dict
from steel_reinforcement.agents import plan_agent_tasks, summarize_task_board
from steel_reinforcement.change import compare_schedules
from steel_reinforcement.detailing import read_schedule_csv
from steel_reinforcement.project import RebarStatus
from steel_reinforcement.storage import load_project, project_to_dict, save_project
from steel_reinforcement.workflow import next_statuses


class DashboardState:
    def __init__(self, project_path: Path) -> None:
        self.project_path = project_path


def run_server(
    project_path: str | Path,
    *,
    host: str = "127.0.0.1",
    port: int = 8765,
    web_dir: str | Path | None = None,
) -> ThreadingHTTPServer:
    state = DashboardState(Path(project_path))
    static_dir = Path(web_dir) if web_dir else Path.cwd() / "web"
    handler = _handler_factory(state, static_dir)
    server = ThreadingHTTPServer((host, port), handler)
    print(f"SteelReinforcement dashboard: http://{host}:{port}")
    print(f"Project file: {state.project_path}")
    server.serve_forever()
    return server


def _handler_factory(state: DashboardState, static_dir: Path):
    class RebarDashboardHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(static_dir), **kwargs)

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/api/project":
                project = load_project(state.project_path)
                self._send_json(_project_response(project))
                return
            if parsed.path == "/api/agent-tasks":
                project = load_project(state.project_path)
                tasks = plan_agent_tasks(project)
                self._send_json(
                    {
                        "board": {role.value: count for role, count in summarize_task_board(tasks).items()},
                        "tasks": [agent_task_to_dict(task) for task in tasks],
                    }
                )
                return
            if parsed.path == "/api/change-impact":
                query = parse_qs(parsed.query)
                old = query.get("old", [None])[0]
                new = query.get("new", [None])[0]
                if not old or not new:
                    self._send_error(HTTPStatus.BAD_REQUEST, "old and new query parameters are required")
                    return
                report = compare_schedules(read_schedule_csv(old), read_schedule_csv(new))
                self._send_json(change_report_to_dict(report))
                return
            if parsed.path == "/":
                self.path = "/index.html"
            super().do_GET()

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/api/advance-package":
                body = self._read_json()
                package_id = body.get("package_id")
                to_status = body.get("to_status")
                actor = body.get("actor", "dashboard")
                note = body.get("note", "")
                if not package_id or not to_status:
                    self._send_error(HTTPStatus.BAD_REQUEST, "package_id and to_status are required")
                    return
                project = load_project(state.project_path)
                if package_id not in project.work_packages:
                    self._send_error(HTTPStatus.NOT_FOUND, f"unknown package_id: {package_id}")
                    return
                try:
                    project.work_packages[package_id].transition_to(
                        RebarStatus(to_status),
                        actor=actor,
                        note=note,
                    )
                    save_project(project, state.project_path)
                except Exception as exc:
                    self._send_error(HTTPStatus.BAD_REQUEST, str(exc))
                    return
                self._send_json(_project_response(project))
                return
            self._send_error(HTTPStatus.NOT_FOUND, "not found")

        def log_message(self, format: str, *args) -> None:
            print(f"{self.address_string()} - {format % args}")

        def _read_json(self) -> dict:
            length = int(self.headers.get("Content-Length", "0"))
            if length == 0:
                return {}
            return json.loads(self.rfile.read(length).decode("utf-8"))

        def _send_json(self, data: object, status: HTTPStatus = HTTPStatus.OK) -> None:
            payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

        def _send_error(self, status: HTTPStatus, message: str) -> None:
            self._send_json({"error": message}, status=status)

    return RebarDashboardHandler


def _project_response(project) -> dict[str, object]:
    data = project_to_dict(project)
    data["total_rebar_weight_kg"] = round(project.total_rebar_weight_kg, 3)
    member_weights = {
        member.member_id: round(member.total_weight_kg, 3)
        for member in project.members.values()
    }
    for member_data in data["members"]:
        member_data["total_weight_kg"] = member_weights[member_data["member_id"]]
    data["status_counts"] = {
        status.value: count for status, count in project.status_counts().items()
    }
    data["work_package_options"] = {
        package.package_id: [status.value for status in next_statuses(package.status)]
        for package in project.work_packages.values()
    }
    return data
