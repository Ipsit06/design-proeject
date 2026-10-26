import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Filter, AlertCircle, RefreshCw, Volume2, Copy, Bot, Layers } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { SourceBadge, Badge } from '../components/ui/Badge.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { historyApi } from '../services/historyApi.js';
import { copyToClipboard } from '../lib/clipboard.js';
import { speakText } from '../lib/speech.js';
import type { HistoryRecord } from '@signbridge/shared';

export const History: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'live' | 'demo' | 'experimental'>('all');
  const [offset, setOffset] = useState(0);
  const limit = 15;

  // Modals & Actions
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setOffset(0);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadHistory = useCallback(
    async (currentOffset = 0, append = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await historyApi.list({
          q: debouncedQuery,
          source: sourceFilter,
          limit,
          offset: currentOffset,
        });

        if (append) {
          setRecords((prev) => [...prev, ...response.items]);
        } else {
          setRecords(response.items);
        }
        setTotal(response.total);
      } catch (err: any) {
        console.error('[History] Fetch failed:', err);
        setError(err.message || 'Failed to load translation history.');
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedQuery, sourceFilter]
  );

  useEffect(() => {
    loadHistory(0, false);
  }, [loadHistory]);

  const handleLoadMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    loadHistory(nextOffset, true);
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await historyApi.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast('Record deleted', { type: 'success' });
    } catch {
      showToast('Delete failed', {
        type: 'error',
        message: 'Could not delete history record.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await historyApi.clearAll();
      setRecords([]);
      setTotal(0);
      setIsClearModalOpen(false);
      showToast('All history cleared', { type: 'success' });
    } catch {
      showToast('Clear failed', {
        type: 'error',
        message: 'Could not clear history records.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Translation History"
        description="Persistent repository of sign sequences, interpreted sentences, model identifiers, and recognition scores."
        actions={
          records.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearModalOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4 text-status-error" />}
            >
              Clear all history
            </Button>
          )
        }
      />

      {/* Search and Filters Bar */}
      <Card padding="sm" className="border-line flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sign, token, or sentence..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-btn border border-line bg-page text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-ink-muted" />
          <span className="text-xs font-medium text-ink-secondary">Filter:</span>
          <div className="flex border border-line rounded-btn overflow-hidden bg-page text-xs font-medium">
            {(['all', 'live', 'demo', 'experimental'] as const).map((source) => (
              <button
                key={source}
                onClick={() => {
                  setSourceFilter(source);
                  setOffset(0);
                }}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  sourceFilter === source
                    ? 'bg-forest text-white font-semibold'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-status-error/30 bg-status-errorBg/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-status-error">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadHistory(0, false)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* History Records Table / List */}
      <Card padding="none" className="border-line divide-y divide-line overflow-hidden shadow-card">
        {records.length > 0 ? (
          records.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-page/40 transition-colors"
            >
              <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-ink">&ldquo;{item.text}&rdquo;</span>
                  <SourceBadge source={item.source as any} />
                  {item.aiAssisted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest bg-sage px-2 py-0.5 rounded-full border border-forest/20">
                      <Bot className="w-3 h-3 text-forest" />
                      AI Assisted
                    </span>
                  )}
                  {item.recognitionModel && (
                    <span className="text-[10px] font-mono text-ink-muted bg-page px-1.5 py-0.5 rounded border border-line">
                      {item.recognitionModel}
                    </span>
                  )}
                </div>

                {/* Tokens sequence display */}
                {item.tokens && item.tokens.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-ink-muted font-medium">Tokens:</span>
                    {item.tokens.map((token, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[11px] font-mono bg-page px-1.5 py-0.5 rounded border border-line text-ink-secondary"
                      >
                        {token.replace(/^ASL_/, '')}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                  <span>
                    Primary Sign:{' '}
                    <strong className="font-semibold text-ink">
                      {item.category.replace(/^ASL_/, '').replace(/_/g, ' ')}
                    </strong>
                  </span>
                  {item.score !== null && (
                    <span>
                      Confidence:{' '}
                      <strong className="font-semibold text-forest">
                        {(item.score * 100).toFixed(1)}%
                      </strong>
                    </span>
                  )}
                  <span>
                    Recorded:{' '}
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => {
                    copyToClipboard(item.text);
                    showToast('Copied to clipboard', { type: 'success' });
                  }}
                  className="p-1.5 rounded hover:bg-page text-ink-secondary hover:text-ink transition-colors"
                  title="Copy sentence"
                  aria-label="Copy sentence"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => speakText(item.text)}
                  className="p-1.5 rounded hover:bg-page text-ink-secondary hover:text-ink transition-colors"
                  title="Speak sentence"
                  aria-label="Speak sentence"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  disabled={deletingId === item.id}
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 rounded hover:bg-status-errorBg text-ink-muted hover:text-status-error transition-colors disabled:opacity-50"
                  title="Delete record"
                  aria-label="Delete this translation record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : !isLoading ? (
          <EmptyState
            title="No records found"
            description={
              debouncedQuery
                ? `No translations matching "${debouncedQuery}". Try refining your query.`
                : 'No translations have been saved yet. Use the Live Translator or Demo Mode to record translations.'
            }
          />
        ) : (
          <div className="p-8 text-center text-sm text-ink-muted">
            Loading history records...
          </div>
        )}
      </Card>

      {/* Pagination / Load More */}
      {records.length < total && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            isLoading={isLoading}
          >
            Load more ({records.length} of {total})
          </Button>
        </div>
      )}

      {/* Confirmation Dialog for Clear All */}
      <ConfirmDialog
        isOpen={isClearModalOpen}
        title="Clear entire translation history?"
        message="This action will permanently delete all saved translation records from the database. This action cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        isLoading={isClearing}
        onConfirm={handleClearAll}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};

export default History;
