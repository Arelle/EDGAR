// Usage: node junitSummary.mjs <junitDir> <title> [--annotate] [--html <file>]
// Writes a Markdown summary of Cypress JUnit results to $GITHUB_STEP_SUMMARY (or stdout),
// and optionally a self-contained HTML report (e.g. to attach to Jira as test evidence).
import fs from 'node:fs'
import path from 'node:path'

const [dir = 'cypress/reports/junit', title = 'Cypress results', ...flags] = process.argv.slice(2)
const annotate = flags.includes('--annotate')
const htmlFile = flags.includes('--html') ? flags[flags.indexOf('--html') + 1] : null

const decode = (s = '') => s
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const attr = (attrs, name) => decode(attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1])
const cell = (s) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.xml')) : []
const specs = new Map()
const failures = []
const tests = []

for (const file of files) {
    const xml = fs.readFileSync(path.join(dir, file), 'utf8')
    // mocha-junit-reporter writes one file per spec; the spec path is on the root suite
    const specFile = xml.match(/<testsuite\b[^>]*\bfile="([^"]*)"/)?.[1]
    const testcases = [...xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)]
    if (!specFile && !testcases.length) continue
    const spec = specFile ?? file
    const stats = specs.get(spec) ?? { passed: 0, failed: 0, skipped: 0, time: 0 }

    for (const [, attrs, body = ''] of testcases) {
        const time = Number(attr(attrs, 'time')) || 0
        stats.time += time
        const failure = body.match(/<failure\b([^>]*)>/)
        const test = { spec, name: attr(attrs, 'name'), time, status: 'passed', message: '' }
        if (failure) {
            stats.failed++
            Object.assign(test, { status: 'failed', message: attr(failure[1], 'message') })
            failures.push({ spec, test: test.name, message: test.message })
        } else if (/<skipped\b/.test(body)) {
            stats.skipped++
            test.status = 'skipped'
        } else {
            stats.passed++
        }
        tests.push(test)
    }
    specs.set(spec, stats)
}

const totals = [...specs.values()].reduce((t, s) => ({
    passed: t.passed + s.passed, failed: t.failed + s.failed, skipped: t.skipped + s.skipped,
}), { passed: 0, failed: 0, skipped: 0 })

const lines = [`## ${totals.failed ? '❌' : '✅'} ${title}`, '']
if (!specs.size) {
    lines.push('_No JUnit results found._')
} else {
    lines.push(`**${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped** across ${specs.size} specs`, '')
    if (failures.length) {
        lines.push('### Failures', '', '| Spec | Test | Error |', '| --- | --- | --- |')
        failures.forEach(f => lines.push(`| ${cell(f.spec)} | ${cell(f.test)} | ${cell(f.message)} |`))
        lines.push('')
    }
    lines.push('<details><summary>All specs</summary>', '', '| Spec | Passed | Failed | Skipped | Time (s) |', '| --- | --: | --: | --: | --: |')
    ;[...specs].sort(([a], [b]) => a.localeCompare(b)).forEach(([spec, s]) =>
        lines.push(`| ${s.failed ? '❌' : '✅'} ${cell(spec)} | ${s.passed} | ${s.failed} | ${s.skipped} | ${s.time.toFixed(1)} |`))
    lines.push('', '</details>')
}

const markdown = lines.join('\n') + '\n'
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
else process.stdout.write(markdown)

if (annotate) {
    const esc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
    failures.forEach(f => console.log(`::error file=${f.spec},title=${esc(f.test).replace(/[:,]/g, ' ')}::${esc(f.message)}`))
}

if (htmlFile) {
    const h = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_REF_NAME, GITHUB_HEAD_REF, GITHUB_SHA, GITHUB_ACTOR } = process.env
    const runUrl = GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : ''
    const meta = [
        ['Generated', new Date().toISOString()],
        ['Repository', GITHUB_REPOSITORY],
        ['Branch', GITHUB_HEAD_REF || GITHUB_REF_NAME],
        ['Commit', GITHUB_SHA],
        ['Triggered by', GITHUB_ACTOR],
    ].filter(([, v]) => v)
    const icon = { passed: '✅', failed: '❌', skipped: '⏭️' }
    const specRows = [...specs].sort(([a], [b]) => a.localeCompare(b)).map(([spec, s]) => `
<details${s.failed ? ' open' : ''}><summary>${s.failed ? '❌' : '✅'} <b>${h(spec)}</b> — ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped (${s.time.toFixed(1)}s)</summary>
<table><tr><th></th><th>Test</th><th>Time (s)</th><th>Error</th></tr>
${tests.filter(t => t.spec === spec).map(t =>
    `<tr class="${t.status}"><td>${icon[t.status]}</td><td>${h(t.name)}</td><td>${t.time.toFixed(1)}</td><td>${h(t.message)}</td></tr>`).join('\n')}
</table></details>`).join('\n')

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${h(title)}</title>
<style>
body{font-family:system-ui,Arial,sans-serif;margin:2rem;color:#222}
table{border-collapse:collapse;width:100%;margin:.5rem 0 1rem}
th,td{border:1px solid #ddd;padding:4px 8px;text-align:left;vertical-align:top;font-size:.9rem}
th{background:#f4f4f4}
tr.failed td{background:#fdecea}
.meta td:first-child{font-weight:bold;width:10rem}
.totals{font-size:1.1rem;margin:1rem 0}
details{margin:.25rem 0}summary{cursor:pointer}
</style></head><body>
<h1>${totals.failed ? '❌' : '✅'} ${h(title)}</h1>
<table class="meta">${meta.map(([k, v]) => `<tr><td>${k}</td><td>${h(v)}</td></tr>`).join('')}
${runUrl ? `<tr><td>Workflow run</td><td><a href="${h(runUrl)}">${h(runUrl)}</a></td></tr>` : ''}</table>
<p class="totals"><b>${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped</b> across ${specs.size} specs (${tests.length} tests)</p>
${failures.length ? `<h2>Failures</h2><table><tr><th>Spec</th><th>Test</th><th>Error</th></tr>${failures.map(f =>
    `<tr class="failed"><td>${h(f.spec)}</td><td>${h(f.test)}</td><td>${h(f.message)}</td></tr>`).join('')}</table>` : ''}
<h2>All specs</h2>
${specRows}
</body></html>
`
    fs.mkdirSync(path.dirname(htmlFile), { recursive: true })
    fs.writeFileSync(htmlFile, html)
}
