import { type Theme } from '../types';
import pdfStyles from '../services/pdf.css?inline';

/**
 * Generates and downloads a PDF of the market analysis report.
 * Uses dynamic imports to keep the initial bundle small.
 */
export const downloadPDF = async (ticker: string, theme: Theme, scale: number = 2) => {
  const container = document.getElementById('report-container');
  if (!container) return;
  
  try {
    const [html2canvas, { jsPDF }] = await Promise.all([
      import('html2canvas').then(m => m.default),
      import('jspdf')
    ]);

    // Find logical chunks and group cards into rows
    const rawChunks = Array.from(container.querySelectorAll('[data-pdf-chunk], [data-pdf-break="before"]')) as HTMLElement[];
    if (rawChunks.length === 0) rawChunks.push(container); // Fallback

    const chunks: (HTMLElement | HTMLElement[])[] = [];
    let currentCardRow: HTMLElement[] = [];
    let currentRowWidth = 0;

    for (const el of rawChunks) {
      const isCard = el.getAttribute('data-pdf-chunk') === 'card';
      const isPopulated = isCard ? !!el.querySelector('.markdown-body') : true;

      if (!isPopulated) continue;

      if (isCard) {
        // Measure original width to determine if it fits in 1400px row
        const width = el.getBoundingClientRect().width || 350;
        const gap = currentCardRow.length > 0 ? 32 : 0; // matching gap-8 (2rem)
        
        if (currentRowWidth + width + gap <= 1400) {
          currentCardRow.push(el);
          currentRowWidth += width + gap;
        } else {
          if (currentCardRow.length > 0) chunks.push([...currentCardRow]);
          currentCardRow = [el];
          currentRowWidth = width;
        }
      } else {
        if (currentCardRow.length > 0) {
          chunks.push([...currentCardRow]);
          currentCardRow = [];
          currentRowWidth = 0;
        }
        chunks.push(el);
      }
    }
    if (currentCardRow.length > 0) chunks.push(currentCardRow);

    let pdf: any = null;

    for (let i = 0; i < chunks.length; i++) {
      const item = chunks[i];
      const isGroup = Array.isArray(item);
      const group = isGroup ? item : [item];
      const firstEl = group[0];
      const isCard = firstEl.getAttribute('data-pdf-chunk') === 'card';
      
      // If it's a card in a grid, we capture the parent to maintain layout
      const captureTarget = (isCard && firstEl.parentElement?.id === 'agents-grid') 
        ? firstEl.parentElement 
        : firstEl;

      // Retry mechanism for chunk capture
      let canvas: HTMLCanvasElement | null = null;
      let retries = 3;
      
      while (retries > 0 && !canvas) {
        try {
          canvas = await html2canvas(captureTarget, {
            scale: scale,
            useCORS: true,
            logging: false, // Reduced logging for better performance
            windowWidth: 1400,
            width: 1400, // Explicitly set width to match windowWidth for full capture
            backgroundColor: theme === 'dark' ? '#0a1114' : '#fdfaf6',
            onclone: (clonedDoc) => {
              const style = clonedDoc.createElement('style');
              style.innerHTML = pdfStyles as string;
              clonedDoc.head.appendChild(style);

              const textFixStyle = clonedDoc.createElement('style');
              textFixStyle.innerHTML = `
                * { 
                  text-rendering: auto !important;
                  letter-spacing: normal !important;
                }
                .markdown-body * {
                  word-spacing: normal !important;
                }
              `;
              clonedDoc.head.appendChild(textFixStyle);

              // Force report layout to be consistent
              const reportEl = clonedDoc.getElementById('report-container');
              if (reportEl) {
                reportEl.style.width = '1400px';
                reportEl.style.maxWidth = 'none';
                reportEl.style.height = 'auto';
                reportEl.style.padding = '0'; // Reduce padding for better fit in PDF
              }
              
              // Handle grid layout for cards
              const clonedGrid = clonedDoc.getElementById('agents-grid');
              if (clonedGrid && isCard) {
                const visibleTitles = group.map(el => el.getAttribute('data-pdf-title'));
                Array.from(clonedGrid.children).forEach(child => {
                  const c = child as HTMLElement;
                  const title = c.getAttribute('data-pdf-title');
                  if (!visibleTitles.includes(title)) {
                    c.style.display = 'none';
                  } else {
                    c.style.display = 'flex';
                    c.style.flexDirection = 'column';
                    c.style.width = 'auto';
                    c.style.flex = '1';
                    c.style.minWidth = '0'; // prevents blowout
                    c.style.height = 'auto';
                  }
                });
                clonedGrid.style.display = 'flex';
                clonedGrid.style.flexDirection = 'row';
                clonedGrid.style.flexWrap = 'nowrap';
                clonedGrid.style.width = '100%';
                clonedGrid.style.gap = '2rem';
                clonedGrid.style.height = 'auto';
              }

              const elements = clonedDoc.getElementsByTagName('*');
              const clonedWindow = clonedDoc.defaultView || window;
              const convCanvas = clonedDoc.createElement('canvas');
              convCanvas.width = 1; convCanvas.height = 1;
              const convCtx = convCanvas.getContext('2d');

              const convertColor = (color: string) => {
                if (!color || (!color.includes('oklch') && !color.includes('oklab'))) return color;
                if (!convCtx) return '#888888';
                try {
                  convCtx.clearRect(0, 0, 1, 1);
                  convCtx.fillStyle = color;
                  const converted = convCtx.fillStyle;
                  return (converted.includes('oklch') || converted.includes('oklab')) ? '#888888' : converted;
                } catch (e) { return '#888888'; }
              };

              const modernColorRegex = /(?:oklch|oklab)\s*\((?:[^)(]+|\([^)(]*\))*\)/g;
              const convertAllInString = (str: string) => {
                if (!str || (!str.includes('oklch') && !str.includes('oklab'))) return str;
                return str.replace(modernColorRegex, (match) => convertColor(match));
              };

              for (let i = 0; i < elements.length; i++) {
                const el = elements[i] as HTMLElement;
                
                // Force visibility and disable animations
                if (el.hasAttribute('style')) {
                  if (el.style.opacity === '0') el.style.opacity = '1';
                  el.style.transform = 'none';
                  el.style.transition = 'none';
                  el.style.animation = 'none';
                }

                // Ensure card content is fully expanded
                if (el.hasAttribute('data-pdf-chunk') || el.hasAttribute('data-pdf-break')) {
                  el.style.height = 'auto';
                  el.style.maxHeight = 'none';
                  el.style.overflow = 'visible';
                  if (!isCard) el.style.width = '100%'; 
                  el.style.resize = 'none'; // Disable resize handles in PDF
                }

                // Fix internal scrollable containers
                if (el.classList.contains('markdown-body') || el.classList.contains('prose')) {
                  el.style.height = 'auto';
                  el.style.maxHeight = 'none';
                  el.style.overflow = 'visible';
                }

                if (!el.style) continue;
                try {
                  const computed = clonedWindow.getComputedStyle(el);
                  if (computed.opacity === '0') el.style.setProperty('opacity', '1', 'important');

                  for (let j = 0; j < computed.length; j++) {
                    const prop = computed[j];
                    const val = computed.getPropertyValue(prop);
                    if (val && (val.includes('oklch') || val.includes('oklab'))) {
                      const converted = convertAllInString(val);
                      el.style.setProperty(prop, converted, 'important');
                    }
                  }
                } catch (e) {}
              }

              const styles = clonedDoc.getElementsByTagName('style');
              for (let i = 0; i < styles.length; i++) {
                try {
                  if (styles[i].innerHTML.includes('oklch') || styles[i].innerHTML.includes('oklab')) {
                    styles[i].innerHTML = styles[i].innerHTML.replace(modernColorRegex, '#888888');
                  }
                } catch (e) {}
              }
            }
          });
        } catch (e) {
          console.warn(`Chunk capture failed, retrying... (${retries} left)`, e);
          retries--;
          if (retries === 0) throw e;
          await new Promise(r => setTimeout(r, 500)); // Brief pause before retry
        }
      }

      if (!canvas) continue;

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = canvas.width / scale;
      const pageHeight = canvas.height / scale;
      
      const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

      if (!pdf) {
        pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [pageWidth, pageHeight]
        });
      } else {
        pdf.addPage([pageWidth, pageHeight], orientation);
      }
      
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }

    if (pdf) {
      pdf.save(`FinSurf-Report-${ticker || 'Analysis'}.pdf`);
    } else {
      alert('No data available to generate report.');
    }
  } catch (error) {
    console.error('PDF Generation failed:', error);
    alert('PDF generation failed. Check console for details.');
  }
};
