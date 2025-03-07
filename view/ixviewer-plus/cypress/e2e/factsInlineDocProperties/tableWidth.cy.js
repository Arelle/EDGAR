import { selectors } from '../../utils/selectors'

describe('Table Width Test', () => {
    it("getComputedStyle method", () => {
        cy.viewport(1920, 1080);
        cy.loadByAccessionNum('000175392625000093');
        cy.get('table').contains('table', '5225 Wiley Post Way, Suite 500').then(($table) => {
            const width = window.getComputedStyle($table[0]).width;
            cy.expect(width).to.equal('1870px');
        })
    })
})