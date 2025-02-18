import { selectors } from "../../utils/selectors.mjs"

const guardForceFiling = {
    docPath: "/Archives/edgar/data/1804469/000101376223000342/ea185644-6k_guardforce.htm",
    timeout: "20000"
}

const gskFiling = {
    docPath: "/Archives/edgar/data/1131399/000119312523067105/d382677dex152.htm",
    timeout: "35000"
}

describe(`Links | External Links - Other Archives links`, () => {
    it('Should open links in a new tab', () => {
        cy.loadFiling(guardForceFiling);
        cy.get('[href="http://www.sec.gov/Archives/edgar/data/1804469/000121390021067345/ea152792-f3_guardforce.htm"]')
            .should('have.attr', 'target', '_blank'); // _blank opens in new tab of parent
    })
})