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

    // Parallelize chunk capture for speed
    const canvasResults = await Promise.all(chunks.map(async (item) => {
      const isGroup = Array.isArray(item);
      const group = isGroup ? item : [item];
      const firstEl = group[0];
      const isCard = firstEl.getAttribute('data-pdf-chunk') === 'card';
      
      const captureTarget = (isCard && firstEl.parentElement?.id === 'agents-grid') 
        ? firstEl.parentElement 
        : firstEl;

      return html2canvas(captureTarget, {
        scale: scale,
        useCORS: true,
        logging: false,
        windowWidth: 1400,
        width: 1400,
        backgroundColor: theme === 'dark' ? '#0a1114' : '#fdfaf6',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = pdfStyles as string;
          clonedDoc.head.appendChild(style);

          const textFixStyle = clonedDoc.createElement('style');
          textFixStyle.innerHTML = `
            * { 
              text-rendering: optimizeLegibility !important;
              letter-spacing: normal !important;
            }
          `;
          clonedDoc.head.appendChild(textFixStyle);

          const reportEl = clonedDoc.getElementById('report-container');
          if (reportEl) {
            reportEl.style.width = '1400px';
            reportEl.style.maxWidth = 'none';
          }
          
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
                c.style.flex = '1';
                c.style.height = 'auto';
              }
            });
            clonedGrid.style.display = 'flex';
            clonedGrid.style.flexDirection = 'row';
            clonedGrid.style.flexWrap = 'nowrap';
            clonedGrid.style.width = '100%';
            clonedGrid.style.gap = '2rem';
          }

          // Optimized color conversion
          const convCanvas = clonedDoc.createElement('canvas');
          convCanvas.width = 1; convCanvas.height = 1;
          const convCtx = convCanvas.getContext('2d');
          // Handles up to 2 levels of nested parentheses (common in color-mix and oklch with var)
          const modernColorRegex = /(?:oklch|oklab|color-mix)\s*\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/g;

          const convertColor = (color: string) => {
            if (!color || (!color.includes('oklch') && !color.includes('oklab') && !color.includes('color-mix'))) return color;
            if (!convCtx) return '#888888';
            try {
              convCtx.fillStyle = '#888888'; // Fallback
              convCtx.fillStyle = color;
              const result = convCtx.fillStyle;
              // If browser still returns the original string (failed to parse), use fallback
              return (result.includes('oklch') || result.includes('oklab') || result.includes('color-mix')) ? '#888888' : result;
            } catch (e) { return '#888888'; }
          };

          // 1. Process all style tags to prevent html2canvas parser from failing
          clonedDoc.querySelectorAll('style').forEach(tag => {
            if (tag.innerHTML.includes('oklch') || tag.innerHTML.includes('oklab') || tag.innerHTML.includes('color-mix')) {
              tag.innerHTML = tag.innerHTML.replace(modernColorRegex, (m) => convertColor(m));
            }
          });

          // 2. Process all elements for inline styles and other fixes
          clonedDoc.querySelectorAll('*').forEach(el => {
            const element = el as HTMLElement;
            if (element.style.opacity === '0') element.style.opacity = '1';
            element.style.transform = 'none';
            element.style.transition = 'none';
            element.style.animation = 'none';

            if (element.hasAttribute('data-pdf-chunk')) {
              element.style.height = 'auto';
              element.style.overflow = 'visible';
              if (element.getAttribute('data-pdf-chunk') === 'pdf-header') {
                element.style.display = 'flex';
              }
            }

            // Replace modern colors in inline styles
            if (element.style.cssText && (element.style.cssText.includes('oklch') || element.style.cssText.includes('oklab') || element.style.cssText.includes('color-mix'))) {
              element.style.cssText = element.style.cssText.replace(modernColorRegex, (m) => convertColor(m));
            }

            // Support for SVG attributes
            ['fill', 'stroke'].forEach(attr => {
              const val = element.getAttribute(attr);
              if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                element.setAttribute(attr, convertColor(val));
              }
            });
          });

          // 3. Process all rules in all accessible stylesheets
          try {
            Array.from(clonedDoc.styleSheets).forEach((sheet: any) => {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) return;
                Array.from(rules).forEach((rule: any) => {
                  if (rule.style && rule.style.cssText && (rule.style.cssText.includes('oklch') || rule.style.cssText.includes('oklab') || rule.style.cssText.includes('color-mix'))) {
                    rule.style.cssText = rule.style.cssText.replace(modernColorRegex, (m: string) => convertColor(m));
                  }
                });
              } catch (e) { }
            });
          } catch (e) { }
        }
      });
    }));

    for (const canvas of canvasResults) {
      if (!canvas) continue;

      const imgData = canvas.toDataURL('image/png', 0.8); // Slightly compress for speed
      const pageWidth = canvas.width / scale;
      const pageHeight = canvas.height / scale;
      
      const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

      if (!pdf) {
        pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [pageWidth, pageHeight],
          compress: true // Enable jsPDF compression
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
