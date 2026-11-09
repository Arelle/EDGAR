import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import vm from 'node:vm';
import { buildRfvRouter } from '../src/rfv-router.js';
import { renderPage } from '../src/transform-page.js';

test('rejects injected filing identifiers before fetching', async () => {
  let handler;
  const express = {
    Router: () => ({ get: (_path, callback) => { handler = callback; } }),
    static: () => {},
  };
  buildRfvRouter({ express, apiPath: '/viewer', serverRoot: '/tmp', includeDir: '/tmp' });

  const originalFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error('Fetch reached');
  };

  try {
    for (const [query, invalid] of [
      [{ cik: "320193/FilingSummary.xml#'-mark()-'", accession_number: '000032019324000123' }, true],
      [{ cik: '320193', accession_number: "000032019324000123#'-mark()-'" }, true],
      [{ cik: '0000320193', accession_number: '0000320193-24-000123' }, false],
      [{ cik: '320193', accession_number: '000032019324000123' }, false],
    ]) {
      let status = 200;
      let body = '';
      const response = {
        status(value) { status = value; return this; },
        type() { return this; },
        send(value) { body = String(value); return this; },
      };
      await handler({ query, protocol: 'https', get: () => 'example.com' }, response);
      // valid identifiers reach the stubbed fetch, which throws and yields a 500
      assert.equal(status, invalid ? 400 : 500);
      if (invalid) {
        assert.match(body, /<meta name="robots" content="noindex" \/>/);
        assert.match(body, /<main id="main-content"[^>]*>\s*<div[^>]*>\s*<p>Invalid CIK or accession number<\/p>/);
        assert.ok(!body.includes('mark()'));
        assert.ok(!body.includes('No rendered XBRL documents'));
      }
    }
    assert.equal(fetches, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('action and xbrl_type are not reflected in the response', async () => {
  let handler;
  const express = {
    Router: () => ({ get: (_path, callback) => { handler = callback; } }),
    static: () => {},
  };
  buildRfvRouter({ express, apiPath: '/viewer', serverRoot: '/tmp', includeDir: '/tmp' });

  const originalFetch = globalThis.fetch;
  const originalStub = process.env.DB_STUB_FILE;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => '<FilingSummary><MyReports></MyReports><InputFiles></InputFiles></FilingSummary>',
  });
  process.env.DB_STUB_FILE = '/nonexistent/rfv-db-stub.json';

  const payload = "rfvprobe'\"</script><script>mark()</script>";
  try {
    let status = 200;
    let body = '';
    const response = {
      status(value) { status = value; return this; },
      type() { return this; },
      send(value) { body = String(value); return this; },
    };
    await handler({
      query: { cik: '320193', accession_number: '000032019324000123', action: payload, xbrl_type: payload },
      protocol: 'https',
      get: () => 'example.com',
    }, response);
    assert.equal(status, 200);
    assert.ok(body.includes('<!DOCTYPE html>'));
    assert.ok(!body.includes('rfvprobe'));
    assert.ok(!body.includes('noindex'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStub === undefined) delete process.env.DB_STUB_FILE;
    else process.env.DB_STUB_FILE = originalStub;
  }
});

test('filing path cannot execute code in the generated page', () => {
  const html = renderPage({
    accessionNumber: '000032019324000123',
    fsParsed: { rfvMenu: [], log: [] },
    aliasPath: "https://s3.amazonaws.com/archives.sec.gov/edgar/data/320193/FilingSummary.xml#'-mark()-'&x/000032019324000123",
    mode: 'server',
    menuHtml: '',
    filer_data: [],
    log_debug: () => {},
  });
  const script = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/)?.[1];
  const aliasAssignment = script?.match(/window.SEC_ALIAS_DIR = [^\n]+;/)?.[0];
  const filingDirAssignment = script?.match(/var url_filing_dir = [\s\S]*?;  \/\/ remove any trailing/)?.[0];
  assert.ok(aliasAssignment && filingDirAssignment);

  let calls = 0;
  vm.runInNewContext(`${aliasAssignment}\n${filingDirAssignment}`, {
    window: {},
    location: { pathname: '/cgi-bin/viewer' },
    mark: () => { calls += 1; },
  });
  assert.equal(calls, 0);
  assert.match(html, /FilingSummary\.xml#&#39;-mark\(\)-&#39;&amp;x/);
});