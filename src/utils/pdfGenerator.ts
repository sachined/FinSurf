import { type Theme, type PDFMode } from '../types';
import pdfStyles from '../services/pdf.css?inline';

/**
 * Generates and downloads a PDF of the market analysis report.
 * Uses dynamic imports to keep the initial bundle small.
 */
export const downloadPDF = async (ticker: string, theme: Theme, pdfMode: PDFMode = 'standard', scale: number = 2) => {
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
        const gap = pdfMode === 'hd' ? 0 : 20; 
        
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

    // Parallelize chunk capture for speed
    const results = await Promise.all(chunks.map(async (item) => {
      const isGroup = Array.isArray(item);
      const group = isGroup ? item : [item];
      const firstEl = group[0];
      const isCard = firstEl.getAttribute('data-pdf-chunk') === 'card';
      
      const captureTarget = (isCard && firstEl.parentElement?.id === 'agents-grid') 
        ? firstEl.parentElement 
        : firstEl;

      const canvas = await html2canvas(captureTarget, {
        scale: scale,
        useCORS: true,
        logging: false,
        windowWidth: 1400,
        width: 1400,
        backgroundColor: theme === 'dark' ? '#0a1114' : '#fdfaf6',
        onclone: (clonedDoc) => {
          // Force theme class on clone for CSS selection consistency
          if (theme === 'dark') {
            clonedDoc.documentElement.classList.add('dark');
            clonedDoc.body.classList.add('dark');
          } else {
            clonedDoc.documentElement.classList.remove('dark');
            clonedDoc.body.classList.remove('dark');
          }

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
            clonedGrid.style.gap = pdfMode === 'hd' ? '0' : '20px';
            clonedGrid.style.marginBottom = pdfMode === 'hd' ? '0' : '20px';
          }

          const clonedHeader = clonedDoc.querySelector('[data-pdf-chunk="pdf-header"]') as HTMLElement;
          if (clonedHeader) {
            clonedHeader.style.marginBottom = '2rem';
          }

          // Optimized color conversion
          const convCanvas = clonedDoc.createElement('canvas');
          convCanvas.width = 1; convCanvas.height = 1;
          const convCtx = convCanvas.getContext('2d');
          // Handles up to 2 levels of nested parentheses (common in color-mix and oklch with var)
          const modernColorRegex = /(?:oklch|oklab|color-mix)\s*\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/g;

          const convertColor = (color: string) => {
            if (!color || (!color.includes('oklch') && !color.includes('oklab') && !color.includes('color-mix'))) return color;
            if (!convCtx) return theme === 'dark' ? '#cbd5e1' : '#334155';
            try {
              // Reset to check if browser actually parses the new color
              convCtx.fillStyle = '#00000000'; 
              convCtx.fillStyle = color;
              const result = convCtx.fillStyle;
              
              // If it's still transparent or contains unparsed modern syntax/vars, use theme-safe fallback
              if (result === '#00000000' || result === 'rgba(0, 0, 0, 0)' || 
                  result.includes('oklch') || result.includes('oklab') || 
                  result.includes('color-mix') || result.includes('var(')) {
                return theme === 'dark' ? '#cbd5e1' : '#334155';
              }
              return result;
            } catch (e) { 
              return theme === 'dark' ? '#cbd5e1' : '#334155'; 
            }
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
            
            // Fix sticky elements for PDF capture
            const computedPos = window.getComputedStyle(element).position;
            if (computedPos === 'sticky') {
              element.style.position = 'relative';
              element.style.top = '0';
            }

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

      return { canvas, item };
    }));

    const PAGE_WIDTH = 1400;
    const STANDARD_A4_HEIGHT = 1980;
    const SINGLE_PAGE_THRESHOLD = pdfMode === 'hd' ? 8000 : 4000; // HD prefers one long page
    const CHUNK_GAP = pdfMode === 'hd' ? 10 : 30;

    // Calculate total height to see if it fits on one page
    let totalHeight = 0;
    results.forEach(({ canvas, item }, index) => {
      const chunkH = canvas.height / scale;
      const isGroup = Array.isArray(item);
      const firstEl = isGroup ? item[0] : item;
      const isCard = firstEl.getAttribute('data-pdf-chunk') === 'card';
      const prevIsCard = index > 0 && (Array.isArray(results[index-1].item) ? (results[index-1].item as HTMLElement[])[0] : results[index-1].item as HTMLElement).getAttribute('data-pdf-chunk') === 'card';
      
      const effectiveGap = (isCard && prevIsCard) ? (pdfMode === 'hd' ? 0 : 20) : CHUNK_GAP;
      totalHeight += chunkH + (index === 0 ? 0 : effectiveGap);
    });

    const useSinglePage = totalHeight <= SINGLE_PAGE_THRESHOLD;
    let pdf: any = null;
    let currentY = 0;
    let prevWasCard = false;

    for (const { canvas, item } of results) {
      if (!canvas) continue;

      const imgData = canvas.toDataURL('image/png', 0.8); // Slightly compress for speed
      const chunkW = canvas.width / scale;
      const chunkH = canvas.height / scale;
      
      const isGroup = Array.isArray(item);
      const firstEl = isGroup ? item[0] : item;
      const isCard = firstEl.getAttribute('data-pdf-chunk') === 'card';
      const hasBreakBefore = firstEl.getAttribute('data-pdf-break') === 'before';

      if (!pdf) {
        // Initialize PDF: use total height if it fits, else start with standard page
        const initialHeight = useSinglePage ? totalHeight : Math.max(STANDARD_A4_HEIGHT, chunkH);
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [PAGE_WIDTH, initialHeight],
          compress: true
        });
        currentY = 0;
      } else if (!useSinglePage) {
        // Multiple pages logic
        const currentPageHeight = pdf.internal.pageSize.getHeight();
        const effectiveGap = (isCard && prevWasCard) ? (pdfMode === 'hd' ? 0 : 20) : CHUNK_GAP;
        const needsNewPage = hasBreakBefore || (currentY + chunkH + effectiveGap > currentPageHeight);

        if (needsNewPage) {
          pdf.addPage([PAGE_WIDTH, Math.max(STANDARD_A4_HEIGHT, chunkH)], 'portrait');
          currentY = 0;
        } else {
          currentY += effectiveGap;
        }
      } else {
        // Single page: just apply the gap
        const effectiveGap = (isCard && prevWasCard) ? (pdfMode === 'hd' ? 0 : 20) : CHUNK_GAP;
        currentY += effectiveGap;
      }
      
      pdf.addImage(imgData, 'PNG', 0, currentY, chunkW, chunkH, undefined, 'FAST');
      currentY += chunkH;
      prevWasCard = isCard;
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
