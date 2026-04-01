'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiBuilderDialog } from '@/components/ai-builder/AiBuilderDialog';

const STEPS = ['Details', 'Audience', 'Content', 'Schedule', 'Review'];

export default function NewCampaignPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);

  const { data: lists } = useQuery({
    queryKey: ['lists', orgId],
    queryFn: () => api.lists.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates', orgId],
    queryFn: () => api.templates.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.campaigns.create(data),
    onSuccess: (res) => router.push(`/campaigns/${res.data.id}`),
  });

  const { register, handleSubmit, getValues, formState: { errors } } = useForm();

  const handleNext = () => {
    const values = getValues();
    setFormData((prev) => ({ ...prev, ...values }));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSendNow = () => {
    const data = { ...formData, htmlContent, listIds: selectedListIds };
    createMutation.mutate(data);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">New Campaign</h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              i < step ? 'bg-green-600 text-white' : i === step ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500',
            )}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-sm', i === step ? 'font-medium text-slate-900' : 'text-slate-500')}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Details */}
          {step === 0 && (
            <div className="space-y-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <div className="space-y-1">
                <Label>Campaign name</Label>
                <Input placeholder="e.g. March Newsletter" {...register('name', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Subject line</Label>
                <Input placeholder="e.g. Exciting news for you! 🎉" {...register('subject', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>From name</Label>
                  <Input placeholder="Jane at Acme" {...register('fromName', { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label>From email</Label>
                  <Input type="email" placeholder="jane@acme.com" {...register('fromEmail', { required: true })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Preview text <span className="text-slate-400">(optional)</span></Label>
                <Input placeholder="A short preview shown in the inbox..." {...register('previewText')} />
              </div>
            </div>
          )}

          {/* Step 1: Audience */}
          {step === 1 && (
            <div className="space-y-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Select Audience</CardTitle>
              </CardHeader>
              <p className="text-sm text-slate-500">Choose which lists to send this campaign to.</p>
              {(lists as {id: string; name: string; _count?: {contacts: number}}[])?.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors',
                    selectedListIds.includes(list.id) ? 'border-primary bg-primary/5' : 'hover:bg-slate-50',
                  )}
                  onClick={() => setSelectedListIds((prev) =>
                    prev.includes(list.id) ? prev.filter((id) => id !== list.id) : [...prev, list.id],
                  )}
                >
                  <div>
                    <p className="font-medium">{list.name}</p>
                    <p className="text-sm text-slate-500">{list._count?.contacts || 0} contacts</p>
                  </div>
                  {selectedListIds.includes(list.id) && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Content */}
          {step === 2 && (
            <div className="space-y-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Paste your HTML content or choose a template below.</p>
                <Button variant="outline" size="sm" onClick={() => setAiBuilderOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />Generate with AI
                </Button>
              </div>
              <AiBuilderDialog
                open={aiBuilderOpen}
                onOpenChange={setAiBuilderOpen}
                onAccept={(html) => setHtmlContent(html)}
                orgId={orgId}
              />
              <div className="space-y-1">
                <Label>HTML Content</Label>
                <textarea
                  className="w-full h-64 border border-input rounded-md p-3 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="<html><body><h1>Hello {{firstName}}!</h1>...</body></html>"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                />
              </div>
              {(templates as {id: string; name: string; htmlContent: string}[])?.length > 0 && (
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">Or pick from a template:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(templates as {id: string; name: string; htmlContent: string}[])?.slice(0, 4).map((t) => (
                      <div key={t.id} className="border rounded-lg p-3 cursor-pointer hover:border-primary" onClick={() => setHtmlContent(t.htmlContent)}>
                        <p className="text-sm font-medium">{t.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="space-y-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle>When to Send</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">Send immediately</h4>
                  <p className="text-sm text-slate-500">Your campaign will start sending as soon as you confirm.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Review & Launch</CardTitle>
              </CardHeader>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Campaign name:</span><span className="font-medium">{formData.name as string}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Subject:</span><span className="font-medium">{formData.subject as string}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">From:</span><span className="font-medium">{formData.fromName as string} &lt;{formData.fromEmail as string}&gt;</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Lists:</span><span className="font-medium">{selectedListIds.length} selected</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Has content:</span><Badge variant={htmlContent ? 'success' : 'destructive'}>{htmlContent ? 'Yes' : 'No'}</Badge></div>
              </div>
              {!htmlContent && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  Please add email content in the previous step before launching.
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button
                onClick={handleSendNow}
                disabled={createMutation.isPending || !htmlContent}
              >
                {createMutation.isPending ? 'Launching...' : 'Launch Campaign'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
