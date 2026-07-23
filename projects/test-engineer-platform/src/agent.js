import { getOpenSourceProjects } from './calculators.js';
import { listKnowledgeResources } from './knowledge.js';
import { listResources } from './store.js';

const CALCULATORS = [
  { id: 'sieve', label: '筛分级配', keywords: ['筛分', '级配', '筛孔', '筛余', '粒径', 'sieve'] },
  { id: 'moistureDensity', label: '含水率/干密度/压实度', keywords: ['含水率', '压实度', '干密度', '湿密度', '击实', 'proctor'] },
  { id: 'atterberg', label: '液塑限', keywords: ['液限', '塑限', '塑性指数', 'atterberg', '液塑限'] },
  { id: 'concrete', label: '混凝土估算', keywords: ['混凝土', '坍落度', '配合比', '强度', '砂浆', '回弹', 'upv'] }
];

const INTENTS = [
  {
    id: 'site-investigation',
    label: '勘察数据与钻孔管理',
    keywords: ['勘察', '钻孔', '孔位', '孔深', 'cpt', 'gef', 'ags', '地层', '岩芯', '取样', '现场数据', '标贯'],
    projectCategories: ['01-site-investigation', '07-standards-data-models', '06-instrument-data'],
    projectNames: ['python-ags4', 'pyagsapi', 'agslint', 'pygef', 'DIGGS_SQL'],
    resourceKeywords: ['钻孔', '勘察', '地层', 'cpt', 'gef', 'ags', '岩芯'],
    knowledgeCategories: ['standards'],
    steps: ['先统一勘察数据格式', '把 AGS/CPT/钻孔文件导入校验', '再回填到标准化勘察库'],
    questions: ['你是要做 AGS 校验、CPT 解析，还是钻孔编录入库？'],
    view: 'opensource'
  },
  {
    id: 'soil-lab-testing',
    label: '土工试验自动计算',
    keywords: ['筛分', '级配', '击实', '压实度', '含水率', '液限', '塑限', '塑性指数', '比重', '土工试验', '砂砾', '土样'],
    projectCategories: ['02-soil-lab-testing', '07-standards-data-models'],
    projectNames: ['geotech-utils', 'soiltools', 'DIGGS_SQL'],
    resourceKeywords: ['筛分', '击实', '压实度', '含水率', '液限', '塑限', '级配'],
    knowledgeCategories: ['excel-calculators', 'material-testing', 'sampling'],
    calculator: 'moistureDensity',
    steps: ['先确认试验类型和标准', '填入原始数据或上传表格', '再回填报告模板或试验台账'],
    questions: ['你要先做筛分、击实，还是液塑限？'],
    view: 'calculator'
  },
  {
    id: 'geotechnical-analysis',
    label: '岩土分析与设计',
    keywords: ['边坡', '稳定', '液化', '承载力', '沉降', '基础', '桩基', '反应谱', '地震', '地基'],
    projectCategories: ['03-geotechnical-analysis'],
    projectNames: ['geolysis', 'PySlope', 'liquepy', 'geofound', 'eqsig'],
    resourceKeywords: ['边坡', '承载力', '沉降', '地基', '液化', '基础'],
    knowledgeCategories: ['standards'],
    steps: ['先明确计算场景和控制指标', '整理土层参数与荷载条件', '再调用对应岩土分析模块'],
    questions: ['你要做边坡、承载力，还是液化分析？'],
    view: 'opensource'
  },
  {
    id: 'lims-lab-management',
    label: '实验室管理与 LIMS',
    keywords: ['lims', '实验室', '样品流转', '委托', '台账', '报告', '审核', '检测计划', '检验计划', '频次'],
    projectCategories: ['04-lims-lab-management', '08-inspection-test-management'],
    projectNames: ['SENAITE LIMS', 'OpenELIS Global', 'LabKey Server', 'QATrack+', 'eLabFTW', 'Kiwi TCMS', 'TestLink'],
    resourceKeywords: ['台账', '报告', '记录', '履历', '规范', '清单'],
    knowledgeCategories: ['test-plan', 'report-templates', 'sop-training'],
    steps: ['先梳理样品、任务和报告三个对象', '把检测频次和审核节点固化成流程', '再决定是否拆成独立 LIMS 服务'],
    questions: ['你要先做样品流转，还是报告审核？'],
    view: 'opensource'
  },
  {
    id: 'sampling-and-plans',
    label: '见证取样与检测计划',
    keywords: ['见证取样', '送检', '取样', '试验方案', '检测试验计划', '检测计划', '检验批', '频次', '材料进场', '送检指南'],
    projectCategories: ['08-inspection-test-management', '04-lims-lab-management'],
    projectNames: ['QATrack+', 'eLabFTW', 'Kiwi TCMS', 'TestLink'],
    resourceKeywords: ['见证取样', '送检', '试验计划', '检测频率', '取样方法'],
    knowledgeCategories: ['sampling', 'test-plan', 'report-templates'],
    steps: ['先确定工程类型、材料类别和检验批划分', '从资料库调用取样频次和计划模板', '再生成送检清单、委托任务和归档字段'],
    questions: ['你要生成送检计划、取样清单，还是报告台账？'],
    view: 'knowledge'
  },
  {
    id: 'standards-and-sop',
    label: '标准规范与作业指导',
    keywords: ['标准', '规范', '规程', '指南', '指引', '作业指导书', '培训', '讲义', '报告格式', '编写指南'],
    projectCategories: ['07-standards-data-models', '08-inspection-test-management'],
    projectNames: ['DIGGS_SQL', 'eLabFTW', 'QATrack+'],
    resourceKeywords: ['规范', '标准', '作业指导', '报告格式', '培训'],
    knowledgeCategories: ['standards', 'sop-training', 'report-templates'],
    steps: ['先在资料库按标准号或检测项目检索', '把高频文件拆成条文依据和操作步骤', '正式引用时保留原文件路径和版本来源'],
    questions: ['你要查标准依据、操作步骤，还是报告格式？'],
    view: 'knowledge'
  },
  {
    id: 'inspection-test-management',
    label: '检验试验管理',
    keywords: ['检验', '试验管理', '测试管理', 'qa', 'qatrack', '用例', '测试计划', '执行记录', '批次', '批次管理'],
    projectCategories: ['08-inspection-test-management', '09-test-automation-frameworks'],
    projectNames: ['QATrack+', 'eLabFTW', 'Kiwi TCMS', 'TestLink', 'Robot Framework', 'OpenHTF', 'TofuPilot', 'labgrid'],
    resourceKeywords: ['记录', '计划', '批次', '审核', '频次', '用例'],
    knowledgeCategories: ['test-plan', 'sampling', 'inspection-evaluation', 'report-templates'],
    steps: ['先定义检验项目、频率和限值', '把执行记录和审核节点固化下来', '再决定是否接自动化测试执行器'],
    questions: ['你更关注检验流程、结果记录，还是批次审核？'],
    view: 'opensource'
  },
  {
    id: 'instrument-data',
    label: '仪器采集与回传',
    keywords: ['仪器', '采集', 'astm', '串口', '设备', '上传', '网关', '通讯', '联机', '回传'],
    projectCategories: ['06-instrument-data', '09-test-automation-frameworks'],
    projectNames: ['python-astm', 'OpenHTF', 'TofuPilot', 'labgrid', 'Robot Framework'],
    resourceKeywords: ['仪器', '自校', '履历', '温湿度', '采集', '回传'],
    knowledgeCategories: ['excel-calculators', 'sop-training'],
    steps: ['先确认仪器协议和输出格式', '把采集网关和结果回传链路打通', '再接入任务调度和报告归档'],
    questions: ['你要连哪类仪器，是 ASTM 协议还是普通串口？'],
    view: 'opensource'
  },
  {
    id: 'concrete-materials',
    label: '混凝土与材料预测',
    keywords: ['混凝土', '砂浆', '配合比', '坍落度', '强度', '回弹', 'upv', 'gwp', '碳排', '养护'],
    projectCategories: ['05-concrete-materials'],
    projectNames: ['SustainableConcrete', 'upv-compressive-strength-predictions'],
    resourceKeywords: ['混凝土', '砂浆', '配合比', '坍落度', '强度', '养护'],
    knowledgeCategories: ['material-testing', 'excel-calculators'],
    calculator: 'concrete',
    steps: ['先确定材料组成和龄期', '再输入配合比或强度数据', '最后决定用轻量估算还是外部 ML 服务'],
    questions: ['你要做强度、坍落度，还是配合比优化？'],
    view: 'calculator'
  }
];

const DEFAULT_INTENT = {
  id: 'general',
  label: '通用试验工程助手',
  projectCategories: [],
  projectNames: [],
  resourceKeywords: [],
  knowledgeCategories: [],
  steps: ['先说明场景：勘察、土工、岩土、检验、仪器或材料。', '如果有原始数据，直接贴数字或文件名。', '我会把你导到对应模块、资料和计算器。'],
  questions: ['你想处理哪一类试验或资料？'],
  view: 'resources'
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function scoreIntent(text, intent) {
  let score = 0;
  const matched = [];

  for (const keyword of intent.keywords) {
    const token = keyword.toLowerCase();
    if (token && text.includes(token)) {
      score += token.length >= 4 ? 2 : 1;
      matched.push(keyword);
    }
  }

  return { ...intent, score, matched };
}

function inferCalculator(text, bestIntent) {
  if (bestIntent.calculator) return bestIntent.calculator;
  for (const calculator of CALCULATORS) {
    if (calculator.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return calculator.id;
    }
  }
  return null;
}

function rankProjects(catalog, intent, text) {
  const categories = new Set(intent.projectCategories || []);
  const names = new Set((intent.projectNames || []).map((item) => item.toLowerCase()));

  return catalog
    .map((project) => {
      let score = 0;
      const haystack = `${project.name || ''} ${project.mode || ''} ${project.integration || ''} ${project.categoryName || ''} ${project.category || ''}`.toLowerCase();
      if (categories.has(project.category)) score += 5;
      if (names.has(String(project.name || '').toLowerCase())) score += 4;
      for (const keyword of intent.keywords || []) {
        if (haystack.includes(keyword.toLowerCase())) score += 1;
      }
      if (text.includes(String(project.name || '').toLowerCase())) score += 3;
      return { ...project, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, 5)
    .map(({ score, ...project }) => project);
}

function rankResources(resources, intent, text) {
  const keywords = [...new Set([...(intent.resourceKeywords || []), ...(intent.keywords || [])])];

  return resources
    .map((resource) => {
      const haystack = `${resource.name} ${resource.category} ${resource.originalPath}`.toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        if (haystack.includes(keyword.toLowerCase())) {
          score += keyword.length >= 4 ? 2 : 1;
        }
      }
      if (text.includes(resource.name.toLowerCase())) score += 2;
      return { ...resource, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, 6)
    .map(({ score, ...resource }) => resource);
}

function buildKnowledgeKeyword(intent, text) {
  const matched = [...(intent.matched || []), ...(intent.resourceKeywords || []), ...(intent.keywords || [])]
    .map((item) => String(item || '').trim())
    .filter((item) => item && text.includes(item.toLowerCase()));
  return [...new Set(matched)].slice(0, 3).join(' ');
}

async function rankKnowledgeResources(intent, text) {
  const categories = [...new Set(intent.knowledgeCategories || [])];
  const keyword = buildKnowledgeKeyword(intent, text);
  const queries = [];

  if (categories.length) {
    for (const category of categories.slice(0, 4)) {
      queries.push(listKnowledgeResources({ category, limit: 20 }));
    }
  }

  if (keyword) {
    queries.push(listKnowledgeResources({ keyword, limit: 8 }));
  }

  if (!queries.length) {
    queries.push(listKnowledgeResources({ limit: 8 }));
  }

  const results = await Promise.all(queries);
  const seen = new Set();

  return results
    .flatMap((result) => result.resources || [])
    .filter((resource) => {
      if (seen.has(resource.id)) return false;
      seen.add(resource.id);
      return true;
    })
    .map((resource) => {
      const haystack = `${resource.name} ${resource.relativePath} ${resource.categoryName} ${resource.integrationModule}`.toLowerCase();
      let score = resource.score || 0;
      for (const keywordItem of [...(intent.keywords || []), ...(intent.resourceKeywords || [])]) {
        if (haystack.includes(keywordItem.toLowerCase())) score += keywordItem.length >= 4 ? 3 : 1;
      }
      if ((intent.knowledgeCategories || []).includes(resource.categoryId)) score += 8;
      if (text.includes(resource.name.toLowerCase())) score += 4;
      return { ...resource, score };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, 6)
    .map(({ score, ...resource }) => resource);
}

function confidenceFor(best, second) {
  if (!best || best.score <= 0) return 0.24;
  const gap = Math.max(0, best.score - (second?.score || 0));
  return Math.max(0.35, Math.min(0.98, 0.48 + best.score * 0.11 + gap * 0.05));
}

function buildSummary(intent, calculator, matched) {
  const lead = matched.length ? `识别到 ${matched.slice(0, 3).join('、')}。` : '识别到的是通用试验工程场景。';
  const calcPart = calculator ? `优先打开 ${calculator.label} 计算器。` : '先补齐场景和原始数据。';
  return `${lead}${calcPart}`;
}

function buildAnswer(intent, calculator) {
  if (calculator) {
    return `${intent.label}，建议先走 ${calculator.label}。`;
  }
  return `${intent.label}，先确认数据格式和目标结果。`;
}

export async function analyzeEngineerQuery(message) {
  const text = normalizeText(message);
  const [catalog, resources] = await Promise.all([getOpenSourceProjects(), listResources()]);
  const scored = INTENTS.map((intent) => scoreIntent(text, intent)).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'zh-Hans-CN'));
  const best = scored[0] && scored[0].score > 0 ? scored[0] : DEFAULT_INTENT;
  const second = scored[1];
  const calculatorId = inferCalculator(text, best);
  const calculator = CALCULATORS.find((item) => item.id === calculatorId) || null;

  const [recommendedProjects, recommendedResources, recommendedKnowledge] = await Promise.all([
    Promise.resolve(rankProjects(catalog, best, text)),
    Promise.resolve(rankResources(resources, best, text)),
    rankKnowledgeResources(best, text)
  ]);

  const confidence = confidenceFor(best, second);

  return {
    intentId: best.id,
    intentLabel: best.label,
    confidence: Number(confidence.toFixed(2)),
    summary: buildSummary(best, calculator, best.matched || []),
    answer: buildAnswer(best, calculator),
    calculator,
    suggestedView: best.view || 'resources',
    nextSteps: best.steps,
    clarifyingQuestions: best.score > 0 ? [] : DEFAULT_INTENT.questions,
    followUpQuestions: best.score > 0 && confidence < 0.58 ? best.questions : [],
    matchedKeywords: best.matched || [],
    recommendedProjects,
    recommendedResources,
    recommendedKnowledge,
    sourceHints: {
      openSourceCategories: best.projectCategories,
      knowledgeCategories: best.knowledgeCategories || [],
      calculator: calculator?.id || null
    }
  };
}
