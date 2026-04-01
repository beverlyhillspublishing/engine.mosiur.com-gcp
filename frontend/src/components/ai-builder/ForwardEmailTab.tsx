'use client';

import { useState, useEffect, useRef } from 'react';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Copy, CheckCircle2, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { orgId: string; onGenerated: (html: string) => void }

type State = 'idle' | 'creating' | 'waiting' | 'received' | 'expired';

export function ForwardEmailTab({ orgId, onGenerated }: Props) {
  const api = orgApi(orgId);
  const [state, setState] = useState<State>('idle');
  const [address, setAddress] = useState('');
  const [inboxId, setInboxId] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [receivedHtml, setReceivedHtml] = useState('');
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervals = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  };

  useEffect(() => () => clearIntervals(), []);

  const createInbox = async () => {
    setState('creating');
    clearIntervals();
    try {
      const { data } = await api.aiBuilder.createInbox();
      setAddress(data.address);
      setInboxId(data.id);
      setExpiresAt(new Date(data.expiresAt));
      setTimeLeft(600);
      setState('waiting');

      // Start countdown
      countdownInterval.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearIntervals();
            setState('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling every 3s
      pollInterval.current = setInterval(async () => {
        try {
          const { data: pollData } = await api.aiBuilder.pollInbox(data.id);
          if (pollData.status === 'received' && pollData.html) {
            clearIntervals();
            setReceivedHtml(pollData.html);
            setState('received');
          } else if (pollData.status === 'expired') {
            clearIntervals();
            setState('expired');
          }
        } catch {}
      }, 3000);
    } catch {
      setState('idle');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Forward Email to Import</h3>
        <p className="text-sm text-slate-500 mt-1">Get a unique import address. Forward any email to it and it will appear here automatically.</p>
      </div>

      {state === 'idle' && (
        <div className="text-center py-8">
          <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">Generate a temporary import address</p>
          <Button onClick={createInbox} size="lg">
            <Mail className="w-4 h-4 mr-2" />Generate Address
          </Button>
        </div>
      )}

      {state === 'creating' && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Creating your import address...</p>
        </div>
      )}

      {(state === 'waiting' || state === 'received' || state === 'expired') && (
        <div className="space-y-4">
          {/* Address display */}
          <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Your import address</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-base font-mono text-slate-900 font-semibold truncate">{address}</code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <><CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />Copied!</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
              </Button>
            </div>
          </div>

          {state === 'waiting' && (
            <>
              {/* Animated waiting state */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <div className="relative">
                  <Mail className="w-8 h-8 text-blue-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Waiting for your email...</p>
                  <p className="text-sm text-blue-600 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />{formatTime(timeLeft)} remaining
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 border rounded-xl bg-white space-y-2">
                <p className="text-sm font-medium text-slate-700">How to import:</p>
                <ol className="space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>Open your email client</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>Find the email you want to import</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>Forward it to the address above</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>This page will update automatically</li>
                </ol>
              </div>
            </>
          )}

          {state === 'received' && receivedHtml && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="font-medium text-green-800">Email received!</p>
              </div>
              <div className="border rounded-xl overflow-hidden h-48">
                <iframe sandbox="allow-same-origin" srcDoc={receivedHtml} className="w-full h-full border-none" title="Received email" />
              </div>
              <Button onClick={() => onGenerated(receivedHtml)} size="lg">Use This Email</Button>
            </div>
          )}

          {state === 'expired' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="font-medium text-amber-800 mb-2">Address expired</p>
              <p className="text-sm text-amber-600 mb-3">The import address has expired. Generate a new one.</p>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={createInbox} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />Generate New Address
          </Button>
        </div>
      )}
    </div>
  );
}
