import * as pdfjsLib from './assets/pdf/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf/pdf.worker.mjs';

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let renderTask = null;
let currentBlob = null;

function dispatch(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function load(blob) {
  if (!blob) return false;
  currentBlob = blob;
  const buffer = await blob.arrayBuffer();
  pdfDoc = await pdfjsLib.getDocument({
    data: buffer,
    cMapUrl: './assets/pdf/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: './assets/pdf/standard_fonts/'
  }).promise;
  totalPages = pdfDoc.numPages || 0;
  currentPage = 1;
  dispatch('pdf-ready', { pages: totalPages });
  await renderPage(currentPage);
  return true;
}

async function renderPage(pageNumber, containerSelector = '[data-score-visual]') {
  if (!pdfDoc) return false;
  const container = document.querySelector(containerSelector);
  if (!container) return false;
  const page = await pdfDoc.getPage(pageNumber);
  const rect = container.getBoundingClientRect();
  const baseViewport = page.getViewport({ scale: 1.0 });
  const maxWidth = rect.width || 320;
  const scale = Math.min(2.0, Math.max(1.0, maxWidth / baseViewport.width));
  const viewport = page.getViewport({ scale });
  const dpr = window.devicePixelRatio || 1;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  if (context) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  container.innerHTML = '';
  container.appendChild(canvas);

  if (renderTask) {
    try { renderTask.cancel(); } catch {}
  }
  renderTask = page.render({ canvasContext: context, viewport });
  await renderTask.promise;
  dispatch('pdf-page', { page: pageNumber, pages: totalPages });
  return true;
}

async function setPage(pageNumber) {
  if (!pdfDoc) return false;
  const next = Math.min(Math.max(1, pageNumber), totalPages || 1);
  currentPage = next;
  await renderPage(currentPage);
  return true;
}

async function nextPage() {
  return setPage(currentPage + 1);
}

async function prevPage() {
  return setPage(currentPage - 1);
}

function pageCount() {
  return totalPages;
}

window.EmersonPdf = {
  load,
  renderPage,
  setPage,
  nextPage,
  prevPage,
  pageCount
};
