import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import app from '../server.js';

test('health endpoint is available', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.ok, true);
});

test('admin can login and read resources', async () => {
  const agent = request.agent(app);
  const login = await agent.post('/api/login').send({ username: 'admin', password: 'admin123' }).expect(200);
  assert.equal(login.body.user.role, 'admin');

  const resources = await agent.get('/api/resources').expect(200);
  assert.ok(Array.isArray(resources.body.resources));

  const knowledge = await agent.get('/api/knowledge/resources?category=sampling&limit=5').expect(200);
  assert.ok(knowledge.body.total >= 1);
  assert.ok(knowledge.body.resources.every((resource) => resource.categoryId === 'sampling'));
});

test('authenticated users can run calculation modules', async () => {
  const agent = request.agent(app);
  await agent.post('/api/login').send({ username: 'admin', password: 'admin123' }).expect(200);

  const sieve = await agent
    .post('/api/calculations/sieve')
    .send({
      dryMass: 2000,
      wetMass: 2100,
      washedMass: 1900,
      sieves: [
        { size: 20, retained: 0 },
        { size: 10, retained: 400 },
        { size: 5, retained: 600 }
      ]
    })
    .expect(200);
  assert.equal(sieve.body.result.rows[0].percentPassing, 100);

  const projects = await agent.get('/api/open-source/projects').expect(200);
  assert.ok(projects.body.projects.some((project) => project.name === 'geotech-utils'));
});

test('engineer agent routes testing questions to modules', async () => {
  const agent = request.agent(app);
  await agent.post('/api/login').send({ username: 'admin', password: 'admin123' }).expect(200);

  const compaction = await agent
    .post('/api/agent/engineer')
    .send({ message: '我要做土工击实和压实度计算，推荐哪个表格和模块？' })
    .expect(200);
  assert.equal(compaction.body.result.intentId, 'soil-lab-testing');
  assert.equal(compaction.body.result.calculator.id, 'moistureDensity');

  const ags = await agent.post('/api/agent/engineer').send({ message: '勘察 AGS 和 CPT 文件怎么导入校验？' }).expect(200);
  assert.equal(ags.body.result.intentId, 'site-investigation');
  assert.ok(ags.body.result.recommendedProjects.some((project) => project.name === 'python-ags4'));

  const generic = await agent.post('/api/agent/engineer').send({ message: '帮我看看这个项目怎么开始' }).expect(200);
  assert.equal(generic.body.result.intentId, 'general');

  const sampling = await agent.post('/api/agent/engineer').send({ message: '我要做见证取样和检测试验计划，哪些资料能接进软件？' }).expect(200);
  assert.equal(sampling.body.result.intentId, 'sampling-and-plans');
  assert.ok(sampling.body.result.recommendedKnowledge.length > 0);
});
