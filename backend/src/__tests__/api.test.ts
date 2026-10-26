import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('SignBridge REST API Endpoints (v1 + v2)', () => {
  const app = createApp();

  it('GET /api/health should return 200 with status ok and database connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('engine');
    expect(res.body).toHaveProperty('llmConfigured');
  });

  it('GET /api/gestures should return seeded default gestures and ASL vocabulary', async () => {
    const res = await request(app).get('/api/gestures');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/llm/assist should assemble tokens into fluent sentence', async () => {
    const res = await request(app)
      .post('/api/llm/assist')
      .send({
        tokens: ['HELLO', 'THANK_YOU'],
        mode: 'sign_language',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sentence');
    expect(res.body.sentence.toLowerCase()).toContain('hello');
  });

  describe('V2 Samples Endpoints', () => {
    let createdSampleId: string;

    it('POST /api/samples should validate and create a landmark sample', async () => {
      const mockFeatures = new Array(126).fill(0.123);
      const res = await request(app).post('/api/samples').send({
        label: 'ISL_NAMASTE',
        kind: 'static',
        features: mockFeatures,
        handsCount: 2,
        lighting: 'normal',
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.label).toBe('ISL_NAMASTE');
      expect(res.body.handsCount).toBe(2);
      createdSampleId = res.body.id;
    });

    it('POST /api/samples/bulk should save multiple samples and register gesture mapping', async () => {
      const mockFeatures = new Array(126).fill(0.456);
      const res = await request(app).post('/api/samples/bulk').send({
        samples: [
          { label: 'CUSTOM_TEST_A', kind: 'static', features: mockFeatures, handsCount: 1 },
          { label: 'CUSTOM_TEST_B', kind: 'static', features: mockFeatures, handsCount: 1 },
        ],
      });
      expect(res.status).toBe(201);
      expect(res.body.count).toBe(2);

      // Verify custom gesture was registered as custom_unvalidated
      const gesturesRes = await request(app).get('/api/gestures');
      const found = gesturesRes.body.find((g: any) => g.category === 'CUSTOM_TEST_A');
      expect(found).toBeDefined();
      expect(found.status).toBe('custom_unvalidated');
    });

    it('GET /api/samples should list samples with per-label counts', async () => {
      const res = await request(app).get('/api/samples');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('countsPerLabel');
      expect(res.body.countsPerLabel['ISL_NAMASTE']).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/samples/export and POST /api/samples/import', async () => {
      const exportRes = await request(app).get('/api/samples/export');
      expect(exportRes.status).toBe(200);
      expect(exportRes.body).toHaveProperty('samples');
      expect(Array.isArray(exportRes.body.samples)).toBe(true);

      const importRes = await request(app).post('/api/samples/import').send({
        samples: [
          {
            label: 'IMPORTED_SIGN',
            kind: 'static',
            features: new Array(126).fill(0.789),
            handsCount: 1,
          },
        ],
      });
      expect(importRes.status).toBe(201);
      expect(importRes.body.importedCount).toBe(1);
    });

    it('DELETE /api/samples/:id should delete single sample', async () => {
      const res = await request(app).delete(`/api/samples/${createdSampleId}`);
      expect(res.status).toBe(204);
    });

    it('DELETE /api/samples?label= should delete all samples for a label', async () => {
      const res = await request(app).delete('/api/samples?label=CUSTOM_TEST_A');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('deletedCount');
    });
  });

  describe('V2 Models & EvalRuns Endpoints', () => {
    let createdModelId: string;

    it('POST /api/models and GET /api/models', async () => {
      const res = await request(app).post('/api/models').send({
        name: 'ASL 3-Class Prototype',
        kind: 'static_mlp',
        labels: ['HELLO', 'THANK_YOU', 'YES'],
        metrics: {
          accuracy: 0.94,
          valAccuracy: 0.91,
          valLoss: 0.18,
          confusionMatrix: [
            [10, 0, 1],
            [0, 12, 0],
            [1, 0, 11],
          ],
        },
        sampleCount: 60,
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.metrics.valAccuracy).toBe(0.91);
      createdModelId = res.body.id;

      const listRes = await request(app).get('/api/models');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/eval-runs and GET /api/eval-runs', async () => {
      const res = await request(app).post('/api/eval-runs').send({
        modelId: createdModelId,
        condition: 'backlit',
        accuracy: 0.82,
        total: 20,
      });
      expect(res.status).toBe(201);
      expect(res.body.condition).toBe('backlit');

      const listRes = await request(app).get('/api/eval-runs');
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveProperty('byCondition');
      expect(listRes.body.byCondition.backlit.totalRuns).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/stats should return real extended v2 metrics', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('samplesCount');
      expect(res.body).toHaveProperty('modelsCount');
      expect(res.body.modelsCount).toBeGreaterThanOrEqual(1);
      expect(res.body.bestValAccuracy).toBe(0.91);
    });

    it('DELETE /api/models/:id', async () => {
      const res = await request(app).delete(`/api/models/${createdModelId}`);
      expect(res.status).toBe(204);
    });
  });
});
