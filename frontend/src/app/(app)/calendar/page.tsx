'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, CalendarDays, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TpCalendar { id: string; name: string; color: string; isDefault: boolean }
interface CalendarEvent {
  id: string; title: string; startAt: string; endAt: string; allDay: boolean;
  description?: string; location?: string; calendarId: string;
  calendar?: { color: string; name: string };
}

export default function CalendarPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null);

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

  const { data: calendars = [] } = useQuery({
    queryKey: ['calendars', orgId],
    queryFn: () => api.calendar.calendars.list().then((r) => r.data as TpCalendar[]),
    enabled: !!orgId,
    onSuccess: (data: TpCalendar[]) => {
      if (data.length > 0 && !selectedCalendarId) {
        setSelectedCalendarId(data.find((c) => c.isDefault)?.id || data[0].id);
      }
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', orgId, dateRange.start, dateRange.end],
    queryFn: () =>
      dateRange.start
        ? api.calendar.events.list(dateRange.start, dateRange.end).then((r) => r.data as CalendarEvent[])
        : Promise.resolve([]),
    enabled: !!orgId && !!dateRange.start,
  });

  const createCalendarMutation = useMutation({
    mutationFn: (name: string) => api.calendar.calendars.create({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendars', orgId] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data: unknown) => api.calendar.events.create(selectedCalendarId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events', orgId] });
      setEventModalOpen(false);
      setEditingEvent(null);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.calendar.events.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events', orgId] }),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => api.calendar.events.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events', orgId] });
      setEventModalOpen(false);
      setEditingEvent(null);
    },
  });

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startAt,
    end: e.endAt,
    allDay: e.allDay,
    backgroundColor: e.calendar?.color || '#3b82f6',
    borderColor: e.calendar?.color || '#3b82f6',
    extendedProps: { description: e.description, location: e.location, calendarId: e.calendarId },
  }));

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 border-r bg-slate-50 flex flex-col p-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Calendars</h2>
        {calendars.map((cal) => (
          <button
            key={cal.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
              selectedCalendarId === cal.id ? 'bg-slate-200 font-medium' : 'hover:bg-slate-100',
            )}
            onClick={() => setSelectedCalendarId(cal.id)}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
            <span className="truncate">{cal.name}</span>
            {cal.isDefault && <Badge variant="secondary" className="text-xs ml-auto h-4 px-1">Default</Badge>}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 justify-start text-slate-500"
          onClick={() => { const name = prompt('Calendar name:'); if (name) createCalendarMutation.mutate(name); }}
        >
          <Plus className="w-4 h-4 mr-1" />Add Calendar
        </Button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden p-4">
        {calendars.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Create a calendar to get started</p>
              <Button className="mt-4" onClick={() => { const name = prompt('Calendar name:'); if (name) createCalendarMutation.mutate(name); }}>
                New Calendar
              </Button>
            </div>
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={fcEvents}
            editable
            selectable
            datesSet={(info) => setDateRange({ start: info.startStr, end: info.endStr })}
            select={(info) => {
              setEditingEvent({ startAt: info.startStr, endAt: info.endStr, allDay: info.allDay });
              setEventModalOpen(true);
            }}
            eventClick={(info) => {
              const ev = events.find((e) => e.id === info.event.id);
              if (ev) { setEditingEvent(ev); setEventModalOpen(true); }
            }}
            eventDrop={(info) => {
              updateEventMutation.mutate({
                id: info.event.id,
                data: { startAt: info.event.startStr, endAt: info.event.endStr },
              });
            }}
            height="100%"
          />
        )}
      </div>

      {/* Event modal */}
      <Dialog open={eventModalOpen} onOpenChange={(open) => { setEventModalOpen(open); if (!open) setEditingEvent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent?.id ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const data = {
                title: fd.get('title') as string,
                description: fd.get('description') as string,
                location: fd.get('location') as string,
                startAt: fd.get('startAt') as string,
                endAt: fd.get('endAt') as string,
              };
              if (editingEvent?.id) {
                updateEventMutation.mutate({ id: editingEvent.id, data });
              } else {
                createEventMutation.mutate(data);
              }
            }}
          >
            <div className="space-y-1">
              <Label>Title</Label>
              <Input name="title" defaultValue={editingEvent?.title || ''} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start</Label>
                <Input name="startAt" type="datetime-local" defaultValue={editingEvent?.startAt?.slice(0, 16) || ''} required />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input name="endAt" type="datetime-local" defaultValue={editingEvent?.endAt?.slice(0, 16) || ''} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input name="location" defaultValue={editingEvent?.location || ''} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input name="description" defaultValue={editingEvent?.description || ''} placeholder="Optional" />
            </div>
            <DialogFooter>
              {editingEvent?.id && (
                <Button type="button" variant="destructive" onClick={() => deleteEventMutation.mutate(editingEvent.id!)}>
                  <Trash2 className="w-4 h-4 mr-1" />Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setEventModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingEvent?.id ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
