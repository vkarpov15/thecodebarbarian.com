'use strict';

// Adds a copy button to each code block in a post, based on mongoosejs.com's
// copy-code.js.
document.addEventListener('DOMContentLoaded', () => {
  // Inline SVG icons so no external asset load is required
  const copyIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  const checkIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
  `;

  // navigator.clipboard only exists on https pages, and the site is also served
  // over plain http, so fall back to the older way of copying text.
  async function copyText(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
      throw new Error('Failed to copy code');
    }
  }

  document.querySelectorAll('.prose pre code').forEach(block => {
    const pre = block.parentElement;

    // The button goes on a wrapper so it doesn't move when the code scrolls sideways
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.innerHTML = copyIcon;

    btn.onclick = async() => {
      if (btn.dataset.locked) return; // prevents multiple fast clicks
      btn.dataset.locked = '1';

      try {
        await copyText(block.textContent);
      } catch (err) {
        btn.dataset.locked = '';
        return;
      }

      // Show success tick briefly
      btn.innerHTML = checkIcon;

      setTimeout(() => {
        btn.innerHTML = copyIcon;
        btn.dataset.locked = '';
      }, 1200);
    };

    wrapper.appendChild(btn);
  });
});
