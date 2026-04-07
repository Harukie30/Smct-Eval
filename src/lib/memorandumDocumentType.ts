/**
 * Short label for table columns: PDF, PNG, JPEG, etc., from filename/path/url.
 */

const EXT_LABEL: Record<string, string> = {
  pdf: "PDF",
  jpg: "JPEG",
  jpeg: "JPEG",
  png: "PNG",
  gif: "GIF",
  webp: "WebP",
  bmp: "BMP",
  doc: "Word",
  docx: "Word",
  xls: "Excel",
  xlsx: "Excel",
};

function extensionFromPathLike(s: string): string | null {
  const noQuery = s.split(/[?#]/)[0] ?? "";
  const seg = noQuery.split(/[/\\]/).filter(Boolean).pop() ?? "";
  const m = seg.match(/\.([a-z0-9]{1,10})$/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Tries each string in order (e.g. display name, path, resolved URL).
 * Returns "—" when no extension can be inferred.
 */
export function memorandumDocumentTypeLabel(
  ...sources: (string | null | undefined)[]
): string {
  for (const raw of sources) {
    if (raw == null || String(raw).trim() === "") continue;
    const ext = extensionFromPathLike(String(raw).trim());
    if (ext) return EXT_LABEL[ext] ?? ext.toUpperCase();
  }
  return "—";
}
