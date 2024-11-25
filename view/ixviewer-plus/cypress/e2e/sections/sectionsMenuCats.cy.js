import { selectors } from '../../utils/selectors'

describe(`Sections | Menu Categories`, () => {
    it(`should be listed only once per instance`, () => {
        cy.loadByAccessionNum('000095017024015979');

        // open sections sidebar
        cy.get(selectors.sectionsHeader).click();

        cy.get('div[id="instance-body-sectionDoc-10-Q"]').find('[id^="sectionDoc-10-Q--"]')
            .should('have.length', 6);
    });
});
