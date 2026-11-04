export function attachSidebarResizer(sidebar, { min = 340, maxRatio = .90, growRight = true } = {}) {
    if (!sidebar) return;

    const handle = sidebar.parentElement.querySelector(".sidebar-resizer")
    if (!handle) return;


    let dragging = false, startX = 0, startW = 0;

    handle.addEventListener("mousedown", (event: MouseEvent) => {
        dragging = true;
        startX = event.clientX;
        startW = sidebar.getBoundingClientRect().width;
        handle.classList.add("dragging");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        event.preventDefault()
    });


    document.addEventListener("mousemove", (event: MouseEvent) => {
        if (!dragging) return;
        const w = startW + (
            growRight
                ? event.clientX - startX
                : startX - event.clientX
        );

        sidebar.style.width = `${Math.max(min, Math.min(window.innerWidth * maxRatio, w))}px`;
    });

    document.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove("dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    });

    const observer = new MutationObserver(() => {
        if (sidebar.classList.contains('show')) {
            handle.style.display = '';
        } else {
            handle.style.display = 'none';
        }
    })

    observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
}

export function attachDockResizer(dock: HTMLElement | null, { min = 120, maxRatio = .85 } = {}) {
    if (!dock) return;

    const handle = dock.querySelector(".dock-resizer") as HTMLElement | null;
    if (!handle) return;

    let dragging = false, startY = 0, startH = 0;

    handle.addEventListener("mousedown", (event: MouseEvent) => {
        dragging = true;
        startY = event.clientY;
        startH = dock.getBoundingClientRect().height;
        handle.classList.add("dragging");
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";

        event.preventDefault()
    });

    document.addEventListener("mousemove", (event: MouseEvent) => {
        if (!dragging) return;
        const h = startH + (startY - event.clientY);
        const maxH = (dock.parentElement?.getBoundingClientRect().height || window.innerHeight) * maxRatio;

        dock.style.height = `${Math.max(min, Math.min(maxH, h))}px`;
    });

    document.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove("dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    });
}