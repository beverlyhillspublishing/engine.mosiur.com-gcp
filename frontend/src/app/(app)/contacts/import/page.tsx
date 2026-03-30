'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle } from 'lucide-react';

export default function ImportPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{created?: number; updated?: number; errors?: number} | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === 'text/csv' || f?.name.endsWith('.csv')) setFile(f);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('columnMapping', JSON.stringify({ email: 'email', firstName: 'first_name', lastName: 'last_name' }));

    try {
      const res = await api.contacts.import(formData);
      const { jobId } = res.data;

      // Poll for status
      const poll = async () => {
        const status = await api.contacts.importStatus(jobId);
        if (status.data.status === 'done') {
          setResult(status.data);
          setLoading(false);
        } else {
          setTimeout(poll, 1000);
        }
      };
      setTimeout(poll, 1000);
    } catch (err) {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Import Complete!</h2>
            <div className="flex justify-center gap-8 mt-6 text-sm">
              <div><span className="text-2xl font-bold text-green-600">{result.created}</span><p className="text-slate-500">Created</p></div>
              <div><span className="text-2xl font-bold text-blue-600">{result.updated}</span><p className="text-slate-500">Updated</p></div>
              <div><span className="text-2xl font-bold text-red-500">{result.errors}</span><p className="text-slate-500">Errors</p></div>
            </div>
            <Button className="mt-8" onClick={() => router.push('/contacts')}>View Contacts</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Import Contacts</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            {file ? (
              <div>
                <FileText className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700">Drop your CSV file here</p>
                <p className="text-sm text-slate-500 mt-1">or click to browse</p>
              </div>
            )}
          </div>
          <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <p className="font-medium text-slate-700 mb-2">Expected CSV columns:</p>
            <code className="text-xs bg-white border rounded px-2 py-1 block">email, first_name, last_name, phone, tags</code>
          </div>

          <Button className="w-full" disabled={!file || loading} onClick={handleImport}>
            {loading ? 'Importing...' : 'Start Import'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
