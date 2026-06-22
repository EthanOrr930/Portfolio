const loadedFonts = new Set<string>();

/**
 * Dynamically load a Google Font by injecting a <link> tag.
 * Skips fonts that are already loaded or are system fonts.
 */
export function loadGoogleFont(family: string) {
  // Skip system/built-in fonts
  const builtIn = ["Geist", "Geist Mono", "system-ui", "sans-serif", "serif", "monospace"];
  if (builtIn.includes(family)) return;
  if (loadedFonts.has(family)) return;

  loadedFonts.add(family);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

/**
 * Load all fonts referenced by text elements in the page data.
 */
export function loadAllFonts(fontFamilies: string[]) {
  const unique = [...new Set(fontFamilies)];
  for (const family of unique) {
    loadGoogleFont(family);
  }
}
