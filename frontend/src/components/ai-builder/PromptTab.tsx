'use client';

import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'Summer sale announcement with 20% off',
  'Welcome email for new users signing up',
  'Monthly newsletter with latest updates',
  'Product launch announcement',
  'Event invitation with RSVP button',
  'Re-engagement email for inactive subscribers',
];

interface Props { orgId: string; onGenerated: (html: string) => void }

export function PromptTab({ orgId, onGenerated }: Props) {
  const api = orgApi(orgId);
  const [prompt, setPrompt] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError('');
    try {
      const { data } = await api.aiBuilder.generate('prompt', { prompt, brandUrl: brandUrl || undefined });
      onGenerated(data.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Describe your email</h3>
        <p className="text-sm text-slate-500 mt-1">Tell AI what kind of email you need. The more detail, the better.</p>
      </div>

      <div className="space-y-2">
        <Label>What should this email be about?</Label>
        <textarea
          className="w-full h-32 border border-input rounded-md p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="E.g. 'A welcome email for new users who just signed up for our SaaS product. Include the user's first name, a brief intro, 3 key features, and a CTA to complete their profile.'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-600">Quick examples</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              className="px-3 py-1.5 text-xs border rounded-full hover:bg-slate-50 hover:border-primary text-slate-600 transition-colors"
              onClick={() => setPrompt(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Apply branding from URL <span className="text-slate-400">(optional)</span></Label>
        <Input
          placeholder="https://yourcompany.com"
          value={brandUrl}
          onChange={(e) => setBrandUrl(e.target.value)}
        />
        <p className="text-xs text-slate-400">We'll extract colors, font, and logo from your website to apply as email branding.</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <Button onClick={generate} disabled={!prompt.trim() || isGenerating} size="lg">
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" />Generate Email</>
        )}
      </Button>
    </div>
  );
}
