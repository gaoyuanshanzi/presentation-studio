import html2canvas from 'html2canvas';
import { Slide } from '@/types';

/**
 * Renders a Slide into a combined 1920x1080 YouTube-standard resolution PNG canvas.
 * Left half (960x1080): ①_slave content  |  Right half (960x1080): ②_slave content
 * No UI badges, headers, or footer bars included.
 */
export async function renderSlideToCombinedCanvas(slide: Slide): Promise<HTMLCanvasElement> {
  const TOTAL_W = 1920;
  const TOTAL_H = 1080;
  const HALF_W = 960;

  // ── Build a hidden off-screen container ─────────────────────────────────────
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: -9999px;
    width: ${TOTAL_W}px;
    height: ${TOTAL_H}px;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    z-index: -9999;
    font-family: Inter, system-ui, sans-serif;
  `;
  document.body.appendChild(container);

  const m1 = slide.master1;
  const m2 = slide.master2;

  // ── Helper: create one slide panel (left or right) ─────────────────────────
  function createPanel(data: typeof m1): HTMLDivElement {
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
    `;

    // Background image layer
    if (data.bgImage) {
      const bgLayer = document.createElement('div');
      bgLayer.style.cssText = `
        position: absolute;
        inset: 0;
        background-image: url(${data.bgImage});
        background-size: cover;
        background-position: center;
        z-index: 0;
      `;
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        background-color: rgba(15, 23, 42, 0.35);
      `;
      bgLayer.appendChild(overlay);
      panel.appendChild(bgLayer);
    }

    // Content layer
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 800px;
      padding: 48px;
      box-sizing: border-box;
      font-size: 28px;
      line-height: 1.65;
      color: ${data.bgImage ? '#ffffff' : (data.textColor || '#0f172a')};
      ${data.bgImage ? `
        background-color: rgba(15,23,42,0.52);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.18);
      ` : ''}
    `;

    // Convert markdown to basic HTML for rendering (simple inline pass)
    const md = data.content || '';
    if (md.trim()) {
      // Simple markdown → HTML transforms for common patterns
      const html = md
        .replace(/^#{3} (.+)$/gm, '<h3 style="font-size:1.4em;font-weight:700;margin:0.4em 0">$1</h3>')
        .replace(/^#{2} (.+)$/gm, '<h2 style="font-size:1.75em;font-weight:700;margin:0.4em 0">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="font-size:2.2em;font-weight:800;margin:0.3em 0">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.1);padding:0.1em 0.3em;border-radius:4px">$1</code>')
        .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #3b82f6;padding-left:1em;opacity:0.9">$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li style="margin:0.25em 0">$1</li>')
        .replace(/(<li[^>]*>[\s\S]*?<\/li>[\s\S]*?)+/g, '<ul style="padding-left:1.5em;margin:0.5em 0">$&</ul>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n(?!<)/g, '<br/>');
      content.innerHTML = html;
    }
    // If content is empty → content div stays empty → only background shows

    panel.appendChild(content);
    return panel;
  }

  // Build left (①) and right (②) panels
  const leftPanel = createPanel(m1);
  const rightPanel = createPanel(m2);

  // Thin divider line
  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 2px;
    height: ${TOTAL_H}px;
    background-color: rgba(0,0,0,0.06);
    flex-shrink: 0;
  `;

  container.appendChild(leftPanel);
  container.appendChild(divider);
  container.appendChild(rightPanel);

  // Wait for layout + images to load
  await new Promise<void>((resolve) => setTimeout(resolve, 600));

  // Capture
  const canvas = await html2canvas(container, {
    width: TOTAL_W,
    height: TOTAL_H,
    scale: 1,
    useCORS: true,
    logging: false,
    allowTaint: true,
  });

  // Cleanup
  document.body.removeChild(container);

  return canvas;
}
