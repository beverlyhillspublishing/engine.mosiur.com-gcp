import { prisma } from '../config/database';

export async function getOverview(orgId: string) {
  const [totalContacts, totalCampaigns, totalSent, totalOpens, totalClicks] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId, status: 'SUBSCRIBED' } }),
    prisma.campaign.count({ where: { organizationId: orgId } }),
    prisma.emailSend.count({ where: { campaign: { organizationId: orgId } } }),
    prisma.emailSend.aggregate({ where: { campaign: { organizationId: orgId } }, _sum: { openCount: true } }),
    prisma.emailSend.aggregate({ where: { campaign: { organizationId: orgId } }, _sum: { clickCount: true } }),
  ]);

  const opens = totalOpens._sum.openCount || 0;
  const clicks = totalClicks._sum.clickCount || 0;

  return {
    totalContacts,
    totalCampaigns,
    totalSent,
    totalOpens: opens,
    totalClicks: clicks,
    avgOpenRate: totalSent > 0 ? ((opens / totalSent) * 100).toFixed(2) : '0.00',
    avgClickRate: totalSent > 0 ? ((clicks / totalSent) * 100).toFixed(2) : '0.00',
  };
}

export async function getTimeSeries(orgId: string, metric: 'sends' | 'opens' | 'clicks', days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.emailEvent.findMany({
    where: {
      send: { campaign: { organizationId: orgId } },
      occurredAt: { gte: since },
      type: metric === 'sends' ? 'SENT' : metric === 'opens' ? 'OPENED' : 'CLICKED',
    },
    select: { occurredAt: true },
  });

  // Group by day
  const byDay: Record<string, number> = {};
  for (const event of events) {
    const day = event.occurredAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  // Fill in zeros for missing days
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    result.push({ date: day, count: byDay[day] || 0 });
  }

  return result;
}

export async function getTopCampaigns(orgId: string, limit = 10) {
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId, status: 'SENT' },
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { sends: true } },
    },
  });

  return Promise.all(
    campaigns.map(async (c) => {
      const [opened, clicked] = await Promise.all([
        prisma.emailSend.count({ where: { campaignId: c.id, openedAt: { not: null } } }),
        prisma.emailSend.count({ where: { campaignId: c.id, clickCount: { gt: 0 } } }),
      ]);
      const total = c._count.sends;
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        sentAt: c.sentAt,
        total,
        opened,
        clicked,
        openRate: total > 0 ? ((opened / total) * 100).toFixed(2) : '0.00',
        clickRate: total > 0 ? ((clicked / total) * 100).toFixed(2) : '0.00',
      };
    }),
  );
}

export async function getSubscriberGrowth(orgId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId, createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  });

  const byDay: Record<string, { subscribed: number; unsubscribed: number }> = {};
  for (const c of contacts) {
    const day = c.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { subscribed: 0, unsubscribed: 0 };
    if (c.status === 'SUBSCRIBED') byDay[day].subscribed++;
    else if (c.status === 'UNSUBSCRIBED') byDay[day].unsubscribed++;
  }

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    result.push({ date: day, ...(byDay[day] || { subscribed: 0, unsubscribed: 0 }) });
  }

  return result;
}
