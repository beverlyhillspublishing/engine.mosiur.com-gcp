'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, ImageIcon, Upload, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { orgId: string; onGenerated: (html: string) => void }

export function ScreenshotTab({ orgId, onGenerated }: Props) {
  const api = orgApi(orgId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const generate = async () => {
    if (!file) return;
    setIsGenerating(true);
    setError('');
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await api.aiBuilder.generate('screenshot', { imageBase64: base64, mimeType: file.type });
      onGenerated(data.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPreview('');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Generate from screenshot</h3>
        <p className="text-sm text-slate-500 mt-1">Upload a screenshot of an email or website and AI will recreate it as a responsive email.</p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50',
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Drop a screenshot here or click to select</p>
          <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WebP • Max 10MB</p>
        </div>
      ) : (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="max-h-64 rounded-xl border shadow-sm object-contain" />
          <button
            className="absolute top-2 right-2 w-6 h-6 bg-white border rounded-full flex items-center justify-center shadow hover:bg-red-50"
            onClick={clear}
          >
            <X className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <p className="mt-2 text-sm text-slate-500">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {file && (
        <Button onClick={generate} disabled={isGenerating} size="lg">
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing screenshot...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Generate from Screenshot</>
          )}
        </Button>
      )}
    </div>
  );
}
