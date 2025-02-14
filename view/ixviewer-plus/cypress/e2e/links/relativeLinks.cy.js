import { selectors } from "../../utils/selectors.mjs"

const guardForceFiling = {
    docPath: "/Archives/edgar/data/1804469/000101376223000342/ea185644-6k_guardforce.htm",
    timeout: "20000"
}

describe(`Links | Relative Links (in same folder as filing)`, () => {
    it('Should open sibling file in new tab', () => {
        cy.loadFiling(guardForceFiling);        
        // original link in htm should be transformed to include folder path to doc
        // original:           ea185644ex99-1_guardforce.htm
        const expectedUrl = '/Archives/edgar/data/1804469/000101376223000342/ea185644ex99-1_guardforce.htm'
        cy.get(`a[href$="${expectedUrl}"]`).should('have.attr', 'target', '_blank'); // should open in new tab 
    })
})
