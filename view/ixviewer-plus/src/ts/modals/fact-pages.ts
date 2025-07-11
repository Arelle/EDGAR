/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { fixImages } from "../app/app-helper";
import { ConstantsFunctions } from "../constants/functions";
import { xmlToDom } from "../helpers/utils";
import { LabelEnum, SegmentClass, SingleFact } from "../interface/fact";

const formatSegment = (segment: string) => {
	if (segment) {
		let domain:string = segment.split(':')[0]
		const concept:string = segment.split(':')[1]
		domain = `<span class="font-weight-bold">${domain.toLocaleUpperCase()}</span>`;

		const dimensionLabels = [
			"Axis",
			"Member",
			"Domain",
		];
	
		let conceptFormatted = ''
		if (concept) {
			const conceptArr: string[] | null = concept.match(/[A-Z][a-z]+/g);
			conceptArr?.map((word, index, arr) => {
				if (index === arr.length -1) {
					if (dimensionLabels.includes(word)) {
						word = `[${word}]`;  // wrap dimension labels (last word) in square brackets
					}
				}
				if (word.length > 1) {
					conceptFormatted += word + ' '
				} else {
					conceptFormatted += word
				}
			})
		} else {
			return null;
		}
	
		const formattedSegment = [domain, conceptFormatted || concept].join(' ');
		return formattedSegment;
	}
	return segment;
}

const getSegmentAttr = (segment: Array<SegmentClass[] | SegmentClass>, targetAttr: keyof SegmentClass) => {
	if (segment) {
		return segment.map(seg => {
			if (Array.isArray(seg)) {
				return seg.map(nestedSeg => formatSegment(nestedSeg[targetAttr])).filter(Boolean).join('<br />');
			}
			return formatSegment(seg[targetAttr] || "");
		}).filter(Boolean).join('<br />')
	}
	return null;
};

const getMembersByType = (segment: Array<SegmentClass[] | SegmentClass>, targetType: string) => {
	/*
		Aka "dimension type" or dimension by type, per the "The XBRL Book, 6th Edition", p254
		IMPROVE: Dimensions might be better displayed as table
	*/
	if (segment) {
		const segsWithTargetType: SegmentClass[] = [];
		segment.filter(seg => {
			if (Array.isArray(seg)) {
				seg.forEach(nestedSeg => {
					if (nestedSeg.type === targetType) {
						segsWithTargetType.push(nestedSeg);
					}
				})
			}
			else if (seg.type === targetType) {
				segsWithTargetType.push(seg);
			}
		})
		return segsWithTargetType.map(seg => seg.dimension).join('<br />')
	}
	return null;
};

// Build the pages for the fact modal
export const FactPages = {

	/**
	 * Description
	 * @param {any} factInfo
	 * @param {any} idToFill:string
	 * @returns {any} html table containing all fact "attributes"
	 */
	firstPage: (factInfo: SingleFact, idToFill: string) => {
		const possibleAspects = [
			{
				name: "Tag",
				value: factInfo.name
			},
			{
				name: "Fact",
				value: factInfo.value,
				html: factInfo.isHTML,
				isAmountsOnly: factInfo.isAmountsOnly
			},
			{
				// TODO
				name: "Fact Language",
				value: factInfo['xml:lang']
			},
			{
				name: "Period",
				value: factInfo.period
			},
			{
				name: "Axis",
				value: getSegmentAttr(factInfo.segment || [], 'axis'),
				html: true
			},
			{
				name: "Member",
				value: getSegmentAttr(factInfo.segment || [], "dimension"),
				html: true
			},
			{
				name: "Typed Member",
				value: getMembersByType(factInfo.segment || [], 'implicit'),
				html: true 
			},
			{
				name: "Explicit Member",
				value: getMembersByType(factInfo.segment || [], 'explicit'),
				html: true
			},
			{
				name: "Measure",
				value: factInfo.measure
			},
			{
				name: "Scale",
				value: factInfo.scale
			},
			{
				name: "Decimals",
				value: factInfo.decimals
			},
			{
				name: "Balance",
				value: factInfo.balance
			},
			{
				name: "Sign",
				value: factInfo.isAmountsOnly ? (factInfo.isNegativeOnly ? "Negative" : "Positive") : null
			},
			{
				name: "Type",
				value: factInfo.xbrltype
			},
			{
				name: "Format",
				value: factInfo.format
			},
			{
				name: "Footnote",
				value: factInfo.footnote
			}
		];

		const elementsToReturn = document.createElement("tbody");

		possibleAspects.forEach((aspect) => {
			const debugXmlParsing = false;

			if (aspect["value"]) {
				const trElement = document.createElement("tr");
				const thElement = document.createElement("th");
				thElement.setAttribute("class", `${aspect["name"] === 'Fact' ? 'fact-collapse' : ''}`);

				const thContent = document.createTextNode(aspect["name"]);
				thElement.appendChild(thContent);

				const tdElement = document.createElement("td");
				const tdContentsDiv = document.createElement("div");
				tdContentsDiv.classList.add(aspect["name"] === 'Tag' ? "break-all" : "break-word");
				tdContentsDiv.setAttribute('data-cy', `${aspect["name"]}-value`);

				const useExperimentalFootnoteRenderer = false; 

				// footnotes
				if (useExperimentalFootnoteRenderer && aspect["name"] == "Footnote") {
					const parser = new DOMParser();
					const xmlDoc = parser.parseFromString(aspect.value, 'application/xml');

					// Error: Namespace prefix xlink for label on footnote is not defined
					if (xmlDoc.nodeType === 9) { // document type
						for (let i = 0; i < xmlDoc.childNodes.length; i++) {
							const childNode = xmlToDom(xmlDoc.childNodes[i]);
							if (childNode) {
								tdContentsDiv.appendChild(childNode)
							}
						}
					}
					const xmlBody = xmlDoc.querySelector('body') as HTMLElement
					const xmlDom = xmlToDom(xmlDoc);
					if (DEBUGJS && debugXmlParsing) {
						console.log('xmlBody', xmlBody)
						console.log('xmlDom', xmlDom)
					}
					// divElement.append(xmlDom.querySelector('body') as HTMLElement);
					tdElement.appendChild(tdContentsDiv);

				} else if (aspect["html"]) {
					tdContentsDiv.classList.add('fact-value-modal');
					tdContentsDiv.classList.add("position-relative");
					const parser = new DOMParser();

					// Fact values may contain unsafe HTML, so we'll sanitize it before adding to the DOM
					const sanitizedHtml = ConstantsFunctions.sanitizeHtml(aspect.value);
					const htmlDoc = parser.parseFromString(sanitizedHtml, 'text/html');
					htmlDoc.body.classList.add('bg-inherit');
					fixImages(htmlDoc);
					tdContentsDiv.append(htmlDoc.body as HTMLElement);
					tdElement.appendChild(tdContentsDiv);
				} else {
					//convert fact string to number to add in formatting
					if (aspect["name"] === "Fact") {
						const factStringToNumber = Number(aspect["value"]);
						if (aspect["isAmountsOnly"] && !Number.isNaN(factStringToNumber)) {
							if (factInfo.decimalsVal && factInfo.decimalsVal >= 0) {
								aspect["value"] = factStringToNumber.toLocaleString("en-US", { "maximumFractionDigits": 10, "minimumFractionDigits": factInfo.decimalsVal });
							} else {
								aspect["value"] = factStringToNumber.toLocaleString("en-US", { "maximumFractionDigits": 10 });
							}
						}
					}

					tdContentsDiv.textContent = aspect["value"].toString();
					tdElement.appendChild(tdContentsDiv);
				}

				trElement.appendChild(thElement);
				trElement.appendChild(tdElement);
				elementsToReturn.append(trElement);
			}
		});

		FactPages.fillCarousel(idToFill, elementsToReturn.firstElementChild ? elementsToReturn : FactPages.noDataCarousel());
	},

	secondPage: (factInfo: SingleFact, idToFill: string) => {
		const elementsToReturn = document.createElement("tbody");
		factInfo.labels.forEach((current) => {
			for (const property in current) {
				const trElement = document.createElement("tr");
				const thElement = document.createElement("th");
				const thContent = document.createTextNode(property);
				thElement.appendChild(thContent);

				const tdElement = document.createElement("td");
				const divElement = document.createElement("div");
				const divContent = document.createTextNode((current as any)[property]);
				divElement.appendChild(divContent);
				tdElement.appendChild(divElement);

				trElement.appendChild(thElement);
				trElement.appendChild(tdElement);
				elementsToReturn.appendChild(trElement);
			}
		});
		FactPages.fillCarousel(idToFill, elementsToReturn.firstElementChild ? elementsToReturn : FactPages.noDataCarousel());
	},

	thirdPage: (factInfo: SingleFact, idToFill: string) => {

		const elementsToReturn = document.createElement("tbody");
		if (factInfo.references) {
			//TODO: fix typings
			factInfo.references.forEach((topRef: any, index, array) => {
				topRef.forEach((nestedRef: any) => {
					for (const [key, val] of Object.entries(nestedRef)) {
						const trElement = document.createElement("tr");
	
						const thElement = document.createElement("th");
	
						const aTag = document.createElement('a');
						aTag.setAttribute('href', String(val));
						aTag.setAttribute('target', '_blank');
						aTag.setAttribute('rel', 'noopener noreferrer');
	
						if (val === 'URI') {
							const small = document.createElement('small');
							const smallContent = document.createTextNode(' (Will Leave SEC Website)');
							small.appendChild(smallContent);
							const thContent = document.createTextNode(`${key}`);
							thElement.appendChild(thContent);
							thElement.appendChild(small);
						} else {
							const thContent = document.createTextNode(key);
							thElement.appendChild(thContent);
						}
	
						const tdElement = document.createElement("td");
	
						const divElement = document.createElement("div");
	
						if (val === 'URI') {
							const aTag = document.createElement('a');
							aTag.setAttribute('href', val);
							aTag.setAttribute('target', '_blank');
							aTag.setAttribute('rel', 'noopener noreferrer');
	
							const aContent = document.createTextNode(val);
							aTag.appendChild(aContent);
							tdElement.appendChild(aTag);
						} else {
							const divContent = document.createTextNode(String(val));
							divElement.appendChild(divContent);
							tdElement.appendChild(divElement);
						}
						trElement.appendChild(thElement);
						trElement.appendChild(tdElement);
						elementsToReturn.appendChild(trElement);
					}
				});
				if (index !== array.length) {
					const trEmptyElement = document.createElement("tr");
					const tdEmptyElement = document.createElement("td");
					tdEmptyElement.setAttribute("class", "blank-table-row");
					tdEmptyElement.setAttribute("colspan", "3");
					trEmptyElement.appendChild(tdEmptyElement);
					elementsToReturn.appendChild(trEmptyElement);
				}
	
			});
		}
		FactPages.fillCarousel(idToFill, elementsToReturn.firstElementChild ? elementsToReturn : FactPages.noDataCarousel());
	},

	fourthPage: (factInfo: SingleFact, idToFill: string) => {

		const calculations = [...factInfo.calculations];

		calculations.unshift(
		[{
			label: LabelEnum.Balance,
			value: factInfo.balance ? factInfo.balance : 'N/A',
		}]);

		const elementsToReturn = document.createElement("tbody");

		calculations.forEach((current, index, array) => {
			current.forEach((nestedCurrent) => {

				const trElement = document.createElement("tr");

				const thElement = document.createElement("th");
				const thContent = document.createTextNode(nestedCurrent.label);
				thElement.appendChild(thContent);

				const tdElement = document.createElement("td");

				const divElement = document.createElement("div");

				const divContent = document.createTextNode(nestedCurrent.value);
				divElement.appendChild(divContent);
				tdElement.appendChild(divElement);

				trElement.appendChild(thElement);
				trElement.appendChild(tdElement);
				elementsToReturn.appendChild(trElement);
			});
			if (index !== array.length) {
				const trEmptyElement = document.createElement("tr");
				const tdEmptyElement = document.createElement("td");
				tdEmptyElement.setAttribute("class", "blank-table-row");
				tdEmptyElement.setAttribute("colspan", "3");
				trEmptyElement.appendChild(tdEmptyElement);
				elementsToReturn.appendChild(trEmptyElement);
			}
		});
		FactPages.fillCarousel(idToFill, elementsToReturn.firstElementChild ? elementsToReturn : FactPages.noDataCarousel());
	},

	noDataCarousel: () => {
		const trElement = document.createElement("tr");

		const tdElement = document.createElement("td");

		const tdContent = document.createTextNode("No Data.");
		tdElement.appendChild(tdContent);

		trElement.appendChild(tdElement);

		return trElement;
	},

	fillCarousel: (idToFill: string, generatedHTML: HTMLElement) => {
		ConstantsFunctions.emptyHTMLByID(idToFill);

		document.getElementById(idToFill)?.appendChild(generatedHTML);
	}
};
