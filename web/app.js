let projectData = null;

const STATUS_LABELS = {
  draft: "草稿",
  detailing: "翻样中",
  checking: "复核中",
  approved: "已审批",
  optimized: "已优化",
  issued_for_fabrication: "已下发加工",
  fabricated: "已加工",
  delivered: "已进场",
  installed: "已安装",
  inspected: "已验收",
  closed: "已关闭",
};

const PACKAGE_TYPE_LABELS = {
  detailing: "翻样",
  review: "复核",
  cutting: "下料优化",
  procurement: "采购",
  fabrication: "加工",
  delivery: "配送",
  installation: "安装",
  inspection: "验收",
};

const MEMBER_TYPE_LABELS = {
  beam: "梁",
  slab: "板",
  column: "柱",
  wall: "墙",
  footing: "基础",
  stair: "楼梯",
  other: "其他",
};

const ROLE_LABELS = {
  drawing_parser: "图纸解析智能体",
  detailing: "翻样智能体",
  rule_checker: "规则校核智能体",
  design_optimizer: "设计优化智能体",
  cutting_optimizer: "下料优化智能体",
  change_impact: "变更影响智能体",
  project_manager: "项目管理智能体",
  cost_controller: "成本控制智能体",
  field_feedback: "现场反馈智能体",
};

const OWNER_LABELS = {
  detailer: "翻样员",
  "fabrication-planner": "加工计划员",
  planner: "计划员",
  system: "系统",
  dashboard: "管理台",
};

const OUTPUT_LABELS = {
  bbs_rows: "翻样明细",
  quantity_summary: "工程量汇总",
  assumptions: "计算假设",
  rule_check_findings: "规则校核问题",
  required_human_reviews: "需人工复核项",
  cutting_plan: "下料方案",
  waste_report: "损耗报告",
  stock_purchase_advice: "采购建议",
  daily_brief: "日报简报",
  risk_register: "风险清单",
  next_action_list: "下一步行动",
  impact_report: "变更影响报告",
  rework_work_packages: "返工工作包",
  procurement_schedule: "采购计划",
  cost_delta: "成本差异",
  approval_flags: "审批提示",
  handoff_checklist: "交接清单",
  blocker_list: "阻塞事项",
};

const TITLE_LABELS = {
  "Generate and check BBS": "生成并复核钢筋翻样表",
  "Optimize cutting plan": "优化钢筋下料方案",
  "Draft BBS for Generate and check BBS": "生成钢筋翻样表初稿",
  "Check detailing rules for Generate and check BBS": "校核翻样规则",
  "Optimize cuts for Optimize cutting plan": "优化钢筋下料组合",
  "Summarize rebar project risks": "汇总钢筋项目风险",
};

const OBJECTIVE_LABELS = {
  "Generate or update bar bending schedule rows from member data.":
    "根据构件数据生成或更新钢筋翻样明细。",
  "Check bar lengths, hooks, anchorage placeholders, spacing, and constructability flags.":
    "检查钢筋长度、弯钩、锚固占位、间距和可施工性风险。",
  "Create cutting plans grouped by diameter and propose stock usage improvements.":
    "按直径生成下料方案，并提出原材使用优化建议。",
  "Summarize status, overdue packages, high-risk quantities, and next actions.":
    "汇总项目状态、逾期工作包、高风险工程量和下一步行动。",
  "Compare change sets, identify impacted members, and draft rework tasks.":
    "对比设计变更，识别受影响构件并生成返工任务。",
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
      button.textContent = "推进";
      button.addEventListener("click", () => advancePackage(item.package_id, select.value));
      actionCell.append(select, " ", button);
    } else {
      actionCell.textContent = "无";
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
      <p>位置：${member.location.building}/${member.location.level}/${member.location.zone || ""}</p>
      <p>${member.rebar_marks.length} 个钢筋编号 · ${member.total_weight_kg.toFixed(3)} kg</p>
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
      <p>输出：${task.expected_outputs.map(labelOutput).join("、")}</p>
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
    .replace(/^Beam\b/, "梁")
    .replace(/^Slab\b/, "板")
    .replace(/^Column\b/, "柱")
    .replace(/^Wall\b/, "墙")
    .replace(/^Footing\b/, "基础");
}

document.getElementById("refreshButton").addEventListener("click", loadProject);
document.getElementById("loadTasksButton").addEventListener("click", loadAgentTasks);

loadProject().catch((error) => {
  document.getElementById("projectSubtitle").textContent = error.message;
});
