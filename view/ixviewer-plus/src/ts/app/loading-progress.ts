/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


let progress = 0;
const MAX_PROGRESS = 5;
/*
If progress does not reach level 5 and is not hidden, it will linger.
*/

export function startProgress() {
    progress = 0;
    document.querySelector("#loading-animation")?.classList.remove("d-none");
    document.querySelector("#loading")?.classList.remove("d-none");
}
export function incrementProgress(finish = false): void {
    progress++;
    if (finish) {
        progress = MAX_PROGRESS;
    } else {
        (document.querySelector("#loading") as HTMLElement).style.setProperty("--progress", `${progress / MAX_PROGRESS * 100}`);
    }
    if (progress >= MAX_PROGRESS || finish) {
        // setTimeout(() => hideLoadingUi(), 300);
        hideLoadingUi()
    }
}
export function showLoadingUi() {
    document.querySelector("#loading-animation")?.classList.remove("d-none");
}
export async function hideLoadingUi() {
    document.querySelector("#loading-animation")?.classList.add("d-none");
    await new Promise(requestAnimationFrame);
}
