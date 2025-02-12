/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


let progress = 0;
const MAX_PROGRESS = 5;
export function resetProgress()
{
    progress = 0;
    document.querySelector("#loading-animation")?.classList.remove("d-none");
    document.querySelector("#loading")?.classList.remove("d-none");
}
export function incrementProgress(): void
{
    progress++;
    (document.querySelector("#loading") as HTMLElement)
        .style.setProperty("--progress", `${progress / MAX_PROGRESS * 100}`);

    if (progress >= MAX_PROGRESS)
    {
        setTimeout(() => hideLoadingUi(), 500);
    }
}
export function showLoadingUi()
{
    document.querySelector("#loading-animation")?.classList.remove("d-none");
}
export function hideLoadingUi()
{
    document.querySelector("#loading-animation")?.classList.add("d-none");
}
