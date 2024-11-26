describe('Font CSS JS requests', () => {
    it('css file loads', () => {
        cy.request(`https://www.sec.gov/ixviewer/js/css/app.css`).then(resp => {
            cy.log(resp)
            expect(resp.status).to.equal(200)
        })
    })

    it('web font loads', () => {
        cy.request(`https://www.sec.gov/ixviewer/js/lib/fontawesome/webfonts/fa-solid-900.woff2`).then(resp => {
            cy.log(resp)
            expect(resp.status).to.equal(200)
        })
    })
})
