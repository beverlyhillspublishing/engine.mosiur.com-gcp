'use client';

import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Palette, Sparkles } from 'lucide-react';

interface BrandInfo { companyName?: string; primaryColor?: string; fontFamily?: string; logoUrl?: string; colors: string[] }
interface Props { orgId: string; onGenerated: (html: string) => void }

export function WebsiteMatchTab({ orgId, onGenerated }: Props) {
  const api = orgApi(orgId);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const extractBrand = async () => {
    if (!url) return;
    setIsExtracting(true);
    setError('');
    try {
      const { data } = await api.aiBuilder.extractBrand(url);
      setBrand(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract brand');
    } finally {
      setIsExtracting(false);
    }
  };

  const generate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const { data } = await api.aiBuilder.generate('website', { url, prompt: prompt || undefined });
      onGenerated(data.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Match your brand</h3>
        <p className="text-sm text-slate-500 mt-1">Enter your website URL to extract colors, fonts, and logo — then generate a branded email.</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="https://yourcompany.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && extractBrand()}
          className="flex-1"
        />
        <Button onClick={extractBrand} disabled={!url || isExtracting} variant="outline">
          {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4 mr-2" />}
          {!isExtracting && 'Extract Brand'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {brand && (
        <div className="p-4 border rounded-xl bg-slate-50 space-y-3">
          <div className="flex items-center gap-3">
            {brand.logoUrl && (
              <img src={brand.logoUrl} alt="Logo" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div>
              <p className="font-semibold text-slate-900">{brand.companyName}</p>
              <p className="text-xs text-slate-500">{brand.fontFamily || 'Default font'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Colors:</span>
            {brand.primaryColor && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: brand.primaryColor }} />
                <span className="text-xs font-mono text-slate-600">{brand.primaryColor}</span>
                <span className="text-xs text-slate-400">(primary)</span>
              </div>
            )}
            {brand.colors.filter((c) => c !== brand.primaryColor).slice(0, 3).map((c) => (
              <div key={c} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        </div>
      )}

      {brand && (
        <>
          <div className="space-y-2">
            <Label>Email description <span className="text-slate-400">(optional)</span></Label>
            <textarea
              className="w-full h-24 border border-input rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe the email content... or leave blank to let AI decide based on the website."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <Button onClick={generate} disabled={isGenerating} size="lg">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate Branded Email</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
