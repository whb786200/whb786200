let projectData = null;

const STATUS_LABELS = {
  draft: "\u8349\u7a3f",
  detailing: "\u7ffb\u6837\u4e2d",
  checking: "\u590d\u6838\u4e2d",
  approved: "\u5df2\u5ba1\u6279",
  optimized: "\u5df2\u4f18\u5316",
  issued_for_fabrication: "\u5df2\u4e0b\u53d1\u52a0\u5de5",
  fabricated: "\u5df2\u52a0\u5de5",
  delivered: "\u5df2\u8fdb\u573a",
  installed: "\u5df2\u5b89\u88c5",
  inspected: "\u5df2\u9a8c\u6536",
  closed: "\u5df2\u5173\u95ed",
};

const PACKAGE_TYPE_LABELS = {
  detailing: "\u7ffb\u6837",
  review: "\u590d\u6838",
  cutting: "\u4e0b\u6599\u4f18\u5316",
  procurement: "\u91c7\u8d2d",
  fabrication: "\u52a0\u5de5",
  delivery: "\u914d\u9001",
  installation: "\u5b89\u88c5",
  inspection: "\u9a8c\u6536",
};

const MEMBER_TYPE_LABELS = {
  beam: "\u6881",
  slab: "\u677f",
  column: "\u67f1",
  wall: "\u5899",
  footing: "\u57fa\u7840",
  stair: "\u697c\u68af",
  other: "\u5176\u4ed6",
};

const ROLE_LABELS = {
  drawing_parser: "\u56fe\u7eb8\u89e3\u6790\u667a\u80fd\u4f53",
  detailing: "\u7ffb\u6837\u667a\u80fd\u4f53",
  rule_checker: "\u89c4\u5219\u6821\u6838\u667a\u80fd\u4f53",
  design_optimizer: "\u8bbe\u8ba1\u4f18\u5316\u667a\u80fd\u4f53",
  cutting_optimizer: "\u4e0b\u6599\u4f18\u5316\u667a\u80fd\u4f53",
  change_impact: "\u53d8\u66f4\u5f71\u54cd\u667a\u80fd\u4f53",
  project_manager: "\u9879\u76ee\u7ba1\u7406\u667a\u80fd\u4f53",
  cost_controller: "\u6210\u672c\u63a7\u5236\u667a\u80fd\u4f53",
  field_feedback: "\u73b0\u573a\u53cd\u9988\u667a\u80fd\u4f53",
};

const OWNER_LABELS = {
  detailer: "\u7ffb\u6837\u5458",
  "\u7ffb\u6837\u5458": "\u7ffb\u6837\u5458",
  "fabrication-planner": "\u52a0\u5de5\u8ba1\u5212\u5458",
  "\u52a0\u5de5\u8ba1\u5212\u5458": "\u52a0\u5de5\u8ba1\u5212\u5458",
  planner: "\u8ba1\u5212\u5458",
  system: "\u7cfb\u7edf",
  dashboard: "\u7ba1\u7406\u53f0",
};

const OUTPUT_LABELS = {
  bbs_rows: "\u7ffb\u6837\u660e\u7ec6",
  quantity_summary: "\u5de5\u7a0b\u91cf\u6c47\u603b",
  assumptions: "\u8ba1\u7b97\u5047\u8bbe",
  rule_check_findings: "\u89c4\u5219\u6821\u6838\u95ee\u9898",
  required_human_reviews: "\u9700\u4eba\u5de5\u590d\u6838\u9879",
  cutting_plan: "\u4e0b\u6599\u65b9\u6848",
  waste_report: "\u635f\u8017\u62a5\u544a",
  stock_purchase_advice: "\u91c7\u8d2d\u5efa\u8bae",
  daily_brief: "\u65e5\u62a5\u7b80\u62a5",
  risk_register: "\u98ce\u9669\u6e05\u5355",
  next_action_list: "\u4e0b\u4e00\u6b65\u884c\u52a8",
  impact_report: "\u53d8\u66f4\u5f71\u54cd\u62a5\u544a",
  rework_work_packages: "\u8fd4\u5de5\u5de5\u4f5c\u5305",
  procurement_schedule: "\u91c7\u8d2d\u8ba1\u5212",
  cost_delta: "\u6210\u672c\u5dee\u5f02",
  approval_flags: "\u5ba1\u6279\u63d0\u793a",
  handoff_checklist: "\u4ea4\u63a5\u6e05\u5355",
  blocker_list: "\u963b\u585e\u4e8b\u9879",
};

const TITLE_LABELS = {
  "Generate and check BBS": "\u751f\u6210\u5e76\u590d\u6838\u94a2\u7b4b\u7ffb\u6837\u8868",
  "Optimize cutting plan": "\u4f18\u5316\u94a2\u7b4b\u4e0b\u6599\u65b9\u6848",
  "Draft BBS for Generate and check BBS": "\u751f\u6210\u94a2\u7b4b\u7ffb\u6837\u8868\u521d\u7a3f",
  "Check detailing rules for Generate and check BBS": "\u6821\u6838\u7ffb\u6837\u89c4\u5219",
  "Optimize cuts for Optimize cutting plan": "\u4f18\u5316\u94a2\u7b4b\u4e0b\u6599\u7ec4\u5408",
  "Summarize rebar project risks": "\u6c47\u603b\u94a2\u7b4b\u9879\u76ee\u98ce\u9669",
};

const OBJECTIVE_LABELS = {
  "Generate or update bar bending schedule rows from member data.":
    "\u6839\u636e\u6784\u4ef6\u6570\u636e\u751f\u6210\u6216\u66f4\u65b0\u94a2\u7b4b\u7ffb\u6837\u660e\u7ec6\u3002",
  "Check bar lengths, hooks, anchorage placeholders, spacing, and constructability flags.":
    "\u68c0\u67e5\u94a2\u7b4b\u957f\u5ea6\u3001\u5f2f\u94a9\u3001\u951a\u56fa\u5360\u4f4d\u3001\u95f4\u8ddd\u548c\u53ef\u65bd\u5de5\u6027\u98ce\u9669\u3002",
  "Create cutting plans grouped by diameter and propose stock usage improvements.":
    "\u6309\u76f4\u5f84\u751f\u6210\u4e0b\u6599\u65b9\u6848\uff0c\u5e76\u63d0\u51fa\u539f\u6750\u4f7f\u7528\u4f18\u5316\u5efa\u8bae\u3002",
  "Summarize status, overdue packages, high-risk quantities, and next actions.":
    "\u6c47\u603b\u9879\u76ee\u72b6\u6001\u3001\u903e\u671f\u5de5\u4f5c\u5305\u3001\u9ad8\u98ce\u9669\u5de5\u7a0b\u91cf\u548c\u4e0b\u4e00\u6b65\u884c\u52a8\u3002",
  "Compare change sets, identify impacted members, and draft rework tasks.":
    "\u5bf9\u6bd4\u8bbe\u8ba1\u53d8\u66f4\uff0c\u8bc6\u522b\u53d7\u5f71\u54cd\u6784\u4ef6\u5e76\u751f\u6210\u8fd4\u5de5\u4efb\u52a1\u3002",
};

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }
  return data;
}

async function loadProject() {
  projectData = await requestJson("/api/project");
  renderProject(projectData);
}

function renderProject(project) {
  document.getElementById("projectSubtitle").textContent =
    `${project.project_id} · ${project.name}`;
  document.getElementById("memberCount").textContent = project.members.length;
  document.getElementById("packageCount").textContent = project.work_packages.length;
  document.getElementById("weightTotal").textContent =
    `${project.total_rebar_weight_kg.toFixed(3)} kg`;
  document.getElementById("statusSummary").textContent =
    Object.entries(project.status_counts)
      .map(([status, count]) => `${labelStatus(status)}：${count}`)
      .join(" · ");

  const rows = document.getElementById("packageRows");
  rows.innerHTML = "";
  for (const item of project.work_packages) {
    const tr = document.createElement("tr");
    const nextOptions = project.work_package_options[item.package_id] || [];
    tr.innerHTML = `
      <td>${item.package_id}</td>
      <td>${labelPackageType(item.package_type)}</td>
      <td>${labelTitle(item.title)}</td>
      <td><span class="status">${labelStatus(item.status)}</span></td>
      <td>${labelOwner(item.owner)}</td>
      <td></td>
    `;
    const actionCell = tr.lastElementChild;
    if (nextOptions.length) {
      const select = document.createElement("select");
      for (const status of nextOptions) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = labelStatus(status);
        select.appendChild(option);
      }
      const button = document.createElement("button");
      button.textContent = "\u63a8\u8fdb";
      button.addEventListener("click", () => advancePackage(item.package_id, select.value));
      actionCell.append(select, " ", button);
    } else {
      actionCell.textContent = "\u65e0";
    }
    rows.appendChild(tr);
  }

  const memberList = document.getElementById("memberList");
  memberList.innerHTML = "";
  for (const member of project.members) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${member.member_id} · ${labelMemberName(member.name, member.member_type)}</h3>
      <p>\u4f4d\u7f6e：${member.location.building}/${member.location.level}/${member.location.zone || ""}</p>
      <p>${member.rebar_marks.length} \u4e2a\u94a2\u7b4b\u7f16\u53f7 · ${member.total_weight_kg.toFixed(3)} kg</p>
    `;
    memberList.appendChild(div);
  }
}

async function advancePackage(packageId, toStatus) {
  await requestJson("/api/advance-package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      package_id: packageId,
      to_status: toStatus,
      actor: "dashboard",
      note: "advanced from dashboard",
    }),
  });
  await loadProject();
}

async function loadAgentTasks() {
  const data = await requestJson("/api/agent-tasks");
  const container = document.getElementById("agentTasks");
  container.innerHTML = "";
  for (const task of data.tasks) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${labelRole(task.role)} · ${labelTitle(task.title)}</h3>
      <p>${labelObjective(task.objective)}</p>
      <p>\u8f93\u51fa：${task.expected_outputs.map(labelOutput).join("\u3001")}</p>
    `;
    container.appendChild(div);
  }
}

function labelStatus(status) {
  return STATUS_LABELS[status] || status;
}

function labelPackageType(type) {
  return PACKAGE_TYPE_LABELS[type] || type;
}

function labelRole(role) {
  return ROLE_LABELS[role] || role;
}

function labelOwner(owner) {
  return OWNER_LABELS[owner] || owner || "";
}

function labelOutput(output) {
  return OUTPUT_LABELS[output] || output;
}

function labelTitle(title) {
  return TITLE_LABELS[title] || title;
}

function labelObjective(objective) {
  return OBJECTIVE_LABELS[objective] || objective;
}

function labelMemberName(name, type) {
  if (!name) {
    return MEMBER_TYPE_LABELS[type] || type;
  }
  return name
    .replace(/^Beam\b/, "\u6881")
    .replace(/^Slab\b/, "\u677f")
    .replace(/^Column\b/, "\u67f1")
    .replace(/^Wall\b/, "\u5899")
    .replace(/^Footing\b/, "\u57fa\u7840");
}

document.getElementById("refreshButton").addEventListener("click", loadProject);
document.getElementById("loadTasksButton").addEventListener("click", loadAgentTasks);

loadProject().catch((error) => {
  document.getElementById("projectSubtitle").textContent = error.message;
});
