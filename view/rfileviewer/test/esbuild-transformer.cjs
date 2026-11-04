// Jest transformer: converts ESM (including ../viewer-common-src, which has no package.json) to CJS.
const { transformSync, version } = require('esbuild');
const { createHash } = require('crypto');
const { readFileSync } = require('fs');

const selfSource = readFileSync(__filename, 'utf8');

module.exports = {
  getCacheKey(sourceText, sourcePath) {
    return createHash('sha256').update(selfSource).update(version).update(sourcePath).update(sourceText).digest('hex');
  },
  process(sourceText, sourcePath) {
    const { code, map } = transformSync(sourceText, {
      loader: 'js',
      format: 'cjs',
      target: 'node18',
      sourcemap: true,
      sourcefile: sourcePath,
      supported: { 'dynamic-import': false },
      define: { 'import.meta.url': '__jestImportMetaUrl' },
      banner: "const __jestImportMetaUrl = require('url').pathToFileURL(__filename).href;",
    });
    return { code, map };
  },
};
