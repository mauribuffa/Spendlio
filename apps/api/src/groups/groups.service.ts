import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { groups, groupMembers, people } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import type { CreateGroupInput, Group } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class GroupsService {
  constructor(@Inject(DB) private db: Database) {}

  /** The user's groups, newest first, each with its member person ids. */
  async list(userId: string): Promise<Group[]> {
    const rows = await this.db
      .select()
      .from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(desc(groups.createdAt));

    const groupIds = rows.map((g) => g.id);
    const members = groupIds.length
      ? await this.db
          .select({ groupId: groupMembers.groupId, personId: groupMembers.personId })
          .from(groupMembers)
          .where(inArray(groupMembers.groupId, groupIds))
      : [];

    const byGroup = new Map<string, string[]>();
    for (const m of members) {
      const arr = byGroup.get(m.groupId) ?? [];
      arr.push(m.personId);
      byGroup.set(m.groupId, arr);
    }

    return rows.map(
      (g): Group => ({
        id: g.id,
        userId: g.userId,
        name: g.name,
        memberIds: byGroup.get(g.id) ?? [],
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }),
    );
  }

  /**
   * Create a group with its members. Every member id must be one of the user's
   * own people (id-only payload, scoped check) — keeping membership user-owned.
   */
  async create(userId: string, dto: CreateGroupInput): Promise<Group> {
    const memberIds = [...new Set(dto.memberIds)];

    if (memberIds.length > 0) {
      const owned = await this.db
        .select({ id: people.id })
        .from(people)
        .where(and(eq(people.userId, userId), inArray(people.id, memberIds)));
      const ownedIds = new Set(owned.map((p) => p.id));
      if (memberIds.some((mid) => !ownedIds.has(mid))) {
        throw new BadRequestException('Every member must be one of your people.');
      }
    }

    const [group] = await this.db.insert(groups).values({ userId, name: dto.name }).returning();

    if (memberIds.length > 0) {
      await this.db
        .insert(groupMembers)
        .values(memberIds.map((personId) => ({ groupId: group!.id, personId })));
    }

    return {
      id: group!.id,
      userId: group!.userId,
      name: group!.name,
      memberIds,
      createdAt: group!.createdAt,
      updatedAt: group!.updatedAt,
    };
  }
}
