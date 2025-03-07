/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FactMap } from "../facts/map";
import { UserFiltersMoreFiltersAxes } from "./more-filters-axes";
import { stopPropPrevDefault } from "../helpers/utils";

export const UserFiltersMoreFiltersAxesSetUp = {

    filtersSet: false,

    axisOptions: [],

    setAxes: () => {
        const axis = FactMap.getAllAxis();
        document.getElementById("filters-axis-count")!.innerText = axis.length.toString();
        UserFiltersMoreFiltersAxesSetUp.populateCollapse(axis);
    },

    populateCollapse: (axes: Array<{ type: string, value: string }>) => {
        let typedCount = 0;
        let explicitCount = 0;
        const isContainerBuild = [false, false];
        axes.forEach((axis) => {
            const indexType = axis.type === "explicit" ? 0 : 1;
            axis.type === "explicit" ? explicitCount++ : typedCount++;
            if (!isContainerBuild[indexType]) {
                const div = 
                    `<div class="collapse" data-bs-parent="#user-filters-axis" id="axes-filters-accordion-${indexType}">
                    </div>`;
                const parser = new DOMParser();
                const labelDoc = parser.parseFromString(div, 'text/html');
                const AxisTypeHeader = labelDoc.querySelector('body > div') as HTMLElement;
                isContainerBuild[indexType] = true;

                document.getElementById("user-filters-axis")?.children[indexType].append(AxisTypeHeader);
            }

            const div = document.createElement("div");
            div.classList.add("d-flex");
            div.classList.add("justify-content-between");
            div.classList.add("align-items-center");
            div.classList.add("w-100");
            div.classList.add("px-2");

            const div2 = document.createElement("div");
            div2.classList.add("form-check");

            const label = document.createElement("label");
            label.classList.add("form-check-label");
            label.classList.add("mb-0");
            label.setAttribute('for', axis.value);

            const input = document.createElement("input");
            input.setAttribute("title", "Select/Deselect this option.");
            input.setAttribute("type", "checkbox");
            input.setAttribute("tabindex", "9");
            input.classList.add("form-check-input");
            input.setAttribute('id', axis.value);
            input.setAttribute('name', axis.value);
            input.addEventListener("click", () => {
                UserFiltersMoreFiltersAxes.clickEvent(axis.value);
            });
            input.addEventListener("keyup", (event: KeyboardEvent) => {
                if (event instanceof KeyboardEvent && (event.key === 'Space' || event.key === ' ')) {
                    stopPropPrevDefault(event);
                    UserFiltersMoreFiltersAxes.clickEvent(axis.value);
                }
            });

            const text = document.createTextNode(axis.value);
            label.append(text);
            div2.append(input);
            div2.append(label);
            div.append(div2);
            document.getElementById(`axes-filters-accordion-${indexType}`)?.append(div);
        });

        // update typed / explitic counts
        if (typedCount > 0) {
            document.getElementById("user-filters-axis")?.children[1].classList.remove("d-none");
            const typedNode = document.createTextNode(typedCount.toString());
            document.getElementById("axis-typed-count")?.append(typedNode);
        }
        if (explicitCount > 0) {
            document.getElementById("user-filters-axis")?.children[0].classList.remove("d-none");
            const explicitNode = document.createTextNode(explicitCount.toString());
            document.getElementById("axis-explicit-count")?.append(explicitNode);
        }

        // add eventListener(s) to select all typed / explicit options
        document.getElementById("axes-all-0")?.addEventListener("click", () => {
            UserFiltersMoreFiltersAxes.parentClick(axes.filter(element => element.type === 'explicit'), document.getElementById("axes-all-0") as HTMLInputElement);
        });
        document.getElementById("axes-all-0")?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event instanceof KeyboardEvent && (event.key === 'Space' || event.key === ' ')) {
                document.getElementById("axes-all-0")?.click();
                UserFiltersMoreFiltersAxes.parentClick(axes.filter(element => element.type === 'explicit'), document.getElementById("axes-all-0") as HTMLInputElement);
            }
        });
        document.getElementById("axes-all-1")?.addEventListener("click", () => {
            UserFiltersMoreFiltersAxes.parentClick(axes.filter(element => element.type === 'implicit'), document.getElementById("axes-all-1") as HTMLInputElement);
        });
        document.getElementById("axes-all-1")?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event instanceof KeyboardEvent && (event.key === 'Space' || event.key === ' ')) {
                document.getElementById("axes-all-1")?.click();
                UserFiltersMoreFiltersAxes.parentClick(axes.filter(element => element.type === 'implicit'), document.getElementById("axes-all-1") as HTMLInputElement);
            }
        });
    }
};
