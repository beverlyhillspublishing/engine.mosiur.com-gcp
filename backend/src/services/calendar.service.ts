import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── Calendars ────────────────────────────────────────────────────────────────

export async function listCalendars(orgId: string) {
  return prisma.tpCalendar.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { events: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createCalendar(orgId: string, userId: string, data: { name: string; color?: string }) {
  const existing = await prisma.tpCalendar.count({ where: { organizationId: orgId } });
  return prisma.tpCalendar.create({
    data: {
      name: data.name,
      color: data.color || '#3b82f6',
      isDefault: existing === 0,
      organizationId: orgId,
      createdById: userId,
    },
  });
}

export async function updateCalendar(orgId: string, id: string, data: { name?: string; color?: string }) {
  const cal = await prisma.tpCalendar.findFirst({ where: { id, organizationId: orgId } });
  if (!cal) throw new AppError(404, 'Calendar not found');
  return prisma.tpCalendar.update({ where: { id }, data });
}

export async function deleteCalendar(orgId: string, id: string) {
  const cal = await prisma.tpCalendar.findFirst({ where: { id, organizationId: orgId } });
  if (!cal) throw new AppError(404, 'Calendar not found');
  if (cal.isDefault) throw new AppError(400, 'Cannot delete the default calendar');
  await prisma.calendarEvent.deleteMany({ where: { calendarId: id } });
  await prisma.tpCalendar.delete({ where: { id } });
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function listEvents(orgId: string, calendarId: string | undefined, start: string, end: string) {
  if (calendarId) {
    const cal = await prisma.tpCalendar.findFirst({ where: { id: calendarId, organizationId: orgId } });
    if (!cal) throw new AppError(404, 'Calendar not found');
  }

  return prisma.calendarEvent.findMany({
    where: {
      organizationId: orgId,
      ...(calendarId ? { calendarId } : {}),
      startAt: { gte: new Date(start) },
      endAt: { lte: new Date(end) },
    },
    include: { attendees: true, calendar: { select: { color: true, name: true } } },
    orderBy: { startAt: 'asc' },
  });
}

export async function createEvent(
  orgId: string,
  userId: string,
  calendarId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    allDay?: boolean;
    startAt: string;
    endAt: string;
    rrule?: string;
    campaignId?: string;
    attendees?: { email: string; name?: string }[];
  },
) {
  const cal = await prisma.tpCalendar.findFirst({ where: { id: calendarId, organizationId: orgId } });
  if (!cal) throw new AppError(404, 'Calendar not found');

  return prisma.calendarEvent.create({
    data: {
      calendarId,
      title: data.title,
      description: data.description,
      location: data.location,
      allDay: data.allDay ?? false,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      rrule: data.rrule,
      campaignId: data.campaignId,
      organizationId: orgId,
      createdById: userId,
      attendees: data.attendees?.length
        ? { create: data.attendees.map((a) => ({ email: a.email, name: a.name })) }
        : undefined,
    },
    include: { attendees: true },
  });
}

export async function updateEvent(
  orgId: string,
  id: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    allDay?: boolean;
    startAt?: string;
    endAt?: string;
    rrule?: string;
    attendees?: { email: string; name?: string }[];
  },
) {
  const event = await prisma.calendarEvent.findFirst({ where: { id, organizationId: orgId } });
  if (!event) throw new AppError(404, 'Event not found');

  if (data.attendees) {
    await prisma.eventAttendee.deleteMany({ where: { eventId: id } });
  }

  return prisma.calendarEvent.update({
    where: { id },
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      attendees: data.attendees?.length
        ? { create: data.attendees.map((a) => ({ email: a.email, name: a.name })) }
        : undefined,
    },
    include: { attendees: true },
  });
}

export async function deleteEvent(orgId: string, id: string) {
  const event = await prisma.calendarEvent.findFirst({ where: { id, organizationId: orgId } });
  if (!event) throw new AppError(404, 'Event not found');
  await prisma.eventAttendee.deleteMany({ where: { eventId: id } });
  await prisma.calendarEvent.delete({ where: { id } });
}
