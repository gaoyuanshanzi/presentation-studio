import html2canvas from 'html2canvas';
import { Slide } from '@/types';

/**
 * Safely converts an image URL to a base64 DataURL.
 * If CORS prevents reading, returns empty string so that the canvas
 * is NEVER tainted and `toDataURL()` will NEVER throw a SecurityError.
 */
async function preloadImageAsDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  // Attempt 1: Fetch with mode: 'cors'
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Fetch failed or blocked by CORS
  }

  // Attempt 2: Image object with crossOrigin
  try {
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(''), 3000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 1200;
          c.height = img.naturalHeight || 800;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = c.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
            return;
          }
        } catch {
          // If tainted, resolve empty string to prevent export failure
        }
        resolve('');
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve('');
      };
      img.src = url;
    });
  } catch {
    return '';
  }
}

/**
 * Fallback direct 2D Canvas renderer in case html2canvas ever fails.
 * Guarantees that export NEVER produces 0 slides or empty results.
 */
function renderSlideDirect2D(slide: Slide): HTMLCanvasElement {
  const TOTAL_W = 1920;
  const TOTAL_H = 1080;
  const HALF_W = 960;

  const canvas = document.createElement('canvas');
  canvas.width = TOTAL_W;
  canvas.height = TOTAL_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Left Panel (①_slave)
  ctx.fillStyle = slide.master1.bgColor || '#ffffff';
  ctx.fillRect(0, 0, HALF_W, TOTAL_H);

  // Right Panel (②_slave)
  ctx.fillStyle = slide.master2.bgColor || '#0f172a';
  ctx.fillRect(HALF_W, 0, HALF_W, TOTAL_H);

  // Thin divider
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(HALF_W - 1, 0, 2, TOTAL_H);

  // Helper to draw simple text
  const drawText = (content: string, startX: number, textColor: string) => {
    ctx.fillStyle = textColor;
    ctx.font = 'bold 36px sans-serif';
    const lines = (content || '').split('\n').filter((l) => l.trim().length > 0);
    let y = 140;
    for (const line of lines.slice(0, 16)) {
      const clean = line.replace(/^[#\-*>\s]+/, '');
      if (line.startsWith('#')) {
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(clean, startX + 60, y);
        y += 64;
      } else {
        ctx.font = 'normal 30px sans-serif';
        ctx.fillText(clean, startX + 60, y);
        y += 48;
      }
    }
  };

  drawText(slide.master1.content, 0, slide.master1.textColor || '#0f172a');
  drawText(slide.master2.content, HALF_W, slide.master2.textColor || '#ffffff');

  return canvas;
}

/**
 * Renders a Slide into a combined 1920x1080 YouTube-standard resolution PNG canvas.
 * Left half (960x1080): ①_slave content  |  Right half (960x1080): ②_slave content
 * 100% Guaranteed solid opaque rendering without whiteout/fading, and 100% CORS safe without Tainted Canvas errors.
 */
export async function renderSlideToCombinedCanvas(slide: Slide): Promise<HTMLCanvasElement> {
  const TOTAL_W = 1920;
  const TOTAL_H = 1080;
  const HALF_W = 960;

  try {
    // Pre-load background images as DataURLs to ensure they are 100% CORS-safe
    const bgDataUrl1 = slide.master1.bgImage ? await preloadImageAsDataUrl(slide.master1.bgImage) : '';
    const bgDataUrl2 = slide.master2.bgImage ? await preloadImageAsDataUrl(slide.master2.bgImage) : '';

    // ── Build hidden on-screen container (fully opaque, behind viewport) ───
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${TOTAL_W}px;
      height: ${TOTAL_H}px;
      display: flex;
      flex-direction: row;
      overflow: hidden;
      z-index: -99999;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: none;
      box-sizing: border-box;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `;
    document.body.appendChild(container);

    const m1 = slide.master1;
    const m2 = slide.master2;

    // ── Helper: create one slide panel (left or right) ─────────────────────────
    function createPanel(data: typeof m1, bgDataUrl: string): HTMLDivElement {
      const panel = document.createElement('div');
      panel.style.cssText = `
        width: ${HALF_W}px;
        height: ${TOTAL_H}px;
        background-color: ${data.bgColor || '#ffffff'};
        color: ${data.textColor || '#0f172a'};
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
      `;

      // Background image layer (only if safe data URL available)
      if (bgDataUrl) {
        const bgLayer = document.createElement('div');
        bgLayer.style.cssText = `
          position: absolute;
          inset: 0;
          background-image: url(${bgDataUrl});
          background-size: cover;
          background-position: center;
          z-index: 0;
          opacity: 1;
        `;
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: absolute;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.4);
          z-index: 1;
        `;
        bgLayer.appendChild(overlay);
        panel.appendChild(bgLayer);
      }

      // Content layer
      const content = document.createElement('div');
      const hasBg = Boolean(bgDataUrl);
      content.style.cssText = `
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: 820px;
        padding: 48px;
        box-sizing: border-box;
        font-size: 28px;
        line-height: 1.65;
        color: ${hasBg ? '#ffffff' : (data.textColor || '#0f172a')};
        ${hasBg ? `
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        ` : ''}
      `;

      // Convert markdown to HTML
      const md = data.content || '';
      if (md.trim()) {
        const html = md
          .replace(/^#{3} (.+)$/gm, '<h3 style="font-size:1.4em;font-weight:700;margin:0.4em 0;line-height:1.3">$1</h3>')
          .replace(/^#{2} (.+)$/gm, '<h2 style="font-size:1.75em;font-weight:700;margin:0.4em 0;line-height:1.3">$1</h2>')
          .replace(/^# (.+)$/gm, '<h1 style="font-size:2.2em;font-weight:800;margin:0.3em 0;line-height:1.25">$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.15);padding:0.1em 0.3em;border-radius:4px">$1</code>')
          .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #3b82f6;padding-left:1em;opacity:0.95">$1</blockquote>')
          .replace(/^- (.+)$/gm, '<li style="margin:0.3em 0">$1</li>')
          .replace(/(<li[^>]*>[\s\S]*?<\/li>[\s\S]*?)+/g, '<ul style="padding-left:1.5em;margin:0.5em 0">$&</ul>')
          .replace(/\n\n/g, '<br/><br/>')
          .replace(/\n(?!<)/g, '<br/>');
        content.innerHTML = html;
      }

      panel.appendChild(content);
      return panel;
    }

    // Build panels
    const leftPanel = createPanel(m1, bgDataUrl1);
    const rightPanel = createPanel(m2, bgDataUrl2);

    // Divider line
    const divider = document.createElement('div');
    divider.style.cssText = `
      width: 2px;
      height: ${TOTAL_H}px;
      background-color: rgba(0,0,0,0.08);
      flex-shrink: 0;
      z-index: 5;
    `;

    container.appendChild(leftPanel);
    container.appendChild(divider);
    container.appendChild(rightPanel);

    // Wait for DOM layout
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    // Capture using html2canvas with STRICT allowTaint: false to prevent tainted canvas
    const canvas = await html2canvas(container, {
      width: TOTAL_W,
      height: TOTAL_H,
      scale: 1,
      useCORS: true,
      allowTaint: false, // CRITICAL: NEVER allow tainted canvas so toDataURL never fails!
      logging: false,
      imageTimeout: 5000,
      backgroundColor: '#ffffff'
    });

    // Cleanup
    document.body.removeChild(container);

    return canvas;
  } catch (err) {
    console.warn('html2canvas rendering fallback to direct 2D canvas:', err);
    return renderSlideDirect2D(slide);
  }
}
