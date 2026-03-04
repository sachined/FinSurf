/**
 * Triggers the browser's native print dialog so the user can save the
 * report as a PDF (or send it to a physical printer).
 *
 * All theme/dark-mode handling is done entirely in CSS via @media print
 * rules in pdf.css — no JS color conversion or DOM cloning required.
 */
export const downloadPDF = (ticker: string): void => {
  const originalTitle = document.title;
  document.title = `FinSurf-Report-${ticker || 'Analysis'}`;
  window.print();
  document.title = originalTitle;
};
