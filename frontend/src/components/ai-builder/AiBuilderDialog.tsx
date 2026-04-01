'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageSquare, Globe, Palette, ImageIcon, Mail, Code, Eye } from 'lucide-react';
import { PromptTab } from './PromptTab';
import { ImportUrlTab } from './ImportUrlTab';
import { WebsiteMatchTab } from './WebsiteMatchTab';
import { ScreenshotTab } from './ScreenshotTab';
import { ForwardEmailTab } from './ForwardEmailTab';

interface AiBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (html: string) => void;
  orgId: string;
}

const TABS = [
  { id: 'prompt', label: 'Prompt', icon: MessageSquare, description: 'Describe your email in words' },
  { id: 'url', label: 'Import URL', icon: Globe, description: 'Fetch a URL and convert to email' },
  { id: 'website', label: 'Website Match', icon: Palette, description: 'Match a brand/website style' },
  { id: 'screenshot', label: 'Screenshot', icon: ImageIcon, description: 'Upload a screenshot to recreate' },
  { id: 'forward', label: 'Forward Email', icon: Mail, description: 'Forward a real email to import' },
];

export function AiBuilderDialog({ open, onOpenChange, onAccept, orgId }: AiBuilderDialogProps) {
  const [activeTab, setActiveTab] = useState('prompt');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');

  const handleAccept = () => {
    onAccept(generatedHtml);
    onOpenChange(false);
  };

  const tabProps = {
    orgId,
    onGenerated: (html: string) => setGeneratedHtml(html),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-52 border-r bg-slate-50 flex flex-col p-3">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900 px-2">AI Email Builder</h2>
              <p className="text-xs text-slate-500 px-2 mt-0.5">Powered by Claude AI</p>
            </div>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex items-start gap-2 px-3 py-2.5 rounded-lg text-left transition-colors mb-1',
                  activeTab === tab.id ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700',
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className={cn('text-xs', activeTab === tab.id ? 'text-white/70' : 'text-slate-400')}>{tab.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Right content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'prompt' && <PromptTab {...tabProps} />}
              {activeTab === 'url' && <ImportUrlTab {...tabProps} />}
              {activeTab === 'website' && <WebsiteMatchTab {...tabProps} />}
              {activeTab === 'screenshot' && <ScreenshotTab {...tabProps} />}
              {activeTab === 'forward' && <ForwardEmailTab {...tabProps} />}
            </div>

            {/* Preview + accept bar */}
            {generatedHtml && (
              <div className="border-t bg-white">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Preview</span>
                    <Badge variant="secondary" className="text-xs">Generated</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex border rounded-md overflow-hidden">
                      <button
                        className={cn('px-3 py-1 text-xs flex items-center gap-1', previewMode === 'preview' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                        onClick={() => setPreviewMode('preview')}
                      >
                        <Eye className="w-3 h-3" />Preview
                      </button>
                      <button
                        className={cn('px-3 py-1 text-xs flex items-center gap-1', previewMode === 'code' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                        onClick={() => setPreviewMode('code')}
                      >
                        <Code className="w-3 h-3" />Code
                      </button>
                    </div>
                    <Button size="sm" onClick={handleAccept}>Use This Email</Button>
                  </div>
                </div>
                <div className="h-64 overflow-auto">
                  {previewMode === 'preview' ? (
                    <iframe
                      sandbox="allow-same-origin"
                      srcDoc={generatedHtml}
                      className="w-full h-full border-none"
                      title="Email preview"
                    />
                  ) : (
                    <pre className="p-4 text-xs text-slate-700 bg-slate-50 overflow-auto h-full font-mono whitespace-pre-wrap">{generatedHtml}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
