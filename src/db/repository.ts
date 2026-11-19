import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  customRoutines,
  householdProfiles,
  searchQueries,
  users,
} from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Unable to synchronize user account.', { cause: error });
  }
}

export async function getUserWorkspace(uid: string) {
  try {
    const [profiles, queries, routines] = await Promise.all([
      db
        .select()
        .from(householdProfiles)
        .where(eq(householdProfiles.userUid, uid))
        .orderBy(desc(householdProfiles.updatedAt)),
      db
        .select()
        .from(searchQueries)
        .where(eq(searchQueries.userUid, uid))
        .orderBy(desc(searchQueries.createdAt))
        .limit(15),
      db
        .select()
        .from(customRoutines)
        .where(eq(customRoutines.userUid, uid))
        .orderBy(desc(customRoutines.createdAt)),
    ]);

    return { profiles, queries, routines };
  } catch (error) {
    console.error('Database error in getUserWorkspace:', error);
    throw new Error('Unable to load saved household workspace.', { cause: error });
  }
}

export async function createHouseholdProfile(input: {
  userUid: string;
  profileName: string;
  demographics: string;
  sensitivityLevel: string;
  safeIndoorPm25Target: number;
  notes?: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      await tx
        .update(householdProfiles)
        .set({ isActive: false })
        .where(eq(householdProfiles.userUid, input.userUid));

      const inserted = await tx
        .insert(householdProfiles)
        .values({
          userUid: input.userUid,
          profileName: input.profileName.slice(0, 100),
          demographics: input.demographics.slice(0, 220),
          sensitivityLevel: input.sensitivityLevel.slice(0, 60),
          safeIndoorPm25Target: Math.max(5, Math.min(100, Math.round(input.safeIndoorPm25Target))),
          notes: (input.notes ?? '').slice(0, 320),
          isActive: true,
        })
        .returning();

      return inserted[0];
    });
  } catch (error) {
    console.error('Database error in createHouseholdProfile:', error);
    throw new Error('Unable to save household profile.', { cause: error });
  }
}

export async function activateHouseholdProfile(userUid: string, profileId: number) {
  try {
    return await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: householdProfiles.id })
        .from(householdProfiles)
        .where(and(eq(householdProfiles.id, profileId), eq(householdProfiles.userUid, userUid)))
        .limit(1);
      if (!target) return null;

      await tx
        .update(householdProfiles)
        .set({ isActive: false })
        .where(eq(householdProfiles.userUid, userUid));

      const updated = await tx
        .update(householdProfiles)
        .set({ isActive: true, updatedAt: new Date() })
        .where(and(eq(householdProfiles.id, profileId), eq(householdProfiles.userUid, userUid)))
        .returning();

      return updated[0] ?? null;
    });
  } catch (error) {
    console.error('Database error in activateHouseholdProfile:', error);
    throw new Error('Unable to activate household profile.', { cause: error });
  }
}

export async function deleteHouseholdProfile(userUid: string, profileId: number) {
  try {
    const deleted = await db
      .delete(householdProfiles)
      .where(and(eq(householdProfiles.id, profileId), eq(householdProfiles.userUid, userUid)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('Database error in deleteHouseholdProfile:', error);
    throw new Error('Unable to delete household profile.', { cause: error });
  }
}

export async function recordSearchQuery(input: {
  userUid: string;
  cityId: string;
  cityName: string;
  aqi: number;
  pm25: number;
  windKmh: number;
  queryText: string;
  aiSummary?: string;
}) {
  try {
    const inserted = await db
      .insert(searchQueries)
      .values({
        userUid: input.userUid,
        cityId: input.cityId.slice(0, 64),
        cityName: input.cityName.slice(0, 100),
        aqi: Math.round(input.aqi),
        pm25: Math.round(input.pm25),
        windKmh: Math.round(input.windKmh),
        queryText: input.queryText.slice(0, 500),
        aiSummary: (input.aiSummary ?? '').slice(0, 1200),
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database error in recordSearchQuery:', error);
    throw new Error('Unable to record search query.', { cause: error });
  }
}

export async function addCustomRoutine(input: {
  userUid: string;
  title: string;
  category: string;
  pm25ReductionUg: number;
}) {
  try {
    const inserted = await db
      .insert(customRoutines)
      .values({
        userUid: input.userUid,
        title: input.title.slice(0, 120),
        category: input.category.slice(0, 40),
        pm25ReductionUg: Math.max(2, Math.min(80, Math.round(input.pm25ReductionUg))),
        enabled: true,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database error in addCustomRoutine:', error);
    throw new Error('Unable to save custom low-emission routine.', { cause: error });
  }
}

export async function toggleCustomRoutine(userUid: string, routineId: number, enabled: boolean) {
  try {
    const updated = await db
      .update(customRoutines)
      .set({ enabled })
      .where(and(eq(customRoutines.id, routineId), eq(customRoutines.userUid, userUid)))
      .returning();

    return updated[0] ?? null;
  } catch (error) {
    console.error('Database error in toggleCustomRoutine:', error);
    throw new Error('Unable to update custom routine.', { cause: error });
  }
}

export async function deleteCustomRoutine(userUid: string, routineId: number) {
  try {
    const deleted = await db
      .delete(customRoutines)
      .where(and(eq(customRoutines.id, routineId), eq(customRoutines.userUid, userUid)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('Database error in deleteCustomRoutine:', error);
    throw new Error('Unable to delete custom routine.', { cause: error });
  }
}
