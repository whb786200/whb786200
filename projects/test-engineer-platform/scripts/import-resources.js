import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_ZIP = 'F:\\IMA知识库上传\\工程检测相关资料合集\\工程质量检测常用Excel计算表格（139套）.zip';
const zipPath = process.argv[2] || DEFAULT_ZIP;
const outputDir = path.join(ROOT_DIR, 'public', 'resources');
const indexPath = path.join(ROOT_DIR, 'data', 'resources.json');

function sanitizeSegment(value) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCategory(fileName) {
  const rules = [
    ['配合比', '配合比设计'],
    ['沥青', '沥青及混合料'],
    ['击实', '土工击实'],
    ['压实', '压实度检测'],
    ['筛分', '集料筛分'],
    ['水泥', '水泥材料'],
    ['混凝土', '混凝土检测'],
    ['砂浆', '砂浆检测'],
    ['钢筋', '钢筋力学'],
    ['仪器', '仪器设备'],
    ['温湿度', '环境记录'],
    ['标准曲线', '标准曲线'],
    ['EDTA', '灰剂量检测'],
    ['灰', '灰土灰剂量']
  ];
  const hit = rules.find(([keyword]) => fileName.includes(keyword));
  return hit ? hit[1] : '通用表格';
}

function getCost(fileName) {
  if (fileName.includes('规范') || fileName.includes('清单') || fileName.includes('一览表')) return 0;
  if (fileName.includes('配合比') || fileName.includes('自动') || fileName.includes('计算')) return 2;
  return 1;
}

async function main() {
  await fs.access(zipPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.dirname(indexPath), { recursive: true });

  const zip = new AdmZip(zipPath);
  const resources = [];
  const usedNames = new Set();

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const originalName = path.basename(entry.entryName);
    const extension = path.extname(originalName).toLowerCase();
    if (!['.xls', '.xlsx', '.xlsm'].includes(extension)) continue;

    const baseName = sanitizeSegment(path.basename(originalName, extension));
    let fileName = `${baseName}${extension}`;
    let count = 2;
    while (usedNames.has(fileName.toLowerCase())) {
      fileName = `${baseName}-${count}${extension}`;
      count += 1;
    }
    usedNames.add(fileName.toLowerCase());

    const targetPath = path.join(outputDir, fileName);
    await fs.writeFile(targetPath, entry.getData());

    const stat = await fs.stat(targetPath);
    const hash = crypto.createHash('sha1').update(entry.entryName).digest('hex').slice(0, 12);
    resources.push({
      id: hash,
      name: fileName,
      originalPath: entry.entryName,
      path: `resources/${fileName}`,
      extension: extension.slice(1),
      category: inferCategory(fileName),
      cost: getCost(fileName),
      size: stat.size
    });
  }

  resources.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  await fs.writeFile(indexPath, JSON.stringify(resources, null, 2), 'utf8');
  console.log(`已导入 ${resources.length} 个 Excel 表格到 ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
