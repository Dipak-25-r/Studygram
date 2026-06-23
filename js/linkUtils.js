/* ============================================================
   linkUtils.js — validate external links & build safe embeds
   Supports: YouTube (video) and Google Drive (pdf/ppt/doc/any)
   No files are ever uploaded or stored — only the URL + metadata.
   ============================================================ */

const LinkUtils = {
  /** Detect a YouTube URL and extract its video ID */
  parseYouTube(url) {
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return null;
  },

  /** Detect a Google Drive URL and extract its file ID */
  parseDrive(url) {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{10,})/,
      /docs\.google\.com\/(?:presentation|document|spreadsheets)\/d\/([a-zA-Z0-9_-]{10,})/
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return null;
  },

  /** Returns { kind: 'youtube'|'drive'|'unknown', id, type } given a raw URL */
  analyze(url) {
    if (!url || typeof url !== 'string') return { kind: 'invalid' };
    let clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;

    try { new URL(clean); } catch { return { kind: 'invalid' }; }

    const ytId = this.parseYouTube(clean);
    if (ytId) return { kind: 'youtube', id: ytId, url: clean, type: 'Video' };

    const driveId = this.parseDrive(clean);
    if (driveId) {
      let type = 'PDF';
      if (/presentation/.test(clean)) type = 'PPT';
      else if (/document/.test(clean)) type = 'Notes';
      else if (/spreadsheets/.test(clean)) type = 'Sheet';
      return { kind: 'drive', id: driveId, url: clean, type };
    }

    return { kind: 'unknown', url: clean, type: 'Link' };
  },

  /** Build embeddable iframe src for a parsed link */
  embedSrc(meta) {
    if (meta.kind === 'youtube') return `https://www.youtube.com/embed/${meta.id}`;
    if (meta.kind === 'drive') return `https://drive.google.com/file/d/${meta.id}/preview`;
    return null;
  },

  /** Thumbnail for YouTube (Drive has no public thumbnail API without auth) */
  thumbnail(meta) {
    if (meta.kind === 'youtube') return `https://img.youtube.com/vi/${meta.id}/hqdefault.jpg`;
    return null;
  }
};
