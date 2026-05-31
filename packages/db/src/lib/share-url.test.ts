import { describe, expect, it } from 'vitest';
import { buildTrackedSharePath } from './share-url';

describe('buildTrackedSharePath', () => {
  it('adds share attribution params to a plain app path', () => {
    expect(
      buildTrackedSharePath({
        path: '/combo/abc',
        surface: 'combo',
        channel: 'native',
      })
    ).toBe(
      '/combo/abc?utm_source=matjalar_share&utm_medium=native&utm_campaign=combo&mzr_share=combo'
    );
  });

  it('preserves existing query params for quiz result links', () => {
    expect(
      buildTrackedSharePath({
        path: '/quiz?prefs=budget%2Cspicy',
        surface: 'quiz_result',
        channel: 'clipboard',
        content: 'budget-spicy',
      })
    ).toBe(
      '/quiz?prefs=budget%2Cspicy&utm_source=matjalar_share&utm_medium=clipboard&utm_campaign=quiz_result&mzr_share=quiz_result&utm_content=budget-spicy'
    );
  });

  it('keeps URL hash fragments after tracking params', () => {
    expect(
      buildTrackedSharePath({
        path: '/rankings/budget#top',
        surface: 'ranking',
        channel: 'fallback',
      })
    ).toBe(
      '/rankings/budget?utm_source=matjalar_share&utm_medium=fallback&utm_campaign=ranking&mzr_share=ranking#top'
    );
  });

  it('rejects non-app paths to avoid sharing arbitrary origins', () => {
    expect(() =>
      buildTrackedSharePath({
        path: 'https://example.com/combo/abc',
        surface: 'combo',
        channel: 'native',
      })
    ).toThrow('share path must start with /');
  });

  it('rejects protocol-relative paths to avoid arbitrary origins', () => {
    expect(() =>
      buildTrackedSharePath({
        path: '//example.com/combo/abc',
        surface: 'combo',
        channel: 'native',
      })
    ).toThrow('share path must start with /');
  });
});
