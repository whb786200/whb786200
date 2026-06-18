import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_PATH = path.resolve(__dirname, '..', 'open-source', 'catalog.json');

export async function getOpenSourceProjects() {
  const content = await fs.readFile(CATALOG_PATH, 'utf8');
  return JSON.parse(content);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function calculateSieveAnalysis(input) {
  const dryMass = toNumber(input.dryMass);
  const wetMass = toNumber(input.wetMass);
  const washedMass = toNumber(input.washedMass);
  const sieves = Array.isArray(input.sieves) ? input.sieves : [];

  if (dryMass <= 0) {
    throw new Error('筛分计算需要填写大于 0 的干样质量。');
  }
  if (!sieves.length) {
    throw new Error('请至少填写一组筛孔和筛余质量。');
  }

  let cumulativeRetained = 0;
  const rows = sieves
    .map((item) => ({
      size: toNumber(item.size),
      retained: toNumber(item.retained)
    }))
    .filter((item) => item.size > 0)
    .sort((a, b) => b.size - a.size)
    .map((item) => {
      cumulativeRetained += item.retained;
      const percentRetained = (item.retained / dryMass) * 100;
      const cumulativePercentRetained = (cumulativeRetained / dryMass) * 100;
      const percentPassing = Math.max(0, 100 - cumulativePercentRetained);
      return {
        size: item.size,
        retained: round(item.retained, 2),
        percentRetained: round(percentRetained, 2),
        cumulativeRetained: round(cumulativeRetained, 2),
        percentPassing: round(percentPassing, 2)
      };
    });

  const lossMass = dryMass - cumulativeRetained;
  const washLossPercent = washedMass > 0 ? ((dryMass - washedMass) / dryMass) * 100 : null;
  const moistureContent = wetMass > dryMass ? ((wetMass - dryMass) / dryMass) * 100 : null;

  return {
    type: 'sieve',
    dryMass: round(dryMass, 2),
    cumulativeRetained: round(cumulativeRetained, 2),
    lossMass: round(lossMass, 2),
    lossPercent: round((lossMass / dryMass) * 100, 2),
    washLossPercent: washLossPercent === null ? null : round(washLossPercent, 2),
    moistureContent: moistureContent === null ? null : round(moistureContent, 2),
    rows
  };
}

export function calculateMoistureDensity(input) {
  const wetSoilMass = toNumber(input.wetSoilMass);
  const drySoilMass = toNumber(input.drySoilMass);
  const ringVolume = toNumber(input.ringVolume);
  const targetMaxDryDensity = toNumber(input.targetMaxDryDensity);

  if (wetSoilMass <= 0 || drySoilMass <= 0 || ringVolume <= 0) {
    throw new Error('湿土质量、干土质量和试模体积都必须大于 0。');
  }
  if (drySoilMass > wetSoilMass) {
    throw new Error('干土质量不能大于湿土质量。');
  }

  const waterMass = wetSoilMass - drySoilMass;
  const moistureContent = (waterMass / drySoilMass) * 100;
  const wetDensity = wetSoilMass / ringVolume;
  const dryDensity = drySoilMass / ringVolume;
  const compactionDegree = targetMaxDryDensity > 0 ? (dryDensity / targetMaxDryDensity) * 100 : null;

  return {
    type: 'moistureDensity',
    waterMass: round(waterMass, 2),
    moistureContent: round(moistureContent, 2),
    wetDensity: round(wetDensity, 3),
    dryDensity: round(dryDensity, 3),
    compactionDegree: compactionDegree === null ? null : round(compactionDegree, 2)
  };
}

export function calculateAtterberg(input) {
  const liquidLimit = toNumber(input.liquidLimit);
  const plasticLimit = toNumber(input.plasticLimit);

  if (liquidLimit <= 0 || plasticLimit <= 0) {
    throw new Error('液限和塑限都必须大于 0。');
  }
  if (plasticLimit >= liquidLimit) {
    throw new Error('塑限应小于液限。');
  }

  const plasticityIndex = liquidLimit - plasticLimit;
  let classification = '低塑性土';
  if (plasticityIndex >= 17) classification = '高塑性土';
  else if (plasticityIndex >= 10) classification = '中塑性土';

  return {
    type: 'atterberg',
    liquidLimit: round(liquidLimit, 2),
    plasticLimit: round(plasticLimit, 2),
    plasticityIndex: round(plasticityIndex, 2),
    liquidityIndex: input.naturalMoisture
      ? round((toNumber(input.naturalMoisture) - plasticLimit) / plasticityIndex, 3)
      : null,
    classification
  };
}

export function estimateConcrete(input) {
  const cement = toNumber(input.cement);
  const flyAsh = toNumber(input.flyAsh);
  const slag = toNumber(input.slag);
  const water = toNumber(input.water);
  const fineAggregate = toNumber(input.fineAggregate);
  const coarseAggregate = toNumber(input.coarseAggregate);
  const admixture = toNumber(input.admixture);
  const ageDays = Math.max(1, toNumber(input.ageDays, 28));

  const binder = cement + flyAsh + slag;
  if (binder <= 0 || water <= 0) {
    throw new Error('胶凝材料和用水量都必须大于 0。');
  }

  const waterBinderRatio = water / binder;
  const supplementaryRatio = (flyAsh + slag) / binder;
  const aggregateTotal = fineAggregate + coarseAggregate;
  const sandRatio = aggregateTotal > 0 ? fineAggregate / aggregateTotal : null;

  const base28dStrength = Math.max(8, 72 - waterBinderRatio * 82 + cement / 35 + slag / 55 - flyAsh / 80);
  const ageFactor = Math.min(1.18, 0.35 + 0.65 * Math.log(ageDays + 1) / Math.log(29));
  const estimatedStrength = base28dStrength * ageFactor;
  const slumpEstimate = Math.max(20, Math.min(240, 320 - waterBinderRatio * 210 + admixture * 8 - supplementaryRatio * 25));
  const gwpEstimate = cement * 0.82 + flyAsh * 0.03 + slag * 0.07 + aggregateTotal * 0.005;

  return {
    type: 'concrete',
    binder: round(binder, 2),
    waterBinderRatio: round(waterBinderRatio, 3),
    supplementaryRatio: round(supplementaryRatio * 100, 2),
    sandRatio: sandRatio === null ? null : round(sandRatio * 100, 2),
    estimatedStrength: round(estimatedStrength, 1),
    slumpEstimate: round(slumpEstimate, 0),
    gwpEstimate: round(gwpEstimate, 1),
    note: '轻量估算用于产品原型。正式预测可接入 SustainableConcrete 的 Python/ML 模型服务。'
  };
}

export function calculateByType(type, input) {
  if (type === 'sieve') return calculateSieveAnalysis(input);
  if (type === 'moistureDensity') return calculateMoistureDensity(input);
  if (type === 'atterberg') return calculateAtterberg(input);
  if (type === 'concrete') return estimateConcrete(input);
  throw new Error('未知计算类型。');
}
