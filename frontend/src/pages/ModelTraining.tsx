import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Spinner } from '../components/ui/Spinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { samplesApi } from '../services/samplesApi.js';
import { modelsApi } from '../services/modelsApi.js';
import {
  trainCustomModel,
  type TrainProgress,
} from '../features/training/trainModel.js';
import {
  getActiveModelId,
  setActiveModelId,
  deleteModelFromIndexedDb,
} from '../features/training/modelStore.js';
import type { Sample, TrainedModelMeta } from '@signbridge/shared';
import {
  Brain,
  Play,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Sliders,
  Layers,
  Database,
  Info,
} from 'lucide-react';

export function ModelTraining() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [countsByLabel, setCountsByLabel] = useState<Record<string, number>>({});
  const [trainedModels, setTrainedModels] = useState<TrainedModelMeta[]>([]);
  const [activeModelId, setActiveId] = useState<string | null>(getActiveModelId());
  const [loading, setLoading] = useState(true);

  // Form parameters
  const [modelName, setModelName] = useState('SignBridge_Custom_v1');
  const [epochs, setEpochs] = useState(35);
  const [batchSize, setBatchSize] = useState(16);
  const [applyAugmentation, setApplyAugmentation] = useState(true);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<TrainProgress | null>(null);
  const [epochHistory, setEpochHistory] = useState<TrainProgress[]>([]);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [lastTrainedModel, setLastTrainedModel] = useState<TrainedModelMeta | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sampleRes, modelRes] = await Promise.all([
        samplesApi.list(),
        modelsApi.list(),
      ]);
      setSamples(sampleRes.items);
      setCountsByLabel(sampleRes.countsPerLabel);
      setTrainedModels(modelRes);
      setActiveId(getActiveModelId());
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const labels = Object.keys(countsByLabel).sort();
  const validClasses = labels.filter((l) => countsByLabel[l] >= 10);
  const totalSamples = samples.length;
  const trainingSamples = samples.filter((sample) => validClasses.includes(sample.label));
  const maxSamplesPerClass = 300;
  const trainingSampleCount = validClasses.reduce(
    (total, label) => total + Math.min(countsByLabel[label], maxSamplesPerClass),
    0
  );

  // Imbalance check
  const classCounts = validClasses.map((l) => countsByLabel[l]);
  const minCount = classCounts.length ? Math.min(...classCounts) : 0;
  const maxCount = classCounts.length ? Math.max(...classCounts) : 0;
  const isImbalanced = minCount > 0 && maxCount / minCount > 2.0;

  const handleStartTraining = async () => {
    if (labels.length < 2) {
      setTrainingError('Training requires samples for at least 2 distinct sign/gesture labels.');
      return;
    }

    setTrainingError(null);
    setIsTraining(true);
    setEpochHistory([]);
    setCurrentProgress(null);
    setLastTrainedModel(null);

    try {
      const result = await trainCustomModel(trainingSamples, {
        modelName: modelName.trim() || `SignBridge_Model_${Date.now()}`,
        epochs,
        batchSize,
        maxSamplesPerClass,
        applyAugmentation,
        onProgress: (prog) => {
          setCurrentProgress(prog);
          setEpochHistory((prev) => [...prev, prog]);
        },
      });

      // Register model in backend DB
      const savedModel = await modelsApi.create(result.meta);
      setActiveId(savedModel.id);
      setActiveModelId(savedModel.id);
      setLastTrainedModel(savedModel);
      await loadData();
    } catch (err: any) {
      console.error('Training failed:', err);
      setTrainingError(err.message || 'Model training failed.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleSetActive = (id: string) => {
    setActiveModelId(id);
    setActiveId(id);
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trained model?')) return;
    try {
      await modelsApi.delete(id);
      await deleteModelFromIndexedDb(id);
      await loadData();
      if (activeModelId === id) {
        setActiveId(getActiveModelId());
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" className="text-forest" />
        <p className="text-sm text-ink-secondary">Loading model & dataset telemetry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">In-Browser Model Training</h1>
          <Badge variant="neutral">TensorFlow.js (Client-Side)</Badge>
        </div>
        <p className="text-sm text-ink-secondary mt-1">
          Train a lightweight multi-layer perceptron (MLP) directly on your recorded landmark vectors.
          All training runs privately in your browser without transmitting video or biometric data.
        </p>
      </div>

      {/* Dataset Readiness Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-line bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-ink-secondary font-medium">Total Samples</div>
            <div className="text-xl font-bold text-ink">{totalSamples}</div>
          </div>
        </Card>

        <Card className="p-4 border border-line bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-ink-secondary font-medium">Distinct Classes</div>
            <div className="text-xl font-bold text-ink">{labels.length}</div>
          </div>
        </Card>

        <Card className="p-4 border border-line bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-ink-secondary font-medium">Classes Ready (≥10)</div>
            <div className="text-xl font-bold text-ink">{validClasses.length}</div>
          </div>
        </Card>

        <Card className="p-4 border border-line bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-ink-secondary font-medium">Trained Models</div>
            <div className="text-xl font-bold text-ink">{trainedModels.length}</div>
          </div>
        </Card>
      </div>

      {/* Data warnings if any */}
      {labels.length < 2 && (
        <div className="p-4 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Insufficient sign classes</div>
            <div>
              You currently have samples for {labels.length} class. Please navigate to the{' '}
              <a href="/collect" className="font-bold underline text-amber-900">
                Data Collection
              </a>{' '}
              page and record samples for at least 2 distinct sign labels before training.
            </div>
          </div>
        </div>
      )}

      {isImbalanced && labels.length >= 2 && (
        <div className="p-4 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Class imbalance detected among trainable classes</div>
            <div>
              Trainable classes range from {minCount} to {maxCount} samples. Each class is capped at{' '}
              {maxSamplesPerClass} samples for stable browser training.
            </div>
          </div>
        </div>
      )}

      {/* Training Configuration & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration Form */}
        <Card className="p-6 border border-line bg-card space-y-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-ink font-semibold border-b border-line pb-3">
            <Sliders className="w-4 h-4 text-forest" />
            <span>Training Hyperparameters</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={isTraining}
                className="w-full px-3 py-2 text-sm border border-line rounded-input bg-background focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-ink-secondary mb-1">
                <span>Epochs</span>
                <span className="text-forest font-bold">{epochs}</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                disabled={isTraining}
                className="w-full accent-forest cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-ink-secondary mb-1">
                <span>Batch Size</span>
                <span className="text-forest font-bold">{batchSize}</span>
              </div>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                disabled={isTraining}
                className="w-full px-3 py-2 text-sm border border-line rounded-input bg-background"
              >
                <option value={8}>8</option>
                <option value={16}>16 (Recommended)</option>
                <option value={32}>32</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="aug-toggle"
                checked={applyAugmentation}
                onChange={(e) => setApplyAugmentation(e.target.checked)}
                disabled={isTraining}
                className="w-4 h-4 text-forest accent-forest rounded"
              />
              <label htmlFor="aug-toggle" className="text-xs text-ink font-medium cursor-pointer">
                Apply Data Augmentation (jitter, rotation, scale)
              </label>
            </div>

            <div className="p-3 rounded-lg bg-surface-alt border border-line text-xs text-ink-secondary space-y-1">
              <div className="font-semibold text-ink flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-forest" /> Honest Validation Split
              </div>
              <p>
                80% of samples are assigned to training, 20% held out for validation.
                Validation samples are <strong>never</strong> augmented.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleStartTraining}
              disabled={isTraining || labels.length < 2 || totalSamples < 10}
            >
              {isTraining ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Training (Epoch {currentProgress?.epoch ?? 0}/{epochs})...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Train Custom Model ({trainingSampleCount} samples)</span>
                </>
              )}
            </Button>

            {trainingError && (
              <p className="text-xs text-status-error font-medium">{trainingError}</p>
            )}
          </div>
        </Card>

        {/* Right: Live Training Metrics & Progress Curve */}
        <Card className="p-6 border border-line bg-card lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <Brain className="w-4 h-4 text-forest" />
                <span>Training Telemetry & Curves</span>
              </div>
              {isTraining && (
                <Badge variant="info" className="animate-pulse">
                  Active Epoch {currentProgress?.epoch} / {epochs}
                </Badge>
              )}
            </div>

            {epochHistory.length === 0 && !isTraining && !lastTrainedModel ? (
              <div className="py-12 text-center text-ink-secondary text-sm">
                No active training session. Configure parameters and click "Train Custom Model".
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metric Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-surface-alt rounded-lg border border-line">
                    <div className="text-[11px] text-ink-secondary font-medium">Train Loss</div>
                    <div className="text-lg font-bold text-ink font-mono">
                      {currentProgress?.loss ? currentProgress.loss.toFixed(4) : '-'}
                    </div>
                  </div>
                  <div className="p-3 bg-surface-alt rounded-lg border border-line">
                    <div className="text-[11px] text-ink-secondary font-medium">Train Accuracy</div>
                    <div className="text-lg font-bold text-forest font-mono">
                      {currentProgress?.accuracy
                        ? `${(currentProgress.accuracy * 100).toFixed(1)}%`
                        : '-'}
                    </div>
                  </div>
                  <div className="p-3 bg-surface-alt rounded-lg border border-line">
                    <div className="text-[11px] text-ink-secondary font-medium">Val Loss</div>
                    <div className="text-lg font-bold text-ink font-mono">
                      {currentProgress?.valLoss !== undefined
                        ? currentProgress.valLoss.toFixed(4)
                        : '-'}
                    </div>
                  </div>
                  <div className="p-3 bg-surface-alt rounded-lg border border-line">
                    <div className="text-[11px] text-ink-secondary font-medium">Val Accuracy</div>
                    <div className="text-lg font-bold text-forest font-mono">
                      {currentProgress?.valAccuracy !== undefined
                        ? `${(currentProgress.valAccuracy * 100).toFixed(1)}%`
                        : '-'}
                    </div>
                  </div>
                </div>

                {/* SVG Curves */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-ink-secondary">
                    <span>Validation Accuracy over Epochs</span>
                    <span className="font-mono">
                      {epochHistory.length > 0
                        ? `${((epochHistory[epochHistory.length - 1].valAccuracy ?? 0) * 100).toFixed(1)}%`
                        : ''}
                    </span>
                  </div>
                  <div className="h-32 w-full bg-background border border-line rounded-lg p-2 relative overflow-hidden flex items-end">
                    {/* SVG visualization */}
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="100" y2="25" stroke="#E2E6DF" strokeDasharray="2" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#E2E6DF" strokeDasharray="2" />
                      <line x1="0" y1="75" x2="100" y2="75" stroke="#E2E6DF" strokeDasharray="2" />

                      {/* Polyline for Accuracy */}
                      {epochHistory.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="#28674F"
                          strokeWidth="2.5"
                          points={epochHistory
                            .map((p, i) => {
                              const x = (i / (epochs - 1)) * 100;
                              const acc = p.valAccuracy ?? p.accuracy ?? 0;
                              const y = 100 - acc * 100;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}
                    </svg>
                  </div>
                </div>

                {/* Success alert with real held-out metrics */}
                {lastTrainedModel && (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Model "{lastTrainedModel.name}" Trained & Saved to IndexedDB!
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-emerald-800">
                      <div>
                        Computed Validation Accuracy:{' '}
                        <strong>
                          {((lastTrainedModel.metrics?.valAccuracy ?? 0) * 100).toFixed(1)}%
                        </strong>
                      </div>
                      <div>
                        Validation Loss:{' '}
                        <strong>{lastTrainedModel.metrics?.valLoss?.toFixed(4)}</strong>
                      </div>
                      <div>
                        Labels Included: <strong>{lastTrainedModel.labels.join(', ')}</strong>
                      </div>
                      <div>
                        Total Training Samples: <strong>{lastTrainedModel.sampleCount}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Trained Models List */}
      <Card className="p-6 border border-line bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">Saved Models</h2>
            <Badge variant="neutral">{trainedModels.length} Models</Badge>
          </div>
        </div>

        {trainedModels.length === 0 ? (
          <EmptyState
            title="No trained models yet"
            description="Collect samples for at least 2 gestures and trigger training above to create your first custom model."
          />
        ) : (
          <div className="divide-y divide-line">
            {trainedModels.map((m) => {
              const isActive = activeModelId === m.id;
              const valAcc = m.metrics?.valAccuracy !== undefined
                ? `${(m.metrics.valAccuracy * 100).toFixed(1)}%`
                : 'N/A';

              return (
                <div key={m.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">{m.name}</span>
                      {isActive ? (
                        <Badge variant="success">Active Translator Model</Badge>
                      ) : (
                        <Badge variant="neutral">Stored</Badge>
                      )}
                    </div>
                    <div className="text-xs text-ink-secondary flex flex-wrap gap-x-4 gap-y-1">
                      <span>Trained: {new Date(m.trainedAt).toLocaleDateString()}</span>
                      <span>Classes: {m.labels.join(', ')}</span>
                      <span>
                        Real Val Accuracy: <strong className="text-forest">{valAcc}</strong>
                      </span>
                      <span>Samples: {m.sampleCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSetActive(m.id)}
                      >
                        Set as Active
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteModel(m.id)}
                      className="text-status-error hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default ModelTraining;
