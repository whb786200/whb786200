const state = {
  user: null,
  resources: [],
  categories: [],
  knowledge: [],
  knowledgeCategories: [],
  knowledgeSummary: null,
  activeView: 'resources',
  agentResult: null
};

const calculatorSchemas = {
  sieve: {
    submitText: '计算筛分级配',
    defaults: {
      wetMass: 2100,
      dryMass: 2000,
      washedMass: 1900,
      sieveRows: '25,0\n20,155\n10,420\n5,510\n2,330\n0.5,260\n0.075,180'
    },
    fields: [
      ['wetMass', '湿样质量 g'],
      ['dryMass', '干样质量 g'],
      ['washedMass', '水洗后质量 g']
    ],
    textarea: ['sieveRows', '筛孔 mm,筛余质量 g']
  },
  moistureDensity: {
    submitText: '计算含水率和压实度',
    defaults: {
      wetSoilMass: 1850,
      drySoilMass: 1680,
      ringVolume: 997,
      targetMaxDryDensity: 1.82
    },
    fields: [
      ['wetSoilMass', '湿土质量 g'],
      ['drySoilMass', '干土质量 g'],
      ['ringVolume', '试模体积 cm3'],
      ['targetMaxDryDensity', '最大干密度 g/cm3']
    ]
  },
  atterberg: {
    submitText: '计算液塑限指标',
    defaults: {
      liquidLimit: 38,
      plasticLimit: 21,
      naturalMoisture: 24
    },
    fields: [
      ['liquidLimit', '液限 %'],
      ['plasticLimit', '塑限 %'],
      ['naturalMoisture', '天然含水率 %']
    ]
  },
  concrete: {
    submitText: '估算混凝土性能',
    defaults: {
      cement: 360,
      flyAsh: 60,
      slag: 0,
      water: 165,
      fineAggregate: 760,
      coarseAggregate: 1040,
      admixture: 5,
      ageDays: 28
    },
    fields: [
      ['cement', '水泥 kg/m3'],
      ['flyAsh', '粉煤灰 kg/m3'],
      ['slag', '矿粉 kg/m3'],
      ['water', '水 kg/m3'],
      ['fineAggregate', '细集料 kg/m3'],
      ['coarseAggregate', '粗集料 kg/m3'],
      ['admixture', '外加剂 kg/m3'],
      ['ageDays', '龄期 d']
    ]
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function iconRefresh() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function syncUser() {
  const loggedIn = Boolean(state.user);
  $('#authView').classList.toggle('hidden', loggedIn);
  $('#workspace').classList.toggle('hidden', !loggedIn);
  $('#userPanel').classList.toggle('hidden', !loggedIn);

  if (!loggedIn) return;

  $('#userName').textContent = `${state.user.name} · ${state.user.company || state.user.username}`;
  $('#pointBalance').textContent = `${state.user.points} 分`;
  $('#topBalance').textContent = `${state.user.points} 分`;
  $('#inviteCode').textContent = state.user.inviteCode;
  $('#inviteLink').value = `${window.location.origin}/?invite=${state.user.inviteCode}`;
  $$('.admin-only').forEach((node) => node.classList.toggle('hidden', state.user.role !== 'admin'));
}

function setView(viewName) {
  state.activeView = viewName;
  const titles = {
    resources: '资源表格',
    agent: '试验智能体',
    calculator: '自动计算',
    knowledge: '资料库',
    opensource: '开源融合',
    points: '积分明细',
    promote: '推广入口',
    admin: '人员管理'
  };
  $('#viewTitle').textContent = titles[viewName] || '资源表格';
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
  $$('.view').forEach((view) => view.classList.remove('active'));
  $(`#${viewName}View`)?.classList.add('active');

  if (viewName === 'points') loadPoints();
  if (viewName === 'admin') loadAdminUsers();
  if (viewName === 'knowledge') loadKnowledgeResources();
  if (viewName === 'opensource') loadOpenSourceProjects();
  if (viewName === 'calculator') renderCalculatorForm($('#calculatorType').value);
  if (viewName === 'agent' && state.agentResult) renderAgentResult(state.agentResult);
}

function renderResources() {
  const grid = $('#resourceGrid');
  if (!state.resources.length) {
    grid.innerHTML = '<div class="resource-card"><h3>没有匹配的表格</h3><p>换一个关键词或类别再试。</p></div>';
    return;
  }

  grid.innerHTML = state.resources
    .map(
      (resource) => `
        <article class="resource-card">
          <div class="resource-meta">
            <span>${resource.extension.toUpperCase()}</span>
            <span>${formatSize(resource.size)}</span>
          </div>
          <h3>${escapeHtml(resource.name)}</h3>
          <div class="tag-row">
            <span class="tag">${escapeHtml(resource.category)}</span>
            <span class="tag ${resource.cost === 0 ? 'free' : ''}">${resource.cost === 0 ? '免费' : `${resource.cost} 分`}</span>
          </div>
          <button class="primary-button download-button" data-download="${resource.id}">
            <i data-lucide="download"></i>
            下载表格
          </button>
        </article>
      `
    )
    .join('');

  $$('[data-download]').forEach((button) => {
    button.addEventListener('click', () => downloadResource(button.dataset.download));
  });
  iconRefresh();
}

function renderCategories(resources) {
  const select = $('#categoryFilter');
  const categories = [...new Set(resources.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  state.categories = categories;
  const current = select.value;
  select.innerHTML = '<option value="">全部类别</option>';
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.append(option);
  }
  select.value = categories.includes(current) ? current : '';
}

async function loadResources() {
  const keyword = $('#resourceSearch').value.trim();
  const category = $('#categoryFilter').value;
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (category) params.set('category', category);
  const data = await request(`/api/resources?${params.toString()}`);
  state.resources = data.resources;
  if (!category && !keyword) renderCategories(data.resources);
  renderResources();
}

async function downloadResource(id) {
  try {
    const response = await fetch(`/api/resources/${id}/download`, { credentials: 'same-origin' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '下载失败');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    const fileName = match ? decodeURIComponent(match[1]) : 'resource.xls';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    showToast('下载已开始，积分已同步扣减。');
    await refreshSession();
    await loadPoints();
  } catch (error) {
    showToast(error.message);
  }
}

function renderKnowledgeSummary(payload) {
  const box = $('#knowledgeSummary');
  if (!payload) {
    box.innerHTML = '';
    return;
  }

  const totals = payload.totals || {};
  const cards = [
    ['文件总数', totals.files || 0],
    ['文件夹', totals.folders || 0],
    ['可优先融合', totals.byPriority?.high || 0],
    ['规范参考', totals.byPriority?.reference || 0]
  ];

  const categoryCards = (payload.categories || [])
    .map(
      (category) => `
        <button class="knowledge-category-card" data-knowledge-category="${escapeHtml(category.id)}" type="button">
          <strong>${escapeHtml(category.name)}</strong>
          <span>${category.count} 个文件</span>
          <small>${escapeHtml(category.module)}</small>
        </button>
      `
    )
    .join('');

  box.innerHTML = `
    <div class="metric-row">
      ${cards.map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong></div>`).join('')}
    </div>
    <div class="knowledge-category-grid">${categoryCards}</div>
  `;

  $$('[data-knowledge-category]').forEach((button) => {
    button.addEventListener('click', () => {
      $('#knowledgeCategoryFilter').value = button.dataset.knowledgeCategory;
      loadKnowledgeResources();
    });
  });
}

function renderKnowledgeCategoryFilter(categories) {
  const select = $('#knowledgeCategoryFilter');
  const current = select.value;
  select.innerHTML = '<option value="">全部资料类型</option>';
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = `${category.name}（${category.count}）`;
    select.append(option);
  }
  select.value = categories.some((item) => item.id === current) ? current : '';
}

function renderKnowledgeRows(resources) {
  const rows = $('#knowledgeRows');
  if (!resources.length) {
    rows.innerHTML = '<tr><td colspan="4"><span class="muted">没有匹配的资料，换一个关键词或分类。</span></td></tr>';
    return;
  }

  rows.innerHTML = resources
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <span class="table-sub">${escapeHtml(item.relativePath)}</span>
            <span class="table-sub">${escapeHtml(item.fileType)} · ${formatFileSize(item.size)}</span>
          </td>
          <td>
            <strong>${escapeHtml(item.categoryName)}</strong>
            <span class="table-sub">${escapeHtml((item.tags || []).join('、') || item.integrationModule)}</span>
          </td>
          <td>
            <strong>${escapeHtml(item.integrationModule)}</strong>
            <span class="table-sub">${escapeHtml(item.integrationMode)}</span>
            <span class="table-sub">${escapeHtml(item.recommendedUse)}</span>
          </td>
          <td><span class="status-pill priority-${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
        </tr>
      `
    )
    .join('');
}

async function loadKnowledgeResources() {
  const keyword = $('#knowledgeSearch').value.trim();
  const category = $('#knowledgeCategoryFilter').value;
  const priority = $('#knowledgePriorityFilter').value;
  const params = new URLSearchParams({ limit: '120' });
  if (keyword) params.set('keyword', keyword);
  if (category) params.set('category', category);
  if (priority) params.set('priority', priority);

  const data = await request(`/api/knowledge/resources?${params.toString()}`);
  state.knowledge = data.resources;
  state.knowledgeSummary = data;
  state.knowledgeCategories = data.categories || [];
  renderKnowledgeSummary(data);
  renderKnowledgeCategoryFilter(state.knowledgeCategories);
  renderKnowledgeRows(data.resources);
  iconRefresh();
}

function renderCalculatorForm(type) {
  const schema = calculatorSchemas[type];
  const form = $('#calculatorForm');
  const fields = schema.fields
    .map(([name, label]) => {
      const value = schema.defaults[name] ?? '';
      return `
        <label>
          ${label}
          <input name="${name}" type="number" step="any" value="${value}" />
        </label>
      `;
    })
    .join('');
  const textarea = schema.textarea
    ? `
      <label class="full-span">
        ${schema.textarea[1]}
        <textarea name="${schema.textarea[0]}" rows="8">${schema.defaults[schema.textarea[0]]}</textarea>
      </label>
    `
    : '';
  form.innerHTML = `
    <div class="calc-fields">${fields}${textarea}</div>
    <button class="primary-button" type="submit">
      <i data-lucide="play"></i>
      ${schema.submitText}
    </button>
  `;
  iconRefresh();
}

function getCalculatorPayload(type, form) {
  const payload = Object.fromEntries(new FormData(form));
  if (type === 'sieve') {
    payload.sieves = String(payload.sieveRows || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [size, retained] = line.split(',').map((item) => Number(item.trim()));
        return { size, retained };
      });
    delete payload.sieveRows;
  }
  return payload;
}

function renderCalculationResult(result) {
  const box = $('#calculationResult');
  const valueRows = Object.entries(result)
    .filter(([key, value]) => !['rows', 'type'].includes(key) && value !== null && value !== undefined)
    .map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('');

  let table = '';
  if (Array.isArray(result.rows)) {
    table = `
      <div class="mini-table">
        <table>
          <thead>
            <tr>
              <th>筛孔 mm</th>
              <th>筛余 g</th>
              <th>分计筛余 %</th>
              <th>累计筛余 g</th>
              <th>通过率 %</th>
            </tr>
          </thead>
          <tbody>
            ${result.rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.size}</td>
                    <td>${row.retained}</td>
                    <td>${row.percentRetained}</td>
                    <td>${row.cumulativeRetained}</td>
                    <td>${row.percentPassing}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  box.innerHTML = `<div class="result-grid">${valueRows}</div>${table}`;
}

async function calculateCurrentForm(event) {
  event.preventDefault();
  try {
    const type = $('#calculatorType').value;
    const payload = getCalculatorPayload(type, event.currentTarget);
    const data = await request(`/api/calculations/${type}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    renderCalculationResult(data.result);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadOpenSourceProjects() {
  const data = await request('/api/open-source/projects');
  $('#openSourceRows').innerHTML = data.projects
    .map(
      (project) => `
        <tr>
          <td>
            <strong>${escapeHtml(project.categoryName || project.category)}</strong>
            <span class="table-sub">${escapeHtml(project.category || '-')}</span>
          </td>
          <td>
            <strong>${escapeHtml(project.name)}</strong>
            <span class="table-sub">${escapeHtml(project.repository)}</span>
          </td>
          <td><span class="status-pill">${escapeHtml(project.license)}</span></td>
          <td>${escapeHtml(project.stack)}</td>
          <td>${escapeHtml(project.mode)}</td>
          <td>
            <strong>${escapeHtml(project.status)}</strong>
            <span class="table-sub">${escapeHtml(project.integration)}</span>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderAgentResult(result) {
  const box = $('#agentResult');
  const resources = (result.recommendedResources || [])
    .map(
      (item) => `
        <div class="mini-item">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.category)}</span>
        </div>
      `
    )
    .join('');
  const projects = (result.recommendedProjects || [])
    .map(
      (item) => `
        <div class="mini-item">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.mode)}</span>
        </div>
      `
    )
    .join('');
  const knowledge = (result.recommendedKnowledge || [])
    .map(
      (item) => `
        <div class="mini-item">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.categoryName)} · ${escapeHtml(item.integrationModule)}</span>
        </div>
      `
    )
    .join('');

  box.innerHTML = `
    <div class="agent-summary">
      <div class="agent-badge">${escapeHtml(result.intentLabel || '通用试验工程助手')}</div>
      <h3>${escapeHtml(result.answer || result.summary || '已完成分析')}</h3>
      <p>${escapeHtml(result.summary || '')}</p>
      <div class="agent-meta">
        <span>置信度 ${escapeHtml(result.confidence ?? '-')}</span>
        <span>${escapeHtml(result.calculator?.label || '无计算器建议')}</span>
      </div>
    </div>
    <div class="agent-section">
      <strong>下一步</strong>
      <ol>
        ${(result.nextSteps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
    </div>
    <div class="agent-section">
      <strong>推荐开源项目</strong>
      <div class="mini-list">${projects || '<span class="muted">暂无推荐</span>'}</div>
    </div>
    <div class="agent-section">
      <strong>推荐资源表格</strong>
      <div class="mini-list">${resources || '<span class="muted">暂无推荐</span>'}</div>
    </div>
    <div class="agent-section">
      <strong>推荐资料库文件</strong>
      <div class="mini-list">${knowledge || '<span class="muted">暂无推荐</span>'}</div>
    </div>
    ${result.followUpQuestions?.length ? `<div class="agent-section"><strong>还需要确认</strong><ul>${result.followUpQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
  `;
}

async function runAgentAnalysis(message) {
  const payload = { message: String(message || '').trim() };
  const data = await request('/api/agent/engineer', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  state.agentResult = data.result;
  renderAgentResult(data.result);
  setView('agent');
}

async function loadPoints() {
  const data = await request('/api/points');
  $('#pointRows').innerHTML = data.transactions
    .map(
      (item) => `
        <tr>
          <td>${formatTime(item.createdAt)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.note || '-')}</td>
          <td class="${item.amount > 0 ? 'amount-plus' : 'amount-minus'}">${item.amount > 0 ? '+' : ''}${item.amount}</td>
        </tr>
      `
    )
    .join('');
  if (state.user) {
    state.user.points = data.balance;
    syncUser();
  }
}

async function loadAdminUsers() {
  if (state.user?.role !== 'admin') return;
  const data = await request('/api/admin/users');
  $('#adminUserRows').innerHTML = data.users
    .map(
      (user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.company || '-')}</td>
          <td>${escapeHtml(user.licenseNo || '-')}</td>
          <td>${escapeHtml(user.inviteCode)}</td>
          <td>${user.points}</td>
          <td>${escapeHtml(user.role)}</td>
        </tr>
      `
    )
    .join('');

  const select = $('#adminUserSelect');
  select.innerHTML = data.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${user.points} 分</option>`).join('');
}

async function refreshSession() {
  const data = await request('/api/session');
  state.user = data.user;
  syncUser();
  return data.user;
}

function bindEvents() {
  $$('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      $$('.tab').forEach((tab) => tab.classList.remove('active'));
      button.classList.add('active');
      $('#loginForm').classList.toggle('hidden', button.dataset.authTab !== 'login');
      $('#registerForm').classList.toggle('hidden', button.dataset.authTab !== 'register');
      $('#authMessage').textContent = '';
    });
  });

  $$('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const data = await request('/api/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form))
      });
      state.user = data.user;
      syncUser();
      setView('resources');
      await loadResources();
    } catch (error) {
      $('#authMessage').textContent = error.message;
    }
  });

  $('#registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const data = await request('/api/register', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form))
      });
      state.user = data.user;
      syncUser();
      setView('resources');
      await loadResources();
      showToast('注册成功，积分已入账。');
    } catch (error) {
      $('#authMessage').textContent = error.message;
    }
  });

  $('#logoutButton').addEventListener('click', async () => {
    await request('/api/logout', { method: 'POST' });
    state.user = null;
    syncUser();
  });

  $('#resourceSearch').addEventListener('input', () => {
    window.clearTimeout(loadResources.timer);
    loadResources.timer = window.setTimeout(loadResources, 220);
  });
  $('#categoryFilter').addEventListener('change', loadResources);

  $('#knowledgeSearch').addEventListener('input', () => {
    window.clearTimeout(loadKnowledgeResources.timer);
    loadKnowledgeResources.timer = window.setTimeout(loadKnowledgeResources, 220);
  });
  $('#knowledgeCategoryFilter').addEventListener('change', loadKnowledgeResources);
  $('#knowledgePriorityFilter').addEventListener('change', loadKnowledgeResources);

  $('#calculatorType').addEventListener('change', (event) => {
    renderCalculatorForm(event.target.value);
    $('#calculationResult').textContent = '选择计算类型并填写数据。';
  });
  $('#calculatorForm').addEventListener('submit', calculateCurrentForm);
  $('#agentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await runAgentAnalysis($('#agentMessage').value);
    } catch (error) {
      showToast(error.message);
    }
  });
  $$('[data-agent-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      $('#agentMessage').value = button.dataset.agentPrompt;
      $('#agentMessage').focus();
    });
  });

  $('#copyInviteButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('#inviteLink').value);
    showToast('推广链接已复制。');
  });

  $('#pointAdjustForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      await request('/api/admin/points', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form))
      });
      event.currentTarget.reset();
      await loadAdminUsers();
      if (state.activeView === 'points') await loadPoints();
      await refreshSession();
      showToast('积分调整已提交。');
    } catch (error) {
      showToast(error.message);
    }
  });
}

async function init() {
  bindEvents();
  renderCalculatorForm('sieve');
  $('#agentMessage').value = '我要做土工击实和压实度计算，推荐哪个表格和模块？';
  const invite = new URLSearchParams(window.location.search).get('invite');
  if (invite) {
    $('#inviteCodeInput').value = invite.toUpperCase();
    document.querySelector('[data-auth-tab="register"]').click();
  }

  await refreshSession();
  if (state.user) {
    await loadResources();
    setView('resources');
  }
  iconRefresh();
}

init().catch((error) => {
  showToast(error.message);
});
