const imageInput = document.querySelector('#image');
const progress = document.querySelector('#progress');
const results = document.querySelector('#results');
const metadata = document.querySelector('#metadata');
const ocrText = document.querySelector('#ocr-text');
const actions = document.querySelector('#actions');
const preview = document.querySelector('#preview');
const previewWrap = document.querySelector('#preview-wrap');

function setProgress(message) {
  progress.textContent = message;
  progress.classList.toggle('hidden', !message);
}

function addMetadata(label, value) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value;
  row.append(term, description);
  metadata.append(row);
}

function decimal(value) {
  return Number(value).toFixed(6);
}

function createSearchLinks(parts) {
  const query = parts.filter(Boolean).join(' ');
  if (!query) return;
  document.querySelector('#map-link').href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  document.querySelector('#search-link').href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  actions.classList.remove('hidden');
}

async function recognizeText(file) {
  try {
    const { data } = await Tesseract.recognize(file, 'fin+eng', {
      logger: (event) => {
        if (event.status === 'recognizing text') setProgress(`Tunnistetaan tekstiä: ${Math.round(event.progress * 100)} %`);
      }
    });
    return data.text.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.warn('Tekstintunnistus ei onnistunut', error);
    return '';
  }
}

imageInput.addEventListener('change', async () => {
  const [file] = imageInput.files;
  if (!file) return;
  metadata.replaceChildren();
  ocrText.textContent = '';
  actions.classList.add('hidden');
  results.classList.remove('hidden');
  document.querySelector('#filename').textContent = file.name;
  preview.src = URL.createObjectURL(file);
  previewWrap.classList.remove('hidden');
  setProgress('Luetaan kuvan metatietoja…');

  const searchParts = [];
  try {
    const exif = await exifr.parse(file, { gps: true, pick: ['latitude', 'longitude', 'DateTimeOriginal', 'Make', 'Model'] });
    if (exif?.latitude != null && exif?.longitude != null) {
      const coords = `${decimal(exif.latitude)}, ${decimal(exif.longitude)}`;
      addMetadata('GPS-koordinaatit', coords);
      searchParts.push(coords);
    } else {
      addMetadata('GPS-koordinaatit', 'Ei löytynyt');
    }
    if (exif?.DateTimeOriginal) addMetadata('Kuvausaika', new Date(exif.DateTimeOriginal).toLocaleString('fi-FI'));
    if (exif?.Make) addMetadata('Kameran valmistaja', exif.Make);
    if (exif?.Model) addMetadata('Kameran malli', exif.Model);
  } catch (error) {
    addMetadata('Metatiedot', 'Metatietoja ei voitu lukea tästä kuvasta.');
    console.warn('EXIF-luku ei onnistunut', error);
  }

  setProgress('Valmistellaan tekstintunnistusta…');
  const text = await recognizeText(file);
  ocrText.textContent = text || 'Tekstiä ei tunnistettu.';
  if (text) searchParts.push(text);
  createSearchLinks(searchParts);
  setProgress('');
});
