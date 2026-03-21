import { cache } from '../services/cache';

describe('cache', () => {
  beforeEach(() => cache.clear());

  it('returns null for missing key', () => {
    expect(cache.get('missing:90')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    const data = { repo: 'test/repo', days: 90 } as any;
    cache.set('test/repo:90', data);
    expect(cache.get('test/repo:90')).toEqual(data);
  });

  it('returns null after TTL expires', () => {
    const data = { repo: 'test/repo' } as any;
    cache.set('test/repo:90', data);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3601 * 1000);
    expect(cache.get('test/repo:90')).toBeNull();
    jest.restoreAllMocks();
  });

  it('clears all entries', () => {
    cache.set('a:90', {} as any);
    cache.set('b:30', {} as any);
    cache.clear();
    expect(cache.get('a:90')).toBeNull();
    expect(cache.get('b:30')).toBeNull();
  });
});
