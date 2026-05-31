export type ShareTrackingSurface = 'combo' | 'ranking' | 'quiz_result';

export type ShareTrackingChannel =
  | 'native'
  | 'clipboard'
  | 'image'
  | 'fallback';

export interface ShareTrackingInput {
  path: string;
  surface: ShareTrackingSurface;
  channel: ShareTrackingChannel;
  content?: string;
}

const UTM_SOURCE = 'matjalar_share';

export function buildTrackedSharePath(input: ShareTrackingInput): string {
  const { pathname, search, hash } = splitPath(input.path);
  const params = new URLSearchParams(search);

  params.set('utm_source', UTM_SOURCE);
  params.set('utm_medium', input.channel);
  params.set('utm_campaign', input.surface);
  params.set('mzr_share', input.surface);

  if (input.content) {
    params.set('utm_content', input.content);
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}

function splitPath(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('share path must start with /');
  }

  const hashIndex = path.indexOf('#');
  const withoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  const queryIndex = withoutHash.indexOf('?');

  if (queryIndex === -1) {
    return { pathname: withoutHash, search: '', hash };
  }

  return {
    pathname: withoutHash.slice(0, queryIndex),
    search: withoutHash.slice(queryIndex + 1),
    hash,
  };
}
