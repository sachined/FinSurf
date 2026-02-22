import { type Theme } from '../types';
import pdfStyles from '../services/pdf.css?inline';

/**
 * Generates and downloads a PDF of the market analysis report.
 * Uses dynamic imports to keep the initial bundle small.
 */
export const downloadPDF = async (ticker: string, theme: Theme) => {
  const element = document.getElementById('report-container');
  if (!element) return;
  
  try {
    // Dynamic imports for large libraries
    const [html2canvas, { jsPDF }] = await Promise.all([
      import('html2canvas').then(m => m.default),
      import('jspdf')
    ]);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: 1400,
      backgroundColor: theme === 'dark' ? '#0a1114' : '#fdfaf6',
      onclone: (clonedDoc) => {
        // Add PDF-only styles from the stylesheet
        const style = clonedDoc.createElement('style');
        style.innerHTML = pdfStyles as string;
        clonedDoc.head.appendChild(style);

        // Fix text rendering issues in html2canvas (missing spaces)
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

        // Force desktop width for consistent layout in PDF
        const reportEl = clonedDoc.getElementById('report-container');
        if (reportEl) {
          reportEl.style.width = '1400px';
          reportEl.style.maxWidth = 'none';
          reportEl.style.height = 'auto';
        }
        
        const elements = reportEl ? reportEl.getElementsByTagName('*') : [];
        const clonedWindow = clonedDoc.defaultView || window;
        
        // Canvas for reliable color conversion (oklch/oklab to RGB)
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

        // Process all elements for visibility, animations, and color conversion
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          
          if (el.hasAttribute('style')) {
            if (el.style.opacity === '0') el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.transition = 'none';
            el.style.animation = 'none';
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

        // Sanitize global styles to remove modern color functions
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

    // Finalize PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`FinSurf-Report-${ticker || 'Analysis'}.pdf`);
  } catch (error) {
    console.error('PDF Generation failed:', error);
    alert('PDF generation failed. Check console for details.');
  }
};
