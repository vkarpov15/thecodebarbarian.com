'use strict';

// Highlights the section you're reading in a post's "On this page" contents.
document.addEventListener('DOMContentLoaded', () => {
  const toc = document.querySelector('.post-toc');
  if (toc == null) {
    return;
  }

  const links = Array.from(toc.querySelectorAll('a'));
  const headings = links.map(link => document.getElementById(link.hash.slice(1)));

  // A section is current once its heading scrolls above this many pixels from
  // the top of the screen. Clicking a contents link puts the heading above it.
  const readingLine = 120;

  let current = null;

  // Long contents scroll on their own. This moves only the contents: scrollIntoView()
  // would scroll the whole page back up when the contents are off screen.
  function keepInView(link) {
    const box = toc.getBoundingClientRect();
    const item = link.getBoundingClientRect();

    if (item.top < box.top) {
      toc.scrollTop -= box.top - item.top;
    } else if (item.bottom > box.bottom) {
      toc.scrollTop += item.bottom - box.bottom;
    }
  }

  function update() {
    let next = null;
    headings.forEach((heading, i) => {
      if (heading.getBoundingClientRect().top <= readingLine) {
        next = links[i];
      }
    });

    // Short sections at the end of a page may never reach the reading line
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    if (atBottom) {
      next = links[links.length - 1];
    }

    if (next === current) {
      return;
    }
    if (current != null) {
      current.removeAttribute('aria-current');
    }
    if (next != null) {
      next.setAttribute('aria-current', 'location');
      keepInView(next);
    }
    current = next;
  }

  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }, { passive: true });

  update();
});
