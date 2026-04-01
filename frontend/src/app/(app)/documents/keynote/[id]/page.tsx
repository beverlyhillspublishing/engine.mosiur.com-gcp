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
import { v4 as uuidv4 } from 'uuid';

interface SlideElement { id: string; type: 'text' | 'shape'; x: number; y: number; width: number; height: number; content?: string; fill?: string; fontSize?: number; bold?: boolean }
interface Slide { id: string; background: string; elements: SlideElement[] }
interface KeynoteContent { slides: Slide[]; theme?: { fontFamily: string; primaryColor: string } }

export default function KeynoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<KeynoteContent>({ slides: [{ id: '1', background: '#ffffff', elements: [] }] });
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
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
      const c = doc.content as KeynoteContent;
      setContent(c?.slides ? c : { slides: [{ id: '1', background: '#ffffff', elements: [] }] });
    }
  }, [doc]);

  const triggerSave = (newTitle: string, newContent: KeynoteContent) => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ title: newTitle, content: newContent });
    }, 1000);
  };

  const currentSlide = content.slides[activeSlide];

  const addSlide = () => {
    const newSlide: Slide = { id: uuidv4(), background: '#ffffff', elements: [] };
    const newContent = { ...content, slides: [...content.slides, newSlide] };
    setContent(newContent);
    setActiveSlide(newContent.slides.length - 1);
    triggerSave(title, newContent);
  };

  const deleteSlide = (i: number) => {
    if (content.slides.length <= 1) return;
    const newSlides = content.slides.filter((_, idx) => idx !== i);
    const newContent = { ...content, slides: newSlides };
    setContent(newContent);
    setActiveSlide(Math.min(i, newSlides.length - 1));
    triggerSave(title, newContent);
  };

  const addTextElement = () => {
    const el: SlideElement = { id: uuidv4(), type: 'text', x: 100, y: 100, width: 300, height: 60, content: 'Click to edit', fontSize: 24 };
    updateCurrentSlide({ ...currentSlide, elements: [...currentSlide.elements, el] });
  };

  const updateCurrentSlide = (slide: Slide) => {
    const newSlides = [...content.slides];
    newSlides[activeSlide] = slide;
    const newContent = { ...content, slides: newSlides };
    setContent(newContent);
    triggerSave(title, newContent);
  };

  const updateElement = (elId: string, updates: Partial<SlideElement>) => {
    const newElements = currentSlide.elements.map((e) => e.id === elId ? { ...e, ...updates } : e);
    updateCurrentSlide({ ...currentSlide, elements: newElements });
  };

  const deleteElement = (elId: string) => {
    updateCurrentSlide({ ...currentSlide, elements: currentSlide.elements.filter((e) => e.id !== elId) });
    setSelectedEl(null);
  };

  const selectedElement = currentSlide?.elements.find((e) => e.id === selectedEl);

  return (
    <div className="flex flex-col h-screen bg-slate-800">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-700 bg-slate-900">
        <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-700" onClick={() => router.push('/documents')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); triggerSave(e.target.value, content); }}
          className="border-none bg-transparent text-white focus-visible:ring-0 font-semibold text-lg w-64 placeholder:text-slate-400"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2 ml-2">
          <Button size="sm" variant="outline" className="text-white border-slate-600 hover:bg-slate-700" onClick={addTextElement}>
            <Plus className="w-3.5 h-3.5 mr-1" />Text
          </Button>
        </div>
        <div className="ml-auto text-sm text-slate-400">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <span className="flex items-center gap-1 text-green-400"><Save className="w-3.5 h-3.5" />Saved</span> : null}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Slide panel */}
        <div className="w-48 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto p-2 gap-2">
          {content.slides.map((slide, i) => (
            <div key={slide.id} className="relative group">
              <button
                className={cn('w-full aspect-video rounded border-2 transition-colors', i === activeSlide ? 'border-blue-500' : 'border-transparent hover:border-slate-600')}
                style={{ backgroundColor: slide.background }}
                onClick={() => setActiveSlide(i)}
              >
                <span className="text-xs text-slate-400">{i + 1}</span>
              </button>
              {content.slides.length > 1 && (
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 rounded text-white"
                  onClick={() => deleteSlide(i)}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          <button className="p-2 text-slate-400 hover:text-white flex items-center justify-center" onClick={addSlide}>
            <Plus className="w-4 h-4 mr-1" /><span className="text-xs">Slide</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-8">
          <div
            className="relative shadow-2xl"
            style={{
              width: 800, height: 450,
              backgroundColor: currentSlide?.background || '#ffffff',
            }}
            onClick={() => setSelectedEl(null)}
          >
            {currentSlide?.elements.map((el) => (
              <div
                key={el.id}
                className={cn('absolute cursor-pointer select-none', selectedEl === el.id && 'outline outline-2 outline-blue-500')}
                style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                onClick={(e) => { e.stopPropagation(); setSelectedEl(el.id); }}
              >
                {el.type === 'text' && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full h-full focus:outline-none"
                    style={{ fontSize: el.fontSize || 24, fontWeight: el.bold ? 'bold' : 'normal' }}
                    onBlur={(e) => updateElement(el.id, { content: e.currentTarget.textContent || '' })}
                    dangerouslySetInnerHTML={{ __html: el.content || '' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Properties panel */}
        {selectedElement && (
          <div className="w-56 bg-slate-900 border-l border-slate-700 p-3 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Properties</span>
              <button onClick={() => deleteElement(selectedElement.id)} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-slate-400 text-xs">Font size</label>
                <Input
                  type="number"
                  value={selectedElement.fontSize || 24}
                  onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white h-7 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs">X position</label>
                <Input
                  type="number"
                  value={selectedElement.x}
                  onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white h-7 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs">Y position</label>
                <Input
                  type="number"
                  value={selectedElement.y}
                  onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white h-7 text-sm mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
