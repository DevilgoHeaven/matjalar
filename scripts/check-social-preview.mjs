#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.argv[2] ?? 'http://127.0.0.1:3011');
const baseOrigin = new URL(baseUrl).origin;

const checks = [];

const home = await checkHtmlPage('/');
const quiz = await checkHtmlPage('/quiz');
const ranking = await checkHtmlPage('/rankings/budget');
const comboPath = findFirstComboPath(ranking.html) ?? findFirstComboPath(home.html);

if (!comboPath) {
  throw new Error('No combo link found on home or ranking pages');
}

await checkHtmlPage(comboPath);

await checkImage('/opengraph-image');
await checkImage('/quiz/opengraph-image');
await checkImage('/rankings/budget/opengraph-image');
await checkImage(`${comboPath}/opengraph-image`);

console.log(
  JSON.stringify(
    {
      baseUrl,
      comboPath,
      checks,
    },
    null,
    2
  )
);

async function checkHtmlPage(path) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, {
    headers: {
      'user-agent': 'matjalar-social-preview-check/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error(`${path} returned non-html content-type: ${contentType}`);
  }

  const html = await response.text();
  const required = [
    'og:title',
    'og:description',
    'og:image',
    'twitter:card',
    'twitter:image',
  ];

  for (const name of required) {
    const value = readMeta(html, name);
    if (!value) {
      throw new Error(`${path} is missing ${name}`);
    }

    if (name === 'og:image' || name === 'twitter:image') {
      await checkImageUrl(value, `${path} ${name}`);
    }
  }

  const canonical = readCanonical(html);
  if (!canonical) {
    throw new Error(`${path} is missing canonical link`);
  }
  const canonicalUrl = new URL(canonical, url);
  if (canonicalUrl.origin !== baseOrigin) {
    throw new Error(
      `${path} canonical origin ${canonicalUrl.origin} does not match ${baseOrigin}`
    );
  }

  checks.push({ path, type: 'html', status: response.status });
  return { html };
}

async function checkImage(path) {
  const url = new URL(path, baseUrl);
  await checkImageUrl(url.toString(), path);
}

async function checkImageUrl(value, label) {
  const url = new URL(value, baseUrl);
  const response = await fetch(url, {
    headers: {
      'user-agent': 'matjalar-social-preview-check/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`${label} image ${url.toString()} returned ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('image/png')) {
    throw new Error(
      `${label} image ${url.toString()} returned non-png content-type: ${contentType}`
    );
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 1024) {
    throw new Error(`${label} image is unexpectedly small`);
  }

  checks.push({
    path: label,
    type: 'image',
    status: response.status,
    bytes: bytes.byteLength,
  });
}

function readMeta(html, name) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = readAttributes(tag[0]);
    if (attrs.property === name || attrs.name === name) {
      return attrs.content ?? null;
    }
  }
  return null;
}

function readCanonical(html) {
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = readAttributes(tag[0]);
    if (attrs.rel === 'canonical') {
      return attrs.href ?? null;
    }
  }
  return null;
}

function findFirstComboPath(html) {
  return /href=["'](\/combo\/[^"?#']+)/i.exec(html)?.[1] ?? null;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString();
}

function readAttributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  return attrs;
}
