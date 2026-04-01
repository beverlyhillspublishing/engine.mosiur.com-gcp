'use client';

import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, ArrowRight, Sparkles, Code } from 'lucide-react';

interface Props { orgId: string; onGenerated: (html: string) => void }

export function ImportUrlTab({ orgId, onGenerated }: Props) {
  const api = orgApi(orgId);
  const [url, setUrl] = useState('');
  const [iframeHtml, setIframeHtml] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadUrl = async () => {
    if (!url) return;
    setIsLoading(true);
    setError('');
    setIframeHtml('');
    try {
      const { data } = await api.aiBuilder.fetchUrl(url);
      setIframeHtml(data.html);
      setSiteTitle(data.title);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load URL');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToEmail = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const { data } = await api.aiBuilder.generate('url', { url });
      onGenerated(data.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const useHtmlDirectly = () => {
    if (iframeHtml) onGenerated(iframeHtml);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Import from URL</h3>
        <p className="text-sm text-slate-500 mt-1">Enter a URL to fetch its content and convert to an email.</p>
      </div>

      {/* Browser-style URL bar */}
      <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
        <Globe className="w-4 h-4 text-slate-400 ml-1" />
        <Input
          className="border-none bg-transparent shadow-none focus-visible:ring-0 flex-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
        />
        <Button size="sm" onClick={loadUrl} disabled={!url || isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {/* Mini browser preview */}
      {iframeHtml && (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-500 flex-1 text-center truncate">{siteTitle || url}</span>
          </div>
          <div className="h-64 overflow-hidden">
            <iframe
              sandbox="allow-same-origin"
              srcDoc={iframeHtml}
              className="w-full h-full border-none"
              title="URL preview"
              style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%', height: '133%' }}
            />
          </div>
        </div>
      )}

      {iframeHtml && (
        <div className="flex gap-3">
          <Button onClick={convertToEmail} disabled={isGenerating} className="flex-1">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Converting...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Convert to Email with AI</>
            )}
          </Button>
          <Button variant="outline" onClick={useHtmlDirectly}>
            <Code className="w-4 h-4 mr-2" />Use HTML Directly
          </Button>
        </div>
      )}
    </div>
  );
}
