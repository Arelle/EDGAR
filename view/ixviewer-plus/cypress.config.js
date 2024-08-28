import { defineConfig } from "cypress"

const domains = {
  local: 'local',
  sec: 'sec',
  dev1: 'dev1',
  dev2: 'dev2',
  mr: 'mr',
  testSec: 'testSec',
  // arelle gui
}

export default defineConfig({
  env: {
    domain: domains.local,
    skipScrapers: true,
    limitNumOfFilingsForTestRun: true, // Good for doing a health check of all tests
    limitOfFilingsToTest: 1,
    targetFilingAccessionNum: null,
    filingsSet: 'standard', // standard, experimental (todo), set200 (todo), or all(todo) (standard + experimental)
  },
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    screenshotOnRunFailure: false,
    numTestsKeptInMemory: 1,
    "browser": 'chrome',
    experimentalMemoryManagement: true,
    video: false,
    defaultCommandTimeout: 12000,
    requestTimeout: 12000,
    responseTimeout: 8000,
    // responseTimeout: 30000,
    experimentalRunAllSpecs: true,
    pageLoadTimeout: 4000,
    excludeSpecPattern: [
      // https://globster.xyz/
      '**/*.+(todo|skip)*.cy.js',
      '**/*.+(scrape)*.cy.js',
  ],
    viewportWidth: 1500,
    viewportHeight: 990,
    chromeWebSecurity: false,
  },
})
