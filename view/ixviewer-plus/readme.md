# SEC IXViewer - Plus

Main dev branch (Plus): ix-dev
(Legacy has it own repo now.)


**Your Local Machine must have**:
> [NodeJS](https://nodejs.org/en/download) V14+
> [NPM](https://nodejs.org/en/download) (this comes automatically with NodeJS)

---

## To Install / Set Up on your Local Machine
1. [Clone](https://docs.gitlab.com/ee/gitlab-basics/start-using-git.html#clone-a-repository) this repository
2. Go to the root of this project in your terminal (this is where **package.json** lives)
3. Run `npm install` in your terminal.  
   - This could take a few minutes
4. Fix cypress (if you're going to run cypress yourself)
   `bash fix-cypress.sh`
   Cypress doesn't play well with xhtml so we have to run this script.
5. Create filings repo (in group2 (parent to ixviewer-2)), and link /Archives/edgar/data to the filing in that repo.
   localhost only / dev machines; NOT dev1.
   `bash copy-test-files.sh`
   This step takes a while...

## Set Up Local Filings
   Note: this should be done automatically by running step 5 in setup above
   - first, clone **ix-test-documents** repo (branch: **test-filings-ix-viewer**) as a sibling to ixviewer2 repo.  Might use **master** branch instead soon.
   - when running localhost (`npm run dev-serve`) webpack looks for static assets on ./dist.  Build a Symlink from ./dist to filings repo with:
      - powershell: `New-Item -ItemType Junction -Path "./dist/Archives" -Target "C:/group2/ix-test-documents/Archives"`
      - (or bash (slow)) `cmd //c "mklink /J .\dist\Archives ..\ix-test-documents\Archives"`

## NPM Commands
note: these instructions may be out of date. Best to just go read package.json
Run these in a terminal from the root of your project

1. Run the project in DEVELOPMENT MODE
   `npm run dev-serve`
2. Run the project in DEVELOPMENT MODE and include a bundle analyzer
   `npm run dev-serve-analyze`
3. Run the project in PRODUCTION MODE with a development server
   `npm run prod-serve`
4. Run the project in PRODUCTION MODE with a development server and include a bundle analyzer
   `npm run prod-serve-analyze`
5. Run the unit tests (not really built out)
   `npm run unit-test`
6. Build the PRODUCTION application
   Default prod build (sec or dev1, etc) will be built in ./dist
   `npm run build-prod`
7. Build the WORKSTATION version of application
   will be built in ./dist-ws
   `npm run build-workstation`
8. Open Cypress Gui
   `npx cypress open`
9. Run cypress command line
   `npx cypress run`
10. Create standardFilings.js
   `create-standard-filings`

## NOTES
- If you are developing and need filings to develop against:
  1.  Run `npm run get-filings-menu`.
      - Answer all prompts in the terminal, allow script to run (could take a while)
  2.  Once that is accomplished, run `npm run dev-serve` OR `npm run dev-serve-analyze`.
  3.  Open a browser and navigate to: `http://localhost:3000/ix.xhtml`
  4.  You will be presented with a table of all filings that you gathered during step 1.
- If you are developing, the linter runs automatically when you save any files within {{project_root}}/src. These errors / warnings are to be fixed prior to pushing up code for review.
- eslint rules are in .eslintrc in root

## Cypress Quick Start
1. Cypress install should now be automatic with `npm i` (no longer have to download zip)
2. To Run against an xml app you will have to edit a cypress file found on a path similar to: `C:\Users\nelsonro\AppData\Local\Cypress\Cache\13.3.1\Cypress\resources\app\packages\runner\dist\injection.js`.  Add blank lines before an after the single (long) line of code.  On the first blank line add `//<![CDATA[`.  On the last line put `//]]>`
3. Launch the cypress gui with `npx cypress open`.
4. To use particular domain for gui see env var 'domain' in cypress.config.js
5. See other options in config for targeting filings, limiting filings, etc.
6. To update filings set from a csv file use the script at 'cypress/utils/filingsCsvToJson.mjs'
   a. you'll have to download a csv, probably from https://secoit.sharepoint.com/:x:/r/teams/OITEDGAR-XBRL-Development-IXViewer/_layouts/15/Doc.aspx?sourcedoc=%7B7D77ECA6-7301-49DA-94C7-2BF380F5E1DE%7D&file=IXViewerTestCases.xlsx&action=default&mobileredirect=true

## Cypress command line
1. run all tests with `npx cypress run --browser 'chrome'`
   run folder: `npx cypress run --spec 'cypress/e2e/factFiltering/*.cy.js' --browser 'chrome'`
   run spec:   `npx cypress run --spec 'cypress/e2e/factFiltering/resetFilters.cy.js' --browser 'chrome'`
2. to target a particular domain from the command line use --env flag:
      `npx cypress run --env "domain=dev1" --browser 'chrome'`
Note: specifying chrome b/c electron is default and seems to be brittle.

## Troubleshooting
Cannot unzip
link of interest: https://artifactory.edgar.sec.gov/ui/packages/npm:%2F%2Fcypress?name=cypress&type=packages


## (WIP) Install Cypress Binary using Scripts (TODO: write script to do step 3 above and delete cypress from package.json (so it doesn't throw errors on dev1 where cypress is not installed))
- download
- install
- run scripts to delete from package.json?
- run script to change CDATA in file.
- instructions for reinstall
   - delete old cypress installs from local and roaming
   - follow stesp above

## Build Prod
npm run build-prod

## Deploy Prod
zip the /dist/ folder and re-name to something that matches releae version => e.g. release_24.2.01
copy to sharepoint folder and update the release notes table in confluence.

## git
dev branches
plus: ix-dev
legacy: v23-dev
