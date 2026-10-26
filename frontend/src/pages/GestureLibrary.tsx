import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Edit2,
  Check,
  ShieldAlert,
  HandMetal,
  Layers,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { GestureStatusBadge, Badge } from '../components/ui/Badge.js';
import { useToast } from '../components/ui/Toast.js';
import { gesturesApi } from '../services/gesturesApi.js';
import type { GestureMapping } from '@signbridge/shared';

type LibraryTab = 'all' | 'asl_vocabulary' | 'generic_gestures' | 'experimental' | 'planned';

export const GestureLibrary: React.FC = () => {
  const { showToast } = useToast();
  const [gestures, setGestures] = useState<GestureMapping[]>([]);
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Editing state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const list = await gesturesApi.getAll();
        setGestures(list);
      } catch (e) {
        console.error('[GestureLibrary] Failed to load gestures:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleStartEdit = (g: GestureMapping) => {
    setEditingCategory(g.category);
    setEditText(g.text);
    setEditEnabled(g.enabled);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    setIsSaving(true);
    try {
      const updated = await gesturesApi.update(editingCategory, {
        text: editText.trim(),
        enabled: editEnabled,
      });

      setGestures((prev) =>
        prev.map((g) => (g.category === editingCategory ? updated : g))
      );
      setEditingCategory(null);
      showToast('Mapping updated', {
        type: 'success',
        message: `Updated mapping for "${editingCategory.replace(/_/g, ' ')}".`,
      });
    } catch {
      showToast('Update failed', {
        type: 'error',
        message: 'Could not update gesture mapping on the backend.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter items by tab
  const filteredGestures = gestures.filter((g) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'asl_vocabulary') {
      return (
        (g.type === 'asl_letter' || g.type === 'asl_word' || g.language === 'ASL') &&
        g.status === 'implemented_tested'
      );
    }
    if (activeTab === 'generic_gestures') {
      return g.type === 'generic_gesture' || (!g.type && !g.category.startsWith('ASL_'));
    }
    if (activeTab === 'experimental') {
      return g.status === 'model_available_unverified';
    }
    if (activeTab === 'planned') {
      return g.status === 'planned';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gesture & Sign Language Library"
        description="Catalog of verified American Sign Language (ASL) vocabulary, generic gesture baselines, and roadmap models."
      />

      {/* Mandatory Accuracy & Linguistic Distinction Disclaimer */}
      <div className="p-4 bg-sage/60 border border-forest/20 rounded-card flex items-start gap-3 text-ink">
        <ShieldAlert className="w-5 h-5 text-forest shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed text-forest/90">
          <p className="font-semibold text-forest mb-0.5">Linguistic Classification Notice</p>
          <p>
            SignBridge is an educational gesture-recognition prototype. Generic hand gestures are not equivalent to complete sign-language vocabulary. Sign meanings vary by language and community, and this prototype does not replace a qualified interpreter.
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <Card padding="sm" className="border-line flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Filter className="w-3.5 h-3.5 text-forest" />
          <span className="font-semibold uppercase tracking-wider">Category Filter:</span>
        </div>

        <div className="flex flex-wrap border border-line rounded-btn overflow-hidden bg-page text-xs font-medium">
          {[
            { id: 'all', label: `All Vocabulary (${gestures.length})` },
            { id: 'asl_vocabulary', label: 'Verified ASL (Tested)' },
            { id: 'generic_gestures', label: 'Generic Gestures' },
            { id: 'experimental', label: 'Experimental' },
            { id: 'planned', label: 'Planned Roadmap' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LibraryTab)}
              className={`px-3 py-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'bg-forest text-white font-semibold'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Vocabulary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGestures.map((g) => {
          const isEditing = editingCategory === g.category;
          const isASL = g.language === 'ASL' || g.category.startsWith('ASL_');

          return (
            <Card
              key={g.category}
              className={`flex flex-col justify-between border-line transition-all duration-150 ${
                !g.enabled ? 'opacity-60 bg-page/50' : 'hover:border-forest/40'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center shrink-0">
                      <HandMetal className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-ink">
                          {g.category.replace(/^ASL_/, '').replace(/_/g, ' ')}
                        </h3>
                        {isASL && (
                          <span className="text-[10px] bg-forest/10 text-forest font-semibold px-1.5 py-0.2 rounded border border-forest/20">
                            ASL
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-ink-muted">
                        model: {g.category}
                      </span>
                    </div>
                  </div>
                  <GestureStatusBadge status={g.status} />
                </div>

                {/* Description */}
                <div className="my-3 space-y-2">
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    <strong className="text-ink font-medium">Kinematic Guide: </strong>
                    {g.description}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                    <span>Language System: <strong>{g.language || 'Universal / Generic'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Translation Mapping Box */}
              <div className="pt-3 border-t border-line mt-2">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Configured Meaning / Output
                </span>

                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-sm font-semibold px-2.5 py-1.5 rounded-btn border border-forest bg-card focus:outline-none focus:ring-1 focus:ring-forest text-ink"
                    />
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editEnabled}
                        onChange={(e) => setEditEnabled(e.target.checked)}
                        className="rounded border-line text-forest focus:ring-forest"
                      />
                      <span>Active in translator</span>
                    </label>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCategory(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSaveEdit}
                        isLoading={isSaving}
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-page p-2.5 rounded-btn border border-line">
                    <p className="text-sm font-bold text-forest truncate mr-2">
                      &ldquo;{g.text}&rdquo;
                    </p>
                    <button
                      onClick={() => handleStartEdit(g)}
                      className="p-1 rounded text-ink-muted hover:text-forest hover:bg-card transition-colors shrink-0"
                      title="Edit translation phrase"
                      aria-label={`Edit translation phrase for ${g.category}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default GestureLibrary;
