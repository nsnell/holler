/**
 * All SDK styles — shadow DOM internals + host-DOM pin layer.
 *
 * Design language borrowed from the Holler brand page:
 *   - Dark surfaces (#0B0B0F / #141419 / #1C1C23)
 *   - Yellow accent (#FFE14D)
 *   - Green for resolved (#4ADE80)
 *   - JetBrains Mono / DM Sans with system fallbacks
 *   - Subtle borders (#ffffff0a), deep shadows
 *
 * Everything is intentionally subdued — this overlays someone else's page.
 */

export const STYLES = /* css */ `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  :host, .vc-root {
    --vc-accent: #FFE14D;
    --vc-accent-hover: #f5d63d;
    --vc-accent-text: #0B0B0F;
    --vc-green: #4ADE80;
    --vc-green-soft: rgba(74, 222, 128, 0.15);
    --vc-amber: #FBBF24;
    --vc-amber-soft: rgba(251, 191, 36, 0.15);
    --vc-bg: #0B0B0F;
    --vc-bg-elevated: #141419;
    --vc-bg-surface: #1C1C23;
    --vc-text: #EDEDF0;
    --vc-text-muted: #9494A8;
    --vc-text-dim: #5C5C72;
    --vc-border: rgba(255, 255, 255, 0.04);
    --vc-border-hover: rgba(255, 255, 255, 0.09);
    --vc-radius: 12px;
    --vc-radius-sm: 8px;
    --vc-font: 'DM Sans', system-ui, -apple-system, sans-serif;
    --vc-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    --vc-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    --vc-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.6);
    all: initial;
    font-family: var(--vc-font);
    color: var(--vc-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :host([data-theme="light"]), .vc-root[data-theme="light"] {
    --vc-accent: #FFE14D;
    --vc-accent-hover: #f5d63d;
    --vc-accent-text: #0B0B0F;
    --vc-bg: #ffffff;
    --vc-bg-elevated: #f9f9fb;
    --vc-bg-surface: #f0f0f4;
    --vc-text: #1a1a2e;
    --vc-text-muted: #6b6b80;
    --vc-text-dim: #9494a8;
    --vc-border: rgba(0, 0, 0, 0.06);
    --vc-border-hover: rgba(0, 0, 0, 0.10);
    --vc-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    --vc-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.12);
  }

  *, *::before, *::after {
    box-sizing: border-box;
    font-family: inherit;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
    padding: 0;
  }

  /* ---------- Toolbar ---------- */
  .vc-toolbar-wrap {
    position: fixed;
    bottom: 18px;
    z-index: 2147483000;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    user-select: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .vc-toolbar-wrap[data-position="bottom-right"] { right: 18px; }
  .vc-toolbar-wrap[data-position="bottom-left"]  { left: 18px; }
  .vc-toolbar-wrap[data-position="bottom-center"] {
    left: 50%;
    transform: translateX(-50%);
  }
  .vc-toolbar-wrap[data-position="bottom-center"][data-hidden="true"] {
    transform: translateX(-50%) translateY(12px);
  }
  .vc-toolbar-wrap[data-hidden="true"] {
    opacity: 0;
    transform: translateY(12px);
    pointer-events: none;
  }

  .vc-toolbar {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: #141419;
    color: #EDEDF0;
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .vc-toolbar:hover {
    transform: translateY(-2px) scale(1.06);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    border-color: rgba(255,255,255,0.14);
  }
  .vc-toolbar[data-active="true"] {
    background: #FFE14D;
    color: #0B0B0F;
    border-color: #FFE14D;
  }
  .vc-toolbar-emoji {
    display: inline-block;
    transform: translateY(-0.5px);
  }

  .vc-toolbar-count {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 17px;
    height: 17px;
    line-height: 17px;
    text-align: center;
    padding: 0 4px;
    border-radius: 999px;
    background: #FFE14D;
    color: #0B0B0F;
    font-family: var(--vc-mono);
    font-size: 10px;
    font-weight: 700;
    border: 2px solid #141419;
    box-sizing: content-box;
  }
  .vc-toolbar[data-active="true"] .vc-toolbar-count {
    background: #0B0B0F;
    color: #FFE14D;
  }
  .vc-toolbar-count[data-empty="true"] { display: none; }

  .vc-toolbar-hide {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: #141419;
    color: #5C5C72;
    border: 1px solid rgba(255,255,255,0.09);
    font-size: 10px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.12s ease, transform 0.12s ease, color 0.12s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
  .vc-toolbar-wrap:hover .vc-toolbar-hide {
    opacity: 1;
    transform: scale(1);
  }
  .vc-toolbar-hide:hover { color: #EDEDF0; }

  .vc-toolbar-avatar {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #1C1C23;
    color: #EDEDF0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: 600 14px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif;
    line-height: 1;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.06);
  }

  /* ========================================
     All popover/panel UI is forced dark mode
     for visual consistency regardless of theme.
     Uses hardcoded Holler palette values.
     ======================================== */

  /* ---------- Thread panel ---------- */
  .vc-thread {
    position: fixed;
    z-index: 2147483100;
    width: 340px;
    max-height: 440px;
    background: #141419;
    color: #EDEDF0;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: var(--vc-radius);
    box-shadow: 0 8px 40px rgba(0,0,0,0.65);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: vc-fade-in 0.15s ease-out;
  }
  .vc-thread-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .vc-thread-title {
    font-size: 11px;
    font-family: var(--vc-mono);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #B4B4C8;
  }
  .vc-thread-close {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #5C5C72;
    font-size: 14px;
    transition: background 0.1s ease, color 0.1s ease;
  }
  .vc-thread-close:hover { background: #1C1C23; color: #EDEDF0; }
  .vc-thread-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .vc-thread-body::-webkit-scrollbar { width: 5px; }
  .vc-thread-body::-webkit-scrollbar-track { background: transparent; }
  .vc-thread-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  .vc-msg {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .vc-msg-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #7E7E96;
  }
  .vc-msg-author {
    font-weight: 600;
    color: #EDEDF0;
  }
  .vc-msg-body {
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #C4C4D4;
  }
  .vc-thread-actions {
    display: flex;
    gap: 6px;
    padding: 10px 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .vc-thread-footer {
    padding: 12px 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ---------- Composer ---------- */
  .vc-composer {
    position: fixed;
    z-index: 2147483100;
    width: 300px;
    background: #141419;
    color: #EDEDF0;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: var(--vc-radius);
    box-shadow: 0 8px 40px rgba(0,0,0,0.65);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: vc-fade-in 0.15s ease-out;
  }

  textarea.vc-textarea {
    width: 100%;
    min-height: 68px;
    max-height: 200px;
    padding: 10px 12px;
    resize: vertical;
    font-size: 13px;
    line-height: 1.5;
    color: #EDEDF0;
    background: #0B0B0F;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 8px;
    outline: none;
    font-family: var(--vc-font);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  textarea.vc-textarea::placeholder { color: #5C5C72; }
  textarea.vc-textarea:focus {
    border-color: rgba(255, 225, 77, 0.4);
    box-shadow: 0 0 0 3px rgba(255, 225, 77, 0.08);
  }
  textarea.vc-textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .vc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .vc-row-hint {
    font-size: 11px;
    color: #5C5C72;
    font-family: var(--vc-mono);
  }

  .vc-btn {
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.12s ease, opacity 0.12s ease, transform 0.1s ease;
  }
  .vc-btn:active { transform: scale(0.97); }
  .vc-btn-primary {
    background: #FFE14D;
    color: #0B0B0F;
  }
  .vc-btn-primary:hover { background: #f5d63d; }
  .vc-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
  .vc-btn-ghost {
    color: #5C5C72;
  }
  .vc-btn-ghost:hover { color: #EDEDF0; }
  .vc-btn-resolve {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #4ADE80;
    background: rgba(74, 222, 128, 0.1);
    transition: background 0.12s ease;
  }
  .vc-btn-resolve:hover { background: rgba(74, 222, 128, 0.18); }

  /* ---------- Auth modal ---------- */
  .vc-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 2147483200;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: vc-fade-in 0.15s ease-out;
    backdrop-filter: blur(6px);
  }
  .vc-modal {
    width: 360px;
    max-width: calc(100vw - 32px);
    background: #141419;
    color: #EDEDF0;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: var(--vc-radius);
    box-shadow: 0 12px 48px rgba(0,0,0,0.7);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
  }
  .vc-modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: #5C5C72;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s ease, color 0.1s ease;
  }
  .vc-modal-close:hover { background: #1C1C23; color: #EDEDF0; }
  .vc-modal h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    font-family: var(--vc-mono);
    letter-spacing: -0.3px;
    color: #EDEDF0;
  }
  .vc-modal p {
    margin: 0;
    font-size: 13px;
    color: #9494A8;
    line-height: 1.5;
  }
  input.vc-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.09);
    background: #0B0B0F;
    color: #EDEDF0;
    font-size: 14px;
    font-family: var(--vc-font);
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  input.vc-input::placeholder { color: #5C5C72; }
  input.vc-input:focus {
    border-color: rgba(255, 225, 77, 0.4);
    box-shadow: 0 0 0 3px rgba(255, 225, 77, 0.08);
  }

  @keyframes vc-fade-in {
    from { opacity: 0; transform: translateY(6px) scale(0.97); }
    to   { opacity: 1; transform: none; }
  }

  /* ---------- Spinner ---------- */
  .vc-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    vertical-align: -2px;
    animation: vc-spin 0.7s linear infinite;
  }
  @keyframes vc-spin {
    to { transform: rotate(360deg); }
  }

  /* ---------- Menu popover ---------- */
  .vc-menu {
    position: fixed;
    z-index: 2147483150;
    min-width: 230px;
    background: #141419;
    color: #EDEDF0;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: var(--vc-radius);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.65);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    animation: vc-fade-in 0.12s ease-out;
  }
  .vc-menu-header {
    padding: 10px 12px 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--vc-mono);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: #FFE14D;
  }
  .vc-menu-header-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  .vc-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 12px;
    border-radius: var(--vc-radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: #EDEDF0;
    text-align: left;
    width: 100%;
    transition: background 0.1s ease;
  }
  .vc-menu-item:hover { background: #1C1C23; }
  .vc-menu-item[data-variant="primary"] {
    background: rgba(255, 225, 77, 0.08);
    color: #FFE14D;
  }
  .vc-menu-item[data-variant="primary"]:hover {
    background: rgba(255, 225, 77, 0.14);
  }
  .vc-menu-item[data-disabled="true"] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .vc-menu-sep {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 4px 2px;
  }
  .vc-menu-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .vc-menu-hint {
    font-size: 11px;
    font-family: var(--vc-mono);
    color: #5C5C72;
    font-weight: 500;
  }

  /* ---------- Comments drawer ---------- */
  .vc-unresolved {
    position: fixed;
    z-index: 2147483150;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;
    max-width: calc(100vw - 40px);
    background: #141419;
    color: #EDEDF0;
    border-left: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: vc-drawer-in 0.2s ease-out;
  }
  @keyframes vc-drawer-in {
    from { transform: translateX(100%); opacity: 0.5; }
    to   { transform: translateX(0); opacity: 1; }
  }
  .vc-unresolved-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 14px 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 13px;
    font-weight: 600;
    gap: 8px;
    flex-shrink: 0;
  }
  .vc-tabs {
    display: flex;
    gap: 2px;
    background: #0B0B0F;
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: var(--vc-radius-sm);
    padding: 3px;
  }
  .vc-tab {
    padding: 5px 11px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--vc-mono);
    color: #7E7E96;
    transition: background 0.12s ease, color 0.12s ease;
    white-space: nowrap;
  }
  .vc-tab:hover { color: #B4B4C8; }
  .vc-tab[data-active="true"] {
    background: #1C1C23;
    color: #EDEDF0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
  .vc-comment-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-family: var(--vc-mono);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .vc-comment-badge[data-variant="open"] {
    background: var(--vc-amber-soft);
    color: var(--vc-amber);
  }
  .vc-comment-badge[data-variant="resolved"] {
    background: var(--vc-green-soft);
    color: var(--vc-green);
  }
  .vc-unresolved-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .vc-unresolved-list::-webkit-scrollbar { width: 6px; }
  .vc-unresolved-list::-webkit-scrollbar-track { background: transparent; }
  .vc-unresolved-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
  }
  .vc-unresolved-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.14);
  }
  .vc-unresolved-empty {
    padding: 48px 16px;
    text-align: center;
    font-size: 13px;
    color: #7E7E96;
  }
  .vc-unresolved-item {
    padding: 12px 14px;
    border-radius: var(--vc-radius-sm);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    width: 100%;
    color: #EDEDF0;
    transition: background 0.1s ease;
  }
  .vc-unresolved-item:hover { background: #1C1C23; }
  .vc-unresolved-item-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #7E7E96;
    font-weight: 500;
  }
  .vc-unresolved-item-body {
    font-size: 13px;
    line-height: 1.5;
    color: #C4C4D4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

/**
 * Standalone styles injected into the host DOM (outside the shadow root)
 * for the pin layer and tint overlay.
 */
export const PIN_LAYER_STYLES = /* css */ `
  .vc-pin-layer[data-holler-pins] {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 0 !important;
    height: 0 !important;
    pointer-events: none !important;
    z-index: 2147482000 !important;
  }
  .vc-pin-layer[data-holler-pins] .vc-pin {
    position: absolute !important;
    width: 30px !important;
    height: 30px !important;
    margin-left: -15px !important;
    margin-top: -15px !important;
    border-radius: 999px !important;
    background: #FFE14D;
    color: #0B0B0F !important;
    font: 700 14px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif !important;
    line-height: 1 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 3px 12px rgba(0,0,0,0.35), 0 0 0 2px rgba(11,11,15,0.8) !important;
    cursor: pointer !important;
    pointer-events: auto !important;
    animation: vc-pin-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    border: none !important;
    padding: 0 !important;
    outline: none !important;
  }
  .vc-pin-layer[data-holler-pins] .vc-pin:hover {
    transform: scale(1.12);
    box-shadow: 0 4px 20px rgba(255,225,77,0.25), 0 0 0 2px rgba(11,11,15,0.8) !important;
  }
  .vc-pin-layer[data-holler-pins] .vc-pin[data-resolved="true"] {
    opacity: 0.35;
    background: #4ADE80 !important;
  }
  .vc-pin-layer[data-holler-pins] .vc-pin[data-temp="true"] {
    background: #FFE14D !important;
    box-shadow: 0 3px 16px rgba(255,225,77,0.4), 0 0 0 2px rgba(11,11,15,0.8) !important;
    animation: vc-pin-pulse 1.5s ease-in-out infinite alternate;
  }
  .vc-overlay-tint[data-holler-tint] {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(11, 11, 15, 0.08) !important;
    pointer-events: none;
    z-index: 2147481500 !important;
    transition: opacity 0.2s ease;
  }
  @keyframes vc-pin-in {
    from { opacity: 0; transform: scale(0.3); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes vc-pin-pulse {
    from { box-shadow: 0 3px 16px rgba(255,225,77,0.4), 0 0 0 2px rgba(11,11,15,0.8); }
    to   { box-shadow: 0 3px 20px rgba(255,225,77,0.6), 0 0 0 3px rgba(255,225,77,0.15); }
  }
`
