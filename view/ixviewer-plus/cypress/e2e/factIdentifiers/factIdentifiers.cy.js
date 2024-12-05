// describe("Fact Identifiers", () =>
// {
//     describe("facts should have unique IDs", () =>
//     {
//         const data =
//         [
//             ["/Archives/edgar/data/1837493/000101376223000425/ea185980ex99-1_inspiratech.htm", 381],
//             ["/Archives/edgar/data/1517396/000121390021056659/stratasys-991.htm", 809],
//         ];

//         for(let [filing, factCount] of data)
//         {
//             it(`${filing}: ${factCount} `, () =>
//             {
//                 cy.visit(filing);
                
//                 for(let i=0; i<factCount; i++)
//                 {
//                     cy.get(`#fact-identifier-${i}`).should("have.length", 1);
//                 }
//             });
//         }
//     });
// });
