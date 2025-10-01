import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');

const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2']);
const mimeByExtension = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

const staticAssets = new Map();

function cacheControlFor(pathname) {
  if (pathname === 'index.html') {
    return 'no-cache, no-store, must-revalidate';
  }
  if (pathname.startsWith('assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=300';
}

function preloadDirectory(directory, prefix = '') {
  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      preloadDirectory(absolutePath, relativePath);
    } else if (entry.isFile()) {
      const fileBuffer = readFileSync(absolutePath);
      const extension = extname(relativePath).toLowerCase();
      const contentType = mimeByExtension.get(extension) ?? 'application/octet-stream';
      const isBinary = binaryExtensions.has(extension);
      const body = isBinary ? fileBuffer.toString('base64') : fileBuffer.toString('utf8');
      const contentLength = fileBuffer.byteLength;
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': cacheControlFor(relativePath),
        'Content-Length': String(contentLength),
      };
      staticAssets.set(`/${relativePath.replace(/\\/g, '/')}`, {
        statusCode: 200,
        headers,
        body,
        isBase64Encoded: isBinary,
      });
    }
  }
}

function ensureDistPreloaded() {
  if (staticAssets.size > 0) {
    return;
  }
  try {
    preloadDirectory(distDir);
  } catch (error) {
    console.error('Lambda failed to read dist directory', { distDir, error });
    throw new Error('dist assets missing from Lambda package');
  }
  if (!staticAssets.has('/index.html')) {
    throw new Error('index.html not found in dist directory');
  }
}

function getPath(event) {
  const rawPath = event?.rawPath ?? event?.path ?? '/';
  const stage = event?.requestContext?.stage;
  if (stage && stage !== '$default' && rawPath.startsWith(`/${stage}`)) {
    const trimmed = rawPath.slice(stage.length + 1);
    return trimmed.length > 0 ? trimmed : '/';
  }
  return rawPath || '/';
}

function getMethod(event) {
  return event?.requestContext?.http?.method ?? event?.httpMethod ?? 'GET';
}

function notFoundResponse() {
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: 'Not found',
    isBase64Encoded: false,
  };
}

function methodNotAllowedResponse() {
  return {
    statusCode: 405,
    headers: {
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: 'Method Not Allowed',
    isBase64Encoded: false,
  };
}

function asHeadResponse(response) {
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: '',
    isBase64Encoded: false,
  };
}

function configResponseFor(method) {
  const config = {
    STREAM_URL: process.env.STREAM_URL ?? 'http://localhost:8080/curves/stream',
    APP_ENV: process.env.APP_ENV ?? 'prd',
  };
  const body = `window.__APP_CONFIG__ = ${JSON.stringify(config)};`;
  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Content-Length': String(Buffer.byteLength(body)),
  };
  if (method === 'HEAD') {
    return {
      statusCode: 200,
      headers,
      body: '',
      isBase64Encoded: false,
    };
  }
  return {
    statusCode: 200,
    headers,
    body,
    isBase64Encoded: false,
  };
}

ensureDistPreloaded();

export const handler = async (event) => {
  const method = getMethod(event).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return methodNotAllowedResponse();
  }

  let pathname = getPath(event);
  if (!pathname || pathname === '/') {
    pathname = '/index.html';
  }

  if (pathname === '/config.js') {
    return configResponseFor(method);
  }

  const response = staticAssets.get(pathname);

  if (!response) {
    const looksLikeRoute = !pathname.includes('.') || pathname.endsWith('.html');
    if (looksLikeRoute) {
      const indexResponse = staticAssets.get('/index.html');
      if (indexResponse) {
        return method === 'HEAD' ? asHeadResponse(indexResponse) : indexResponse;
      }
    }
    return notFoundResponse();
  }

  return method === 'HEAD' ? asHeadResponse(response) : response;
};
