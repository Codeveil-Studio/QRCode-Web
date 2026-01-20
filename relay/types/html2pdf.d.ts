declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale: number; useCORS?: boolean; dpi?: number };
    jsPDF?: { unit: string; format: string | [number, number]; orientation: string };
    pagebreak?: { mode: string | string[]; before?: string; after?: string; avoid?: string };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    toPdf(): Html2Pdf;
    get(type: 'pdf'): Promise<any>;
    save(filename?: string): Promise<void>;
    output(type: string): Promise<any>;
  }

  function html2pdf(): Html2Pdf;
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2Pdf;

  export = html2pdf;
} 