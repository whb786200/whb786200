import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const KNOWLEDGE_INDEX_PATH = path.join(ROOT_DIR, 'data', 'knowledge-resources.json');

const EMPTY_INDEX = {
  generatedAt: null,
  sourceRoot: '',
  totals: {
    files: 0,
    folders: 0,
    bytes: 0,
    byExtension: {},
    byCategory: {},
    byPriority: {}
  },
  categories: [],
  resources: []
};

async function readKnowledgeIndex() {
  try {
    const content = await fs.readFile(KNOWLEDGE_INDEX_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return EMPTY_INDEX;
    throw error;
  }
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesKeyword(resource, keyword) {
  if (!keyword) return true;
  const tokens = keyword.split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalize(
    [
      resource.name,
      resource.relativePath,
      resource.categoryName,
      resource.integrationModule,
      resource.integrationMode,
      resource.recommendedUse,
      ...(resource.tags || [])
    ].join(' ')
  );
  return tokens.some((token) => haystack.includes(token));
}

export async function getKnowledgeIndex() {
  return readKnowledgeIndex();
}

export async function listKnowledgeResources({ keyword = '', category = '', priority = '', extension = '', limit = 200 } = {}) {
  const index = await readKnowledgeIndex();
  const keywordValue = normalize(keyword);
  const extensionValue = normalize(extension).replace(/^\./, '');
  const limitValue = Math.max(1, Math.min(Number(limit) || 200, 1000));

  const filtered = index.resources
    .filter((resource) => {
      const matchesCategory = !category || resource.categoryId === category;
      const matchesPriority = !priority || resource.priority === priority;
      const matchesExtension = !extensionValue || resource.extension === extensionValue;
      return matchesCategory && matchesPriority && matchesExtension && matchesKeyword(resource, keywordValue);
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0) || a.name.localeCompare(b.name, 'zh-Hans-CN'));

  return {
    generatedAt: index.generatedAt,
    sourceRoot: index.sourceRoot,
    totals: index.totals,
    categories: index.categories,
    total: index.resources.length,
    filteredTotal: filtered.length,
    resources: filtered.slice(0, limitValue)
  };
}

export async function getKnowledgeSummary() {
  const index = await readKnowledgeIndex();
  return {
    generatedAt: index.generatedAt,
    sourceRoot: index.sourceRoot,
    totals: index.totals,
    categories: index.categories
  };
}
