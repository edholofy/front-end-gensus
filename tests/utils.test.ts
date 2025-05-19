import type { Document } from '@/lib/db/schema';
import { getDocumentTimestampByIndex } from '@/lib/utils';
import { expect, test } from '@playwright/test';

test.describe('getDocumentTimestampByIndex', () => {
  test('returns timestamp for valid index', () => {
    const docs: Array<Document> = [
      { createdAt: new Date('2024-01-01') } as Document,
      { createdAt: new Date('2024-01-02') } as Document,
    ];

    const timestamp = getDocumentTimestampByIndex(docs, 1);
    expect(timestamp).toEqual(docs[1].createdAt);
  });

  test('returns new Date for out-of-range index', () => {
    const docs: Array<Document> = [
      { createdAt: new Date('2024-01-01') } as Document,
    ];

    const before = Date.now();
    const timestamp = getDocumentTimestampByIndex(docs, docs.length);
    const after = Date.now();

    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(timestamp.getTime()).toBeLessThanOrEqual(after);
  });
});
