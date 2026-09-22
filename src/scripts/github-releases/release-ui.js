import { GithubReleaseEnhancer } from './enhancer.js';



const releaseUi = {
            styles: {
                commonStylesTemplate() {
                    const GRE = GithubReleaseEnhancer; const C = GRE.config; const CN = C.CLASS_NAMES;
                    return `
                        :root { --ghre-notes-max-height: ${GRE.store.state.releaseNotesMaxHeight || C.RELEASE_NOTES_MAX_HEIGHT_DEFAULT}px; }
                        .${CN.FILTER_CONTAINER} { position: relative; display: inline-flex; align-items: center; margin-left: auto; }
                        .${CN.PLATFORM_OPTIONS} { background-color: var(--overlay-bgColor); border: 0; border-radius: var(--borderRadius-large); box-shadow: var(--shadow-floating-small); position: absolute; right: 0; top: 100%; margin-top: 4px; z-index: 100; display: none; width: max-content; min-width: 280px; }
                        .${CN.PLATFORM_OPTIONS_INNER} { max-height: 400px; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 2px; }
                        .${CN.POPUP_HEADER} { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; }
                        .${CN.POPUP_SETTINGS_BTN} { background: none; border: none; cursor: pointer; color: var(--fgColor-muted); padding: 4px; line-height: 0; border-radius: 4px; }
                        .${CN.POPUP_SETTINGS_BTN}:hover { background-color: var(--bgColor-muted); color: var(--fgColor-default); }
                        .${CN.PLATFORM_OPTIONS_GRID} { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px 8px; }
                        .${CN.FILTER_CONTAINER}.${CN.PLATFORM_OPTIONS_OPEN} .${CN.PLATFORM_OPTIONS} { display: block; }
                        .${CN.OPTIONS_TITLE} { padding: 4px 8px; font-size: 12px; font-weight: bold; color: var(--fgColor-muted); text-transform: uppercase; display: block; pointer-events: none; grid-column: 1 / -1; }
                        .ghre-action-buttons-container { grid-column: 1 / -1; display: flex; gap: 8px; padding: 2px 8px; }
                        .${CN.ACTION_BUTTON} { flex: 1 1 0; padding: 5px; font-size: 12px; }
                        ${C.SELECTORS.ASSETS_SUMMARY} { display: flex !important; align-items: center !important; width: 100%; }
                        .${CN.SUMMARY_MARKER_ICON} { margin-right: 4px; transition: transform 0.15s ease-in-out; flex-shrink: 0; display: inline-flex; align-items: center; color: var(--fgColor-muted); }
                        details[open] > summary .${CN.SUMMARY_MARKER_ICON} { transform: rotate(90deg); }
                        .${CN.HIDDEN_ASSET_COUNTER} { margin-left: 4px; }
                        .${CN.MARKDOWN_BODY}.${CN.RELEASE_NOTES_PANEL} { position: relative; max-height: var(--ghre-notes-max-height); overflow: hidden; transition: max-height 0.3s ease-in-out; padding-bottom: 40px; }
                        .${CN.MARKDOWN_BODY}.${CN.RELEASE_NOTES_PANEL}.${CN.EXPANDED} { max-height: none; padding-bottom: 0; }
                        .${CN.TOGGLE_BUTTON} { position: absolute; bottom: 0; left: 0; right: 0; width: 100%; height: 40px; box-sizing: border-box; padding: 10px; margin: 0; text-align: center; cursor: pointer; font-weight: var(--font-weight-bold, 600); color: var(--fgColor-accent); background: none; border: none; }
                        .${CN.MARKDOWN_BODY}.${CN.RELEASE_NOTES_PANEL}:not(.${CN.EXPANDED}) .${CN.TOGGLE_BUTTON} { background: linear-gradient(to top, var(--bgColor-default), transparent); }
                        .${CN.MARKDOWN_BODY}.${CN.RELEASE_NOTES_PANEL}.${CN.EXPANDED} .${CN.TOGGLE_BUTTON} { position: static; margin-top: 16px; height: auto; padding: 8px 0; border-top: 1px solid var(--borderColor-default); }
                        .${CN.TOGGLE_BUTTON}:hover { text-decoration: underline; }
                        .${CN.PLATFORM_OPTION}, .${CN.KEYWORD_TOGGLE_OPTION} { display: flex; align-items: center; font-size: 13px; color: var(--fgColor-default); white-space: nowrap; cursor: pointer; padding: 4px 8px; gap: 6px; transition: background-color 0.1s ease, color 0.1s ease; border-radius: 4px; }
                        .${CN.PLATFORM_OPTION}:hover, .${CN.KEYWORD_TOGGLE_OPTION}:hover { background-color: var(--bgColor-accent-muted); }
                        .${CN.PLATFORM_OPTION}.${CN.SELECTED}, .${CN.KEYWORD_TOGGLE_OPTION}.${CN.SELECTED} { background-color: var(--bgColor-accent-emphasis); color: var(--fgColor-onEmphasis); font-weight: var(--font-weight-bold, 600); }
                        .${CN.PLATFORM_OPTION} svg, .${CN.KEYWORD_TOGGLE_OPTION} svg { width: 16px; height: 16px; flex-shrink: 0; color: var(--fgColor-muted); }
                        .${CN.PLATFORM_OPTION}.${CN.SELECTED} svg, .${CN.KEYWORD_TOGGLE_OPTION}.${CN.SELECTED} svg { color: var(--fgColor-onEmphasis); }
                        .${CN.AVAILABILITY_DOT} { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-left: auto; }
                        .${CN.AVAILABILITY_DOT}[data-available="true"] { background-color: var(--bgColor-success-emphasis); }
                        .${CN.AVAILABILITY_DOT}[data-available="false"] { background-color: var(--bgColor-danger-emphasis); }
                        .${CN.PLATFORM_OPTION}[data-available="false"], .${CN.KEYWORD_TOGGLE_OPTION}[data-available="false"] { color: var(--fgColor-disabled); cursor: not-allowed; pointer-events: none; opacity: 0.7; }
                        .${CN.PLATFORM_OPTION}[data-available="false"]:hover, .${CN.KEYWORD_TOGGLE_OPTION}[data-available="false"]:hover { background-color: transparent; }
                        .${CN.OPTIONS_SEPARATOR} { border-top: 1px solid var(--borderColor-muted); margin: 4px 0; grid-column: 1 / -1; }
                        .${CN.ARCH_TAG_CONTAINER} { display: flex; flex-wrap: wrap; justify-content: space-around; gap: 6px; padding: 4px 8px 2px 8px; grid-column: 1 / -1; }
                        .${CN.ARCH_TAG} { flex-grow: 1; text-align: center; padding: 4px 8px; border: 1px solid var(--borderColor-muted); border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s ease; user-select: none; }
                        .${CN.ARCH_TAG}:hover { border-color: var(--fgColor-accent); }
                        .${CN.ARCH_TAG}.${CN.SELECTED} { background-color: var(--bgColor-accent-emphasis); color: var(--fgColor-onEmphasis); border-color: var(--bgColor-accent-emphasis); font-weight: 600; }
                        .${CN.ARCH_TAG}[data-available="false"] { color: var(--fgColor-disabled); border-color: var(--borderColor-default); background-color: var(--bgColor-disabled); cursor: not-allowed; pointer-events: none; opacity: 0.6; }
                        .${CN.HIDDEN_ASSET} { display: none !important; visibility: hidden !important; height: 0 !important; margin:0 !important; padding: 0 !important; border: none !important; opacity:0 !important; overflow: hidden !important; }
                        .${CN.SETTINGS_OVERLAY} { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: var(--overlay-backdrop-bgColor, rgba(0,0,0,0.5)); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                        .${CN.SETTINGS_PANEL} { position: relative; background-color: var(--overlay-bgColor); padding: 24px; border: 0; border-radius: 12px; box-shadow: var(--shadow-floating-large); min-width: 300px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
                        .${CN.SETTINGS_TITLE} { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--fgColor-default); }
                        .${CN.SETTINGS_FORM_GROUP} { margin-bottom: 16px; } .${CN.SETTINGS_LABEL} { display: block; margin-bottom: 8px; font-weight: normal; color: var(--fgColor-muted); }
                        .ghre-checkbox-group, .ghre-radio-group { display: flex; align-items: center; gap: 8px; }
                        .ghre-radio-group-container { display: flex; flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
                        .ghre-pref-group { display: flex; align-items: center; gap: 4px; }
                        .${CN.SETTINGS_INPUT}, .${CN.SETTINGS_TEXTAREA} { width: 100%; padding: 8px 12px; background-color: var(--bgColor-default); border-color: var(--borderColor-default); border-radius: 6px; border-style: solid; border-width: 1px; box-sizing: border-box; color: var(--fgColor-default); }
                        .${CN.SETTINGS_TEXTAREA} { min-height: 60px; resize: vertical; } .${CN.SETTINGS_ACTIONS} { margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px; }
                        .${CN.SETTINGS_BUTTON} { }
                        .${CN.RESET_CONFIRM_DIALOG} { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: var(--bgColor-default); border: 1px solid var(--borderColor-danger); border-radius: 8px; box-shadow: var(--shadow-floating-large); padding: 16px; width: 90%; max-width: 400px; z-index: 2001; display: flex; flex-direction: column; gap: 12px; }
                        .ghre-confirm-title { font-size: 16px; font-weight: 600; color: var(--fgColor-danger); }
                        .ghre-confirm-message { font-size: 14px; color: var(--fgColor-default); }
                        .ghre-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
                        ${C.SELECTORS.ASSET_LIST_CONTAINER}.${CN.ASSET_LIST_LOADING} { opacity: 0; transition: opacity 0.2s ease-in-out !important; }
                        ${C.SELECTORS.ASSET_LIST_CONTAINER} { opacity: 1; transition: opacity 0.2s ease-in-out !important; }
                        @media (max-width: 768px) { .${CN.SETTINGS_PANEL} { width: 95%; padding: 16px; } }
                    `;
                },
                addStyleElement(id, css) { try { const attr = `data-ghre-style-${id}`; let styleElement = document.head.querySelector(`style[${attr}]`); if (!styleElement) { styleElement = GithubReleaseEnhancer.utils.createElement('style', { 'data-ghre-style-id': id, textContent: css }); document.head.appendChild(styleElement); } else if (styleElement.textContent !== css) { styleElement.textContent = css; } } catch (e) { console.error(`[GitHub Filter@${location.pathname}] Error adding styles:`, e); } },
                addGlobalStyles() { this.addStyleElement('common', this.commonStylesTemplate()); },
                updateMaxHeightVar(height) { document.documentElement.style.setProperty('--ghre-notes-max-height', `${height}px`); }
            },
        };



export { releaseUi };
