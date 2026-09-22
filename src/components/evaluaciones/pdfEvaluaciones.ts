import type { jsPDF } from 'jspdf';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

/** Crea un documento PDF A4 en orientación vertical (carga dinámica de jspdf). */
export async function crearDocPdfA4(): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import('jspdf');
  return new JsPDF('p', 'mm', 'a4');
}

export type CapturaImagenResult = {
  imgData: string;
  width: number;
  height: number;
};

/** Captura un elemento DOM como JPEG vía html2canvas (import dinámico). */
export async function capturarElementoComoImagen(
  el: HTMLElement,
  options?: { scale?: number; quality?: number }
): Promise<CapturaImagenResult> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    scale: options?.scale ?? 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const imgData = canvas.toDataURL('image/jpeg', options?.quality ?? 0.92);
  return { imgData, width: canvas.width, height: canvas.height };
}

/** Dibuja la imagen centrada ajustada al área de página A4 (mm). */
export function agregarImagenAjustadaAPagina(
  doc: jsPDF,
  imgData: string,
  canvasWidth: number,
  canvasHeight: number,
  pageW: number = PAGE_W_MM,
  pageH: number = PAGE_H_MM
): void {
  const imgAspect = canvasWidth / canvasHeight;
  const pageAspect = pageW / pageH;
  let drawW: number;
  let drawH: number;
  let x: number;
  let y: number;
  if (imgAspect > pageAspect) {
    drawH = pageH;
    drawW = pageH * imgAspect;
    x = (pageW - drawW) / 2;
    y = 0;
  } else {
    drawW = pageW;
    drawH = pageW / imgAspect;
    x = 0;
    y = (pageH - drawH) / 2;
  }
  doc.addImage(imgData, 'JPEG', x, y, drawW, drawH);
}

export { PAGE_W_MM, PAGE_H_MM };
