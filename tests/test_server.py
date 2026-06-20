import json
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

from steel_reinforcement.detailing import read_schedule_csv
from steel_reinforcement.project import build_demo_project
from steel_reinforcement.server import _handler_factory, DashboardState
from steel_reinforcement.storage import save_project


def test_dashboard_api_serves_project_and_agent_tasks(tmp_path: Path):
    project_path = tmp_path / "project.json"
    save_project(build_demo_project(read_schedule_csv("examples/sample_bars.csv")), project_path)
    state = DashboardState(project_path)
    handler = _handler_factory(state, Path("web"))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        base_url = f"http://127.0.0.1:{server.server_port}"
        project = _get_json(f"{base_url}/api/project")
        tasks = _get_json(f"{base_url}/api/agent-tasks")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert project["project_id"] == "DEMO"
    assert project["total_rebar_weight_kg"] > 0
    assert len(tasks["tasks"]) == 4


def _get_json(url: str):
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))
