import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export interface FilterRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_not_set';
  value?: string | number | boolean;
}

export interface FilterGroup {
  operator: 'AND' | 'OR';
  rules: (FilterRule | FilterGroup)[];
}

function isFilterGroup(rule: FilterRule | FilterGroup): rule is FilterGroup {
  return 'rules' in rule;
}

function buildRuleCondition(rule: FilterRule): Prisma.ContactWhereInput {
  const { field, operator, value } = rule;

  const standardFields: Record<string, string> = {
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    status: 'status',
    source: 'source',
    tags: 'tags',
  };

  if (standardFields[field]) {
    switch (operator) {
      case 'equals': return { [field]: value };
      case 'not_equals': return { [field]: { not: value } };
      case 'contains':
        if (field === 'tags') return { tags: { has: String(value) } };
        return { [field]: { contains: String(value), mode: 'insensitive' } };
      case 'not_contains':
        if (field === 'tags') return { NOT: { tags: { has: String(value) } } };
        return { [field]: { not: { contains: String(value), mode: 'insensitive' } } };
      case 'greater_than': return { [field]: { gt: value } };
      case 'less_than': return { [field]: { lt: value } };
      case 'is_set': return { [field]: { not: null } };
      case 'is_not_set': return { [field]: null };
      default: return {};
    }
  }

  // Custom field — stored in customData JSON
  const path = ['customData', field];
  switch (operator) {
    case 'equals': return { customData: { path, equals: value } };
    case 'not_equals': return { NOT: { customData: { path, equals: value } } };
    case 'contains': return { customData: { path, string_contains: String(value) } };
    case 'greater_than': return { customData: { path, gt: value } };
    case 'less_than': return { customData: { path, lt: value } };
    case 'is_set': return { customData: { path, not: Prisma.AnyNull } };
    case 'is_not_set': return { customData: { path, equals: Prisma.AnyNull } };
    default: return {};
  }
}

export function buildWhereClause(group: FilterGroup, orgId: string): Prisma.ContactWhereInput {
  const conditions = group.rules.map((rule) => {
    if (isFilterGroup(rule)) return buildWhereClause(rule, orgId);
    return buildRuleCondition(rule);
  });

  return {
    organizationId: orgId,
    status: 'SUBSCRIBED',
    ...(group.operator === 'AND' ? { AND: conditions } : { OR: conditions }),
  };
}

export async function listSegments(orgId: string) {
  return prisma.segment.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSegment(orgId: string, data: { name: string; description?: string; filterRules: FilterGroup }) {
  return prisma.segment.create({ data: { ...data, organizationId: orgId } });
}

export async function getSegment(orgId: string, id: string) {
  const segment = await prisma.segment.findFirst({ where: { id, organizationId: orgId } });
  if (!segment) throw new AppError(404, 'Segment not found');
  return segment;
}

export async function updateSegment(orgId: string, id: string, data: Partial<{ name: string; description: string; filterRules: FilterGroup }>) {
  const segment = await prisma.segment.findFirst({ where: { id, organizationId: orgId } });
  if (!segment) throw new AppError(404, 'Segment not found');
  return prisma.segment.update({ where: { id }, data });
}

export async function deleteSegment(orgId: string, id: string) {
  const segment = await prisma.segment.findFirst({ where: { id, organizationId: orgId } });
  if (!segment) throw new AppError(404, 'Segment not found');
  await prisma.segment.delete({ where: { id } });
}

export async function getSegmentCount(orgId: string, id: string) {
  const segment = await getSegment(orgId, id);
  const where = buildWhereClause(segment.filterRules as FilterGroup, orgId);
  const count = await prisma.contact.count({ where });
  return { count };
}

export async function resolveSegmentContactIds(orgId: string, segmentId: string): Promise<string[]> {
  const segment = await getSegment(orgId, segmentId);
  const where = buildWhereClause(segment.filterRules as FilterGroup, orgId);
  const contacts = await prisma.contact.findMany({ where, select: { id: true } });
  return contacts.map((c) => c.id);
}
