const imageInput = document.querySelector('#image');
const progress = document.querySelector('#progress');
const results = document.querySelector('#results');
const metadata = document.querySelector('#metadata');
const ocrText = document.querySelector('#ocr-text');
const actions = document.querySelector('#actions');
const preview = document.querySelector('#preview');
const previewWrap = document.querySelector('#preview-wrap');
const selectionBox = document.querySelector('#selection');
const canvasHolder = document.querySelector('#canvas-holder');
const cropButton = document.querySelector('#crop');
const manualClues = document.querySelector('#manual-clues');
let baseCanvas, originalCanvas, renderedCanvas, gpsQuery = '', recognizedText = '', selection, dragStart;

function setProgress(message) { progress.textContent = message; progress.classList.toggle('hidden', !message); }
function addMetadata(label, value) { const row = document.createElement('div'); const term = document.createElement('dt'); const description = document.createElement('dd'); term.textContent = label; description.textContent = value; row.append(term, description); metadata.append(row); }
function decimal(value) { return Number(value).toFixed(6); }
function newCanvas(width, height) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas; }
function copyCanvas(source) { const copy = newCanvas(source.width, source.height); copy.getContext('2d').drawImage(source, 0, 0); return copy; }

function createSearchLinks() {
  const query = [gpsQuery, recognizedText, manualClues.value.trim()].filter(Boolean).join(' ');
  if (!query) return;
  document.querySelector('#map-link').href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  document.querySelector('#search-link').href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  actions.classList.remove('hidden');
}

function updateFilterLabels() { document.querySelector('#brightness-value').textContent = `${document.querySelector('#brightness').value} %`; document.querySelector('#contrast-value').textContent = `${document.querySelector('#contrast').value} %`; }
function clearSelection() { selection = undefined; cropButton.disabled = true; selectionBox.classList.add('hidden'); }
function drawPreview() {
  if (!baseCanvas) return;
  preview.width = baseCanvas.width; preview.height = baseCanvas.height;
  const context = preview.getContext('2d');
  context.filter = `brightness(${document.querySelector('#brightness').value}%) contrast(${document.querySelector('#contrast').value}%) grayscale(${document.querySelector('#grayscale').checked ? 100 : 0}%)`;
  context.drawImage(baseCanvas, 0, 0); context.filter = 'none'; renderedCanvas = preview; clearSelection();
}
function pointInCanvas(event) { const rect = preview.getBoundingClientRect(); return { x: (event.clientX - rect.left) * preview.width / rect.width, y: (event.clientY - rect.top) * preview.height / rect.height }; }
function updateSelectionBox() {
  if (!selection) return;
  const canvasRect = preview.getBoundingClientRect(), holderRect = canvasHolder.getBoundingClientRect();
  const scaleX = canvasRect.width / preview.width, scaleY = canvasRect.height / preview.height;
  selectionBox.style.left = `${canvasRect.left - holderRect.left + selection.x * scaleX}px`;
  selectionBox.style.top = `${canvasRect.top - holderRect.top + selection.y * scaleY}px`;
  selectionBox.style.width = `${selection.width * scaleX}px`; selectionBox.style.height = `${selection.height * scaleY}px`;
  selectionBox.classList.remove('hidden');
}
function rotate(clockwise) {
  const rotated = newCanvas(baseCanvas.height, baseCanvas.width), context = rotated.getContext('2d');
  if (clockwise) { context.translate(rotated.width, 0); context.rotate(Math.PI / 2); } else { context.translate(0, rotated.height); context.rotate(-Math.PI / 2); }
  context.drawImage(baseCanvas, 0, 0); baseCanvas = rotated; drawPreview();
}
function cropSelection() {
  if (!selection) return;
  const cropped = newCanvas(Math.round(selection.width), Math.round(selection.height));
  cropped.getContext('2d').drawImage(renderedCanvas, selection.x, selection.y, selection.width, selection.height, 0, 0, cropped.width, cropped.height);
  baseCanvas = cropped; document.querySelector('#brightness').value = 100; document.querySelector('#contrast').value = 100; document.querySelector('#grayscale').checked = false; updateFilterLabels(); drawPreview();
}
function downloadImage() { const link = document.createElement('a'); link.download = 'kuvapaikannin-kasitelty.png'; link.href = renderedCanvas.toDataURL('image/png'); link.click(); }
async function recognizeText(canvas) {
  try { const { data } = await Tesseract.recognize(canvas, 'fin+eng', { logger: (event) => { if (event.status === 'recognizing text') setProgress(`Tunnistetaan tekstiä: ${Math.round(event.progress * 100)} %`); } }); return data.text.replace(/\s+/g, ' ').trim(); }
  catch (error) { console.warn('Tekstintunnistus ei onnistunut', error); return ''; }
}

preview.addEventListener('pointerdown', (event) => { if (!baseCanvas) return; dragStart = pointInCanvas(event); preview.setPointerCapture(event.pointerId); });
preview.addEventListener('pointermove', (event) => { if (!dragStart) return; const point = pointInCanvas(event); selection = { x: Math.min(dragStart.x, point.x), y: Math.min(dragStart.y, point.y), width: Math.abs(point.x - dragStart.x), height: Math.abs(point.y - dragStart.y) }; cropButton.disabled = selection.width < 12 || selection.height < 12; updateSelectionBox(); });
preview.addEventListener('pointerup', () => { dragStart = undefined; }); window.addEventListener('resize', updateSelectionBox);
document.querySelector('#rotate-left').addEventListener('click', () => rotate(false)); document.querySelector('#rotate-right').addEventListener('click', () => rotate(true)); document.querySelector('#crop').addEventListener('click', cropSelection);
document.querySelector('#reset').addEventListener('click', () => { if (originalCanvas) { baseCanvas = copyCanvas(originalCanvas); document.querySelector('#brightness').value = 100; document.querySelector('#contrast').value = 100; document.querySelector('#grayscale').checked = false; updateFilterLabels(); drawPreview(); } });
document.querySelector('#download').addEventListener('click', downloadImage);
document.querySelector('#brightness').addEventListener('input', () => { updateFilterLabels(); drawPreview(); }); document.querySelector('#contrast').addEventListener('input', () => { updateFilterLabels(); drawPreview(); }); document.querySelector('#grayscale').addEventListener('change', drawPreview); manualClues.addEventListener('input', createSearchLinks);
document.querySelector('#run-ocr').addEventListener('click', async () => { if (!renderedCanvas) return; setProgress('Valmistellaan tekstintunnistusta…'); recognizedText = await recognizeText(renderedCanvas); ocrText.textContent = recognizedText || 'Tekstiä ei tunnistettu.'; createSearchLinks(); setProgress(''); });

imageInput.addEventListener('change', async () => {
  const [file] = imageInput.files; if (!file) return;
  metadata.replaceChildren(); ocrText.textContent = ''; actions.classList.add('hidden'); results.classList.remove('hidden'); document.querySelector('#filename').textContent = file.name; previewWrap.classList.remove('hidden'); setProgress('Luetaan kuvan metatietoja…'); gpsQuery = ''; recognizedText = '';
  try {
    const exif = await exifr.parse(file, { gps: true, pick: ['latitude', 'longitude', 'DateTimeOriginal', 'Make', 'Model'] });
    if (exif?.latitude != null && exif?.longitude != null) { gpsQuery = `${decimal(exif.latitude)}, ${decimal(exif.longitude)}`; addMetadata('GPS-koordinaatit', gpsQuery); } else addMetadata('GPS-koordinaatit', 'Ei löytynyt');
    if (exif?.DateTimeOriginal) addMetadata('Kuvausaika', new Date(exif.DateTimeOriginal).toLocaleString('fi-FI')); if (exif?.Make) addMetadata('Kameran valmistaja', exif.Make); if (exif?.Model) addMetadata('Kameran malli', exif.Model);
  } catch (error) { addMetadata('Metatiedot', 'Metatietoja ei voitu lukea tästä kuvasta.'); console.warn('EXIF-luku ei onnistunut', error); }
  const image = await createImageBitmap(file), limit = 1800, scale = Math.min(1, limit / Math.max(image.width, image.height));
  originalCanvas = newCanvas(Math.round(image.width * scale), Math.round(image.height * scale)); originalCanvas.getContext('2d').drawImage(image, 0, 0, originalCanvas.width, originalCanvas.height); baseCanvas = copyCanvas(originalCanvas); drawPreview();
  ocrText.textContent = 'Säädä kuva tarvittaessa ja valitse sitten “Tunnista teksti käsitellystä kuvasta”.'; createSearchLinks(); setProgress('');
});
