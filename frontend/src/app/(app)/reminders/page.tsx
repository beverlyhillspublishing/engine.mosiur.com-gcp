'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckSquare, Plus, Trash2, Circle, CheckCircle2, Flag, Calendar } from 'lucide-react';

interface ReminderList { id: string; name: string; color: string; _count?: { reminders: number } }
interface Reminder {
  id: string; title: string; notes?: string; isCompleted: boolean;
  dueDate?: string; priority: number; subtasks?: Reminder[];
}

const PRIORITY_LABELS = ['None', 'Low', 'Medium', 'High'];
const PRIORITY_COLORS = ['text-slate-400', 'text-blue-500', 'text-yellow-500', 'text-red-500'];

function ReminderItem({ reminder, listId, orgId, api, qc }: {
  reminder: Reminder; listId: string; orgId: string;
  api: ReturnType<typeof orgApi>; qc: ReturnType<typeof useQueryClient>;
}) {
  const toggleMutation = useMutation({
    mutationFn: () => api.reminders.tasks.toggle(listId, reminder.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders-tasks', orgId, listId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.reminders.tasks.delete(listId, reminder.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders-tasks', orgId, listId] }),
  });

  return (
    <div className="group flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-slate-50">
      <button onClick={() => toggleMutation.mutate()} className="mt-0.5 flex-shrink-0">
        {reminder.isCompleted
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-slate-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', reminder.isCompleted && 'line-through text-slate-400')}>{reminder.title}</p>
        {reminder.notes && <p className="text-xs text-slate-400 truncate">{reminder.notes}</p>}
        <div className="flex items-center gap-2 mt-1">
          {reminder.dueDate && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {new Date(reminder.dueDate).toLocaleDateString()}
            </span>
          )}
          {reminder.priority > 0 && (
            <span className={cn('flex items-center gap-1 text-xs', PRIORITY_COLORS[reminder.priority])}>
              <Flag className="w-3 h-3" />{PRIORITY_LABELS[reminder.priority]}
            </span>
          )}
        </div>
        {reminder.subtasks?.map((sub) => (
          <ReminderItem key={sub.id} reminder={sub} listId={listId} orgId={orgId} api={api} qc={qc} />
        ))}
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600"
        onClick={() => deleteMutation.mutate()}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function RemindersPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: lists = [] } = useQuery({
    queryKey: ['reminder-lists', orgId],
    queryFn: () => api.reminders.lists.list().then((r) => r.data as ReminderList[]),
    enabled: !!orgId,
    onSuccess: (data: ReminderList[]) => {
      if (data.length > 0 && !selectedListId) setSelectedListId(data[0].id);
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['reminders-tasks', orgId, selectedListId, showCompleted],
    queryFn: () => selectedListId
      ? api.reminders.tasks.list(selectedListId, showCompleted).then((r) => r.data as Reminder[])
      : Promise.resolve([]),
    enabled: !!orgId && !!selectedListId,
  });

  const createListMutation = useMutation({
    mutationFn: (name: string) => api.reminders.lists.create({ name }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reminder-lists', orgId] });
      setSelectedListId(res.data.id);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => api.reminders.lists.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminder-lists', orgId] });
      setSelectedListId(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: () => api.reminders.tasks.create(selectedListId!, { title: newTaskTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders-tasks', orgId, selectedListId] });
      setNewTaskTitle('');
    },
  });

  const selectedList = lists.find((l) => l.id === selectedListId);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Lists sidebar */}
      <div className="w-72 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-slate-900">Reminders</h1>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-1">
          {lists.map((list) => (
            <div key={list.id} className="group flex items-center">
              <button
                className={cn(
                  'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  selectedListId === list.id ? 'bg-primary text-white' : 'hover:bg-slate-100',
                )}
                onClick={() => setSelectedListId(list.id)}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                <span className="flex-1 truncate">{list.name}</span>
                <Badge variant="secondary" className="text-xs h-5">{list._count?.reminders || 0}</Badge>
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-1.5 ml-1 text-red-400 hover:text-red-600 rounded"
                onClick={() => deleteListMutation.mutate(list.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600"
            onClick={() => {
              const name = prompt('List name:');
              if (name) createListMutation.mutate(name);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />New List
          </Button>
        </div>
      </div>

      {/* Tasks pane */}
      {selectedList ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-5 border-b bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold" style={{ color: selectedList.color }}>{selectedList.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                onClick={() => setShowCompleted((v) => !v)}
              >
                {showCompleted ? 'Hide Completed' : 'Show Completed'}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4">
            {/* Add task input */}
            <div className="flex items-center gap-3 mb-4 p-3 border rounded-xl bg-white">
              <Plus className="w-5 h-5 text-slate-400" />
              <Input
                className="border-none shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
                placeholder="Add a reminder..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskTitle.trim()) createTaskMutation.mutate();
                }}
              />
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">No reminders</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {tasks.map((task) => (
                  <ReminderItem
                    key={task.id}
                    reminder={task}
                    listId={selectedListId!}
                    orgId={orgId}
                    api={api}
                    qc={qc}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Create a list to get started</p>
            <Button className="mt-4" onClick={() => { const name = prompt('List name:'); if (name) createListMutation.mutate(name); }}>
              New List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
