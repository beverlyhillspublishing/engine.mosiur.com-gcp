'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sheet { name: string; data: (string | number | null)[][] }
interface NumbersContent { sheets: Sheet[] }

const COLS = 26;
const ROWS = 50;

function colLabel(i: number) {
  return String.fromCharCode(65 + i);
}

export default function NumbersEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<NumbersContent>({ sheets: [{ name: 'Sheet 1', data: Array.from({ length: ROWS }, () => Array(COLS).fill(null)) }] });
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: doc } = useQuery({
    queryKey: ['doc', orgId, id],
    queryFn: () => api.docs.get(id).then((r) => r.data),
    enabled: !!orgId && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => api.docs.update(id, data),
    onSuccess: () => setSaved(true),
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      const c = doc.content as NumbersContent;
      setContent(c?.sheets ? c : { sheets: [{ name: 'Sheet 1', data: Array.from({ length: ROWS }, () => Array(COLS).fill(null)) }] });
    }
  }, [doc]);

  const triggerSave = (newTitle: string, newContent: NumbersContent) => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ title: newTitle, content: newContent });
    }, 1000);
  };

  const updateCell = (row: number, col: number, value: string) => {
    const newContent = { ...content };
    const sheet = { ...newContent.sheets[activeSheet] };
    const data = sheet.data.map((r) => [...r]);
    data[row][col] = value === '' ? null : isNaN(Number(value)) ? value : Number(value);
    sheet.data = data;
    newContent.sheets = [...newContent.sheets];
    newContent.sheets[activeSheet] = sheet;
    setContent(newContent);
    triggerSave(title, newContent);
  };

  const addSheet = () => {
    const newContent = { ...content, sheets: [...content.sheets, { name: `Sheet ${content.sheets.length + 1}`, data: Array.from({ length: ROWS }, () => Array(COLS).fill(null)) }] };
    setContent(newContent);
    setActiveSheet(newContent.sheets.length - 1);
    triggerSave(title, newContent);
  };

  const currentSheet = content.sheets[activeSheet] || content.sheets[0];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b">
        <Button variant="ghost" size="sm" onClick={() => router.push('/documents')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); triggerSave(e.target.value, content); }}
          className="border-none shadow-none focus-visible:ring-0 font-semibold text-lg w-64"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-1 flex-1">
          {selectedCell && (
            <Input
              className="w-64 h-7 text-sm"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => selectedCell && updateCell(selectedCell.row, selectedCell.col, editValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedCell) {
                  updateCell(selectedCell.row, selectedCell.col, editValue);
                  setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
                }
              }}
              placeholder={selectedCell ? `${colLabel(selectedCell.col)}${selectedCell.row + 1}` : ''}
            />
          )}
        </div>
        <div className="text-sm text-slate-400">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <span className="flex items-center gap-1"><Save className="w-3.5 h-3.5" />Saved</span> : null}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr>
              <th className="w-10 h-7 border border-slate-200 bg-slate-100" />
              {Array.from({ length: COLS }, (_, i) => (
                <th key={i} className="w-24 h-7 border border-slate-200 text-xs text-slate-500 font-medium text-center bg-slate-100">
                  {colLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, row) => (
              <tr key={row}>
                <td className="w-10 h-6 border border-slate-200 text-xs text-slate-400 text-center bg-slate-50 font-medium sticky left-0">
                  {row + 1}
                </td>
                {Array.from({ length: COLS }, (_, col) => {
                  const cellVal = currentSheet.data[row]?.[col];
                  const isSelected = selectedCell?.row === row && selectedCell?.col === col;
                  return (
                    <td
                      key={col}
                      className={cn(
                        'border border-slate-200 h-6 px-1 cursor-cell',
                        isSelected ? 'outline outline-2 outline-blue-500 z-10 relative' : '',
                      )}
                      onClick={() => {
                        setSelectedCell({ row, col });
                        setEditValue(cellVal !== null && cellVal !== undefined ? String(cellVal) : '');
                      }}
                    >
                      <span className="text-xs truncate block">{cellVal !== null && cellVal !== undefined ? String(cellVal) : ''}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center border-t bg-slate-50 px-2 py-1">
        {content.sheets.map((sheet, i) => (
          <button
            key={i}
            className={cn('px-3 py-1 text-sm rounded-t border mr-1 transition-colors', i === activeSheet ? 'bg-white border-b-white font-medium' : 'text-slate-500 hover:bg-white')}
            onClick={() => setActiveSheet(i)}
          >
            {sheet.name}
          </button>
        ))}
        <button className="p-1 text-slate-400 hover:text-slate-600" onClick={addSheet}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
