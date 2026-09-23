/* E-Kabadi visual compatibility aliases.
   Some page styles use older variable names; keep them mapped to the
   current design-system variables so every module renders consistently. */
(function () {
    const style = document.createElement('style');
    style.id = 'ekabadi-theme-compat';
    style.textContent = `
        :root {
            --border-color: var(--border);
            --bg-muted: #edf1ee;
            --bg-surface: #ffffff;
        }
    `;
    document.head.appendChild(style);
})();
