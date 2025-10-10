import { selectors } from '../../utils/selectors'

describe('Table Width Test', () => {
    it("getComputedStyle method", () => {
        cy.viewport(1920, 1080);
        cy.loadByAccessionNum('000175392625000093');
        cy.get('table').contains('table', '5225 Wiley Post Way, Suite 500').then(($table) => {
            let width = window.getComputedStyle($table[0]).width;
            //Width is currently a string like '1870px'. This will strip the letters out and convert it to a number
            width = Number(width.replace(/px/g,''));
            //Giving it 1% wiggle room so it doesn't have to be pixel-perfect
            cy.expect(width).to.be.within(0.99*1870, 1.01*1870);
        })
    })
})