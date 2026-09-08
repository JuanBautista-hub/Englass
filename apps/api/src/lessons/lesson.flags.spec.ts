import { SYSTEM_USER_ID } from '../common/constants';
import {
  computeFlags,
  emptyFlags,
  isCatalogLessonOwnedByOtherUser,
  lessonRowToWire,
  ownerFlags,
} from './lesson.flags';

describe('lesson.flags', () => {
  const userId = 'user-1';
  const otherUser = 'user-2';
  const baseRow = {
    id: 'lesson-1',
    title: 'Test',
    description: null,
    level: 'A1',
    categoryId: 'cat-1',
    ownerId: userId,
    sourceLessonId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  describe('computeFlags', () => {
    it('marks owned lesson with isOwned=true, canEdit=true, canEnroll=false', () => {
      const flags = computeFlags(baseRow, userId, false);
      expect(flags).toEqual({
        isCatalog: false,
        isOwned: true,
        canEdit: true,
        canEnroll: false,
        alreadyEnrolled: false,
      });
    });

    it('marks catalog lesson (not enrolled) as enrollable preview', () => {
      const flags = computeFlags({ ...baseRow, ownerId: SYSTEM_USER_ID }, userId, false);
      expect(flags).toEqual({
        isCatalog: true,
        isOwned: false,
        canEdit: false,
        canEnroll: true,
        alreadyEnrolled: false,
      });
    });

    it('marks catalog lesson (already enrolled) as owned clone', () => {
      const flags = computeFlags({ ...baseRow, ownerId: SYSTEM_USER_ID }, userId, true);
      expect(flags).toEqual({
        isCatalog: true,
        isOwned: true,
        canEdit: true,
        canEnroll: false,
        alreadyEnrolled: true,
      });
    });

    it('marks foreign lesson (not catalog, not owned) as forbidden', () => {
      const flags = computeFlags({ ...baseRow, ownerId: otherUser }, userId, false);
      expect(flags).toEqual({
        isCatalog: false,
        isOwned: false,
        canEdit: false,
        canEnroll: false,
        alreadyEnrolled: false,
      });
    });
  });

  describe('lessonRowToWire', () => {
    it('embeds the flags into the output lesson and serializes dates', () => {
      const flags = computeFlags(baseRow, userId, false);
      const wire = lessonRowToWire(baseRow, flags, []);
      expect(wire.isOwned).toBe(true);
      expect(wire.canEdit).toBe(true);
      expect(wire.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(wire.updatedAt).toBe('2024-01-01T00:00:00.000Z');
      expect(wire.cards).toEqual([]);
    });

    it('passes card mastery through to the wire shape', () => {
      const flags = emptyFlags();
      const cards = [
        {
          id: 'c1',
          term: 'a',
          definition: 'b',
          example: null,
          translation: null,
          explanationEs: null,
          audioKey: null,
          level: 'A1',
          ordinal: 0,
          mastery: 'mastered' as const,
        },
      ];
      const wire = lessonRowToWire(baseRow, flags, cards);
      expect(wire.cards[0]?.mastery).toBe('mastered');
    });
  });

  describe('ownerFlags / isCatalogLessonOwnedByOtherUser', () => {
    it('ownerFlags returns the owned shape', () => {
      expect(ownerFlags()).toEqual({
        isCatalog: false,
        isOwned: true,
        canEdit: true,
        canEnroll: false,
        alreadyEnrolled: false,
      });
    });

    it('isCatalogLessonOwnedByOtherUser returns true for catalog lessons viewed by another user (still allow)', () => {
      expect(isCatalogLessonOwnedByOtherUser({ ...baseRow, ownerId: SYSTEM_USER_ID }, userId)).toBe(false);
      expect(isCatalogLessonOwnedByOtherUser({ ...baseRow, ownerId: otherUser }, userId)).toBe(true);
      expect(isCatalogLessonOwnedByOtherUser({ ...baseRow, ownerId: userId }, userId)).toBe(false);
    });
  });
});
