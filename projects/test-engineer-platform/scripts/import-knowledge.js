import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_ROOT = 'F:\\IMA知识库上传\\工程检测相关资料合集';
const sourceRoot = path.resolve(process.argv[2] || DEFAULT_SOURCE_ROOT);
const outputPath = path.join(ROOT_DIR, 'data', 'knowledge-resources.json');

const CATEGORY_RULES = [
  {
    id: 'excel-calculators',
    name: 'Excel计算表格',
    module: '自动计算与表格模板库',
    integrationMode: '直接接入下载、公式抽取和在线计算器复刻',
    recommendedUse: '优先把高频表格转成在线计算器，保留原表作为可下载模板。',
    keywords: ['excel', '计算表格', '计算', '自动', 'xls', 'xlsx', '配合比', '压实度', '筛分', '击实', '含水率']
  },
  {
    id: 'sampling',
    name: '见证取样与送检',
    module: '取样送检助手',
    integrationMode: '抽取材料、批量、频次、样品数量和送检清单规则',
    recommendedUse: '适合做材料进场取样提醒、送检清单、见证记录和智能体问答。',
    keywords: ['见证取样', '送检', '取样', '试块', '试件', '材料进场', '取样手册', '送检指南']
  },
  {
    id: 'test-plan',
    name: '检测试验计划',
    module: '试验计划编制器',
    integrationMode: '抽取检验批划分、检测项目、频次和计划模板',
    recommendedUse: '适合生成项目检测试验计划、频次表、委托任务和审核节点。',
    keywords: ['试验方案', '检测试验计划', '检测计划', '检验批划分', '施工检测试验计划', '方案']
  },
  {
    id: 'report-templates',
    name: '报告格式与台账',
    module: '报告模板与台账中心',
    integrationMode: '抽取报告字段、封面目录、结论格式和台账字段',
    recommendedUse: '适合做报告自动生成、报告审核清单、台账字段和归档模板。',
    keywords: ['报告格式', '编写指南', '检验检测报告', '报告', '台账', '附册', '台长']
  },
  {
    id: 'sop-training',
    name: '作业指导与培训',
    module: 'SOP与培训知识库',
    integrationMode: '拆成作业步骤、注意事项、仪器要求和培训卡片',
    recommendedUse: '适合支撑智能体作业指导、培训检索和新员工操作提示。',
    keywords: ['作业指导书', '培训', '讲义', '实训', '操作', '施工步骤', '技术管理', '方法']
  },
  {
    id: 'inspection-evaluation',
    name: '检测评估与实测实量',
    module: '检查评分与问题库',
    integrationMode: '抽取检查项、扣分项、问题描述和整改建议',
    recommendedUse: '适合做第三方检测评估、飞检、实测实量和问题闭环。',
    keywords: ['第三方检测评估', '实测实量', '飞行检测', '检查标准', '问题展示', '质量提升', '评估']
  },
  {
    id: 'material-testing',
    name: '材料与专项检测',
    module: '材料检测知识库',
    integrationMode: '按材料类型沉淀检测项目、取样要求、结果判定和报告模板',
    recommendedUse: '适合按钢筋、混凝土、水泥、砂石、沥青、桩基、钢结构等专题调用。',
    keywords: ['钢筋', '混凝土', '水泥', '砖', '砂石', '砂浆', '沥青', '土工', '桩基', '钢结构', '节能', '机电安装', '幕墙', '消防', '回弹法']
  },
  {
    id: 'standards',
    name: '标准规范与指南',
    module: '标准规范检索库',
    integrationMode: '建立文件级索引，后续可做条文检索和引用来源',
    recommendedUse: '适合做标准检索、引用依据、智能体出处提示，暂不建议直接改写为业务逻辑。',
    keywords: ['标准', '规范', '规程', '指南', '指引', 'JGJ', 'GB', 'JTG', 'DB', '2000+']
  },
  {
    id: 'general',
    name: '通用资料',
    module: '工程检测资料库',
    integrationMode: '先按文件索引检索，后续根据使用频次再结构化',
    recommendedUse: '适合作为智能体检索素材和人工查阅资料。',
    keywords: []
  }
];

const EXTENSION_LABELS = {
  pdf: 'PDF',
  doc: 'Word',
  docx: 'Word',
  ppt: 'PPT',
  pptx: 'PPT',
  xls: 'Excel',
  xlsx: 'Excel',
  jpg: 'Image',
  jpeg: 'Image',
  png: 'Image',
  txt: 'Text',
  zip: 'Archive'
};

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);
}

function scoreCategory(rule, text, extension) {
  let score = 0;
  const matched = [];

  if (rule.id === 'excel-calculators' && ['xls', 'xlsx', 'xlsm'].includes(extension)) {
    score += 8;
    matched.push(extension);
  }

  for (const keyword of rule.keywords) {
    if (text.includes(normalizeText(keyword))) {
      score += keyword.length >= 4 ? 3 : 2;
      matched.push(keyword);
    }
  }

  return { score, matched };
}

function inferCategory(relativePath, extension) {
  const text = normalizeText(relativePath);
  let best = { rule: CATEGORY_RULES[CATEGORY_RULES.length - 1], score: 0, matched: [] };

  for (const rule of CATEGORY_RULES.slice(0, -1)) {
    const result = scoreCategory(rule, text, extension);
    if (result.score > best.score) {
      best = { rule, ...result };
    }
  }

  return best;
}

function inferPriority(categoryId, relativePath, extension) {
  const recent = /202[4-9]/.test(relativePath);
  if (['xls', 'xlsx', 'xlsm'].includes(extension)) return 'high';
  if (['sampling', 'test-plan', 'report-templates'].includes(categoryId)) return 'high';
  if (recent && ['material-testing', 'sop-training', 'inspection-evaluation'].includes(categoryId)) return 'high';
  if (['material-testing', 'sop-training', 'inspection-evaluation'].includes(categoryId)) return 'medium';
  if (categoryId === 'standards') return 'reference';
  return 'medium';
}

function scoreResource(categoryId, priority, extension, relativePath) {
  let score = 10;
  if (priority === 'high') score += 20;
  if (priority === 'medium') score += 10;
  if (['xls', 'xlsx', 'xlsm'].includes(extension)) score += 12;
  if (/202[4-9]/.test(relativePath)) score += 5;
  if (categoryId === 'general') score -= 5;
  return score;
}

async function walkDirectory(root, current, collector) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      collector.folderCount += 1;
      await walkDirectory(root, absolutePath, collector);
      continue;
    }

    if (!entry.isFile()) continue;

    const stat = await fs.stat(absolutePath);
    const relativePath = normalizePath(path.relative(root, absolutePath));
    const extension = path.extname(entry.name).replace(/^\./, '').toLowerCase() || 'file';
    const category = inferCategory(relativePath, extension);
    const priority = inferPriority(category.rule.id, relativePath, extension);
    const tags = [...new Set(category.matched)].slice(0, 8);

    collector.files.push({
      id: sha1(relativePath),
      name: entry.name,
      relativePath,
      extension,
      fileType: EXTENSION_LABELS[extension] || extension.toUpperCase(),
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      categoryId: category.rule.id,
      categoryName: category.rule.name,
      integrationModule: category.rule.module,
      integrationMode: category.rule.integrationMode,
      recommendedUse: category.rule.recommendedUse,
      priority,
      tags,
      score: scoreResource(category.rule.id, priority, extension, relativePath)
    });
  }
}

function countBy(resources, key) {
  return resources.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function bytesByCategory(resources) {
  return resources.reduce((acc, item) => {
    acc[item.categoryId] = (acc[item.categoryId] || 0) + item.size;
    return acc;
  }, {});
}

async function main() {
  await fs.access(sourceRoot);
  const collector = { files: [], folderCount: 0 };
  await walkDirectory(sourceRoot, sourceRoot, collector);

  const resources = collector.files.sort(
    (a, b) => b.score - a.score || a.categoryName.localeCompare(b.categoryName, 'zh-Hans-CN') || a.name.localeCompare(b.name, 'zh-Hans-CN')
  );
  const categoryCounts = countBy(resources, 'categoryId');
  const categoryBytes = bytesByCategory(resources);
  const categories = CATEGORY_RULES.map((rule) => ({
    id: rule.id,
    name: rule.name,
    module: rule.module,
    integrationMode: rule.integrationMode,
    recommendedUse: rule.recommendedUse,
    count: categoryCounts[rule.id] || 0,
    bytes: categoryBytes[rule.id] || 0
  })).filter((category) => category.count > 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceRoot,
    totals: {
      files: resources.length,
      folders: collector.folderCount,
      bytes: resources.reduce((sum, item) => sum + item.size, 0),
      byExtension: countBy(resources, 'extension'),
      byCategory: categoryCounts,
      byPriority: countBy(resources, 'priority')
    },
    categories,
    resources
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Imported ${resources.length} knowledge files from ${sourceRoot}`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
