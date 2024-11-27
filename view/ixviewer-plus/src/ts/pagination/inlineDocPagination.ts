import { Constants } from "../constants/constants";

const toPrev = () => {
    const currentInstance = Constants.getInstanceFiles.find(element => element.current);
    const currentXHTML = currentInstance?.docs.find(element => element.current);

    // e.g section[filing-url="ea185980-6k_inspiratech.htm"]
    const currentDocElem = document.querySelector(`section[filing-url="${currentXHTML?.slug}"]`);
    const currentScrollPosition = document.getElementById('dynamic-xbrl-form')?.scrollTop as number;
    const pageBreakNodes = Array.from(currentDocElem?.querySelectorAll(`[style*="break-after"],[style*="break-before"]`) || [])

    const prevBreak = pageBreakNodes
        .reverse()
        .map((breakElem) => {
            if ((currentScrollPosition - 40 > (breakElem as HTMLElement).offsetTop)) {
                return breakElem;
            }
        }).filter(Boolean)[0];

    if (prevBreak) {
        const prevPage = (prevBreak as HTMLElement);
        (prevPage).scrollIntoView();
    } else {
        toTop();
    }
};

const toNext = () => {
    const currentInstance = Constants.getInstanceFiles.find(element => element.current);
    const currentXHTML = currentInstance?.docs.find(element => element.current);

    const currentDocElem = document.querySelector(`section[filing-url="${currentXHTML?.slug}"]`);
    const viewHieght = (document.getElementById('dynamic-xbrl-form') as HTMLElement).offsetHeight;
    const currentScrollPosition = document.getElementById('dynamic-xbrl-form')?.scrollTop as number;
    const pageBreakNodes = currentDocElem?.querySelectorAll(`[style*="break-after"],[style*="break-before"]`) || [];

    const nextBreak = Array.from(pageBreakNodes)
        .map((breakElem) => {
            if (breakElem) {
                if ((breakElem as HTMLElement).offsetTop - 5 > currentScrollPosition) {
                    return breakElem;
                }
            }
        }).filter(Boolean)[0];

    if (nextBreak) {
        const next = nextBreak as HTMLElement;
        const elemCloseToBtmOfPage = (currentDocElem as HTMLElement).offsetHeight - viewHieght < next.offsetTop;
        if (elemCloseToBtmOfPage) {
            // without this line our scrollable element (inline form) will shift up if we scroll to top of elem that is too close to bottom of page
            toBottomOfInlineDoc();
        } else {
            next.scrollIntoView(); // top of elem to top of view
        }
    } else {
        toBottomOfInlineDoc();
    }
}

const toTop = () => {
    const formElement = document.getElementById('dynamic-xbrl-form');
    (formElement as HTMLElement).scrollTop = 0;
}

export const toBottomOfInlineDoc = () => {
    const formElement = document.getElementById("dynamic-xbrl-form") as HTMLElement;
    formElement?.scrollTo({top: formElement.scrollHeight, behavior: 'smooth'});
}

export const buildInlineDocPagination = () =>
{
    const paginationHtmlString =
        `<nav class="doc-pagination" data-cy="doc-pagination">
            <ul id="html-pagination" class="pagination pagination-sm mb-0">
                <li class="page-item">
                    <a class="page-link text-body" tabindex="13" id="to-top-btn">
                        <i class="fas fa-lg fa-angle-double-left"></i>
                    </a>
                </li>
                <li class="page-item">
                    <a class="page-link text-body" tabindex="13" id="to-prev-btn">
                        <i class="fas fa-lg fa-angle-left"></i>
                    </a>
                </li>
                <li class="page-item ">
                    <a class="page-link text-body" tabindex="13" id="to-next-btn">
                        <i class="fas fa-lg fa-angle-right"></i>
                    </a>
                </li>
                <li class="page-item ">
                    <a class="page-link text-body" tabindex="13" id="to-bottom-btn">
                        <i class="fas fa-lg fa-angle-double-right"></i>
                    </a>
                </li>
            </ul>
        </nav>`;

    const paginationParser = new DOMParser();
    const paginationElemDoc = paginationParser.parseFromString(paginationHtmlString, 'text/html');
    const paginationContents = paginationElemDoc.querySelector('nav') as HTMLElement;

    return paginationContents;
}

export const addPaginationListeners = () => {
    document.getElementById('to-top-btn')?.addEventListener("click", () => {
        toTop();
    });
    document.getElementById('to-top-btn')?.addEventListener("keyup", () => {
        toTop();
    });

    document.getElementById('to-prev-btn')?.addEventListener("click", () => {
        toPrev();
    });
    document.getElementById('to-prev-btn')?.addEventListener("keyup", () => {
        toPrev();
    });

    document.getElementById('to-next-btn')?.addEventListener("click", () => {
        toNext();
    });
    document.getElementById('to-next-btn')?.addEventListener("keyup", () => {
        toNext();
    });

    document.getElementById('to-bottom-btn')?.addEventListener("click", () => {
        toBottomOfInlineDoc();
    });
    document.getElementById('to-bottom-btn')?.addEventListener("keyup", () => {
        toBottomOfInlineDoc();
    });
}
