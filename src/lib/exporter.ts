import html2canvas from 'html2canvas';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Slide } from '@/types';

/**
 * Renders a Slide into a combined 1920x1080 YouTube-standard resolution PNG canvas.
 * Left half (960x1080): ①_slave content (without UI badges/footers)
 * Right half (960x1080): ②_slave content (without UI badges/footers)
 */
export async function renderSlideToCombinedCanvas(slide: Slide): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1920px';
  container.style.height = '1080px';
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.backgroundColor = '#ffffff';
  container.style.overflow = 'hidden';
  container.style.zIndex = '-9999';

  document.body.appendChild(container);

  // Render React content into container
  const root = ReactDOM.createRoot(container);

  const m1 = slide.master1;
  const m2 = slide.master2;
  const m2HasBgImage = Boolean(m2.bgImage);

  await new Promise<void>((resolve) => {
    root.render(
      <div style={{ width: '1920px', height: '1080px', display: 'flex', flexDirection: 'row' }}>
        {/* Left Side: ①_slave (960x1080) */}
        <div
          style={{
            width: '960px',
            height: '1080px',
            backgroundColor: m1.bgColor || '#ffffff',
            color: m1.textColor || '#0f172a',
            padding: '64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            className="slide-markdown-content"
            style={{
              width: '100%',
              maxWidth: '800px',
              fontSize: '28px',
              lineHeight: 1.6
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m1.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Divider Line */}
        <div style={{ width: '2px', height: '1080px', backgroundColor: 'rgba(0,0,0,0.06)' }} />

        {/* Right Side: ②_slave (960x1080) */}
        <div
          style={{
            width: '960px',
            height: '1080px',
            backgroundColor: m2.bgColor || '#ffffff',
            color: m2.textColor || '#0f172a',
            padding: '64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {m2HasBgImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${m2.bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0
              }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)' }} />
            </div>
          )}

          <div
            className="slide-markdown-content"
            style={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              maxWidth: '800px',
              fontSize: '28px',
              lineHeight: 1.6,
              ...(m2HasBgImage
                ? {
                    padding: '36px',
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff'
                  }
                : { color: m2.textColor || '#0f172a' })
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m2.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );

    // Give browser time to lay out and load images
    setTimeout(() => {
      resolve();
    }, 400);
  });

  // Capture clean 1920x1080 canvas
  const canvas = await html2canvas(container, {
    width: 1920,
    height: 1080,
    scale: 1,
    useCORS: true,
    logging: false
  });

  // Cleanup
  root.unmount();
  document.body.removeChild(container);

  return canvas;
}
