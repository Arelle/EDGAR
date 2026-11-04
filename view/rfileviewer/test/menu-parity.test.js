import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transform } from '../src/transform.js';
import { parseFilingSummary } from '../../viewer-common-src/parser.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe('Interactive Data Menu parity (EER-817)', () => {
  test('Fixture FilingSummary produces stable categories & order', async () => {
    const xml = fs.readFileSync(path.join(testDir, '../samples/FilingSummary_sample.xml'), 'utf-8');
    const fsJson = await parseFilingSummary(xml, () => {});
    const html = transform(fsJson, 'TEST-ACCESSION');
    expect(html).toMatchSnapshot();
  });
});

/**
 * Per EER‑817:
 *  - Create test cases per form-group; retain capture library of expected outputs. [1](https://teams.microsoft.com/l/message/19:1a179cb1-b5cd-4c40-83f0-d79eba92225a_7b5595f5-3153-4b76-a1e8-b73d860e68d0@unq.gbl.spaces/1696016698274?context=%7B%22contextType%22:%22chat%22%7D)
 * You can add more tests by reading FilingSummary.xml from dev links you shared. [4](https://outlook.office365.com/owa/?ItemID=AAMkADc0YzQ0NjY2LTM2OTAtNDU5Zi1hMGMyLWVlM2JjMjI2Njk0YQBGAAAAAABFiSkKYuqXQopp1rOe2LSSBwB6JGs60dn1SqtqDzcgDtNjAAAAAyLMAADMOeHMTPwbTKIVVernjJzXAAOINaTbAAA%3d&exvsurl=1&viewmodel=ReadMessageItem)
 */

