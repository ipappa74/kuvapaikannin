"""Kuvapaikannin: paikallisesti ajettava kuvan geopaikannuksen apuväline."""

from __future__ import annotations

import io
import os
from dataclasses import dataclass
from urllib.parse import quote_plus

from flask import Flask, render_template, request
from PIL import ExifTags, Image

try:
    import pytesseract
except ImportError:  # Sovellus toimii myös ilman OCR-kirjastoa.
    pytesseract = None


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "tif", "tiff"}


@dataclass
class Finding:
    title: str
    value: str
    kind: str


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def rational_to_float(value) -> float:
    """Muuntaa EXIF:n rationaaliluvun tai numeroarvon liukuluvuksi."""
    if hasattr(value, "numerator") and hasattr(value, "denominator"):
        return float(value.numerator) / float(value.denominator)
    return float(value)


def dms_to_decimal(values, hemisphere) -> float:
    degrees, minutes, seconds = (rational_to_float(part) for part in values)
    result = degrees + minutes / 60 + seconds / 3600
    return -result if hemisphere in {"S", "W"} else result


def read_exif(image: Image.Image) -> list[Finding]:
    raw_exif = image.getexif()
    if not raw_exif:
        return []

    findings: list[Finding] = []
    gps = raw_exif.get_ifd(ExifTags.IFD.GPSInfo) if ExifTags.IFD.GPSInfo in raw_exif else {}
    gps_data = {ExifTags.GPSTAGS.get(key, key): value for key, value in gps.items()}
    try:
        latitude = dms_to_decimal(gps_data["GPSLatitude"], gps_data["GPSLatitudeRef"])
        longitude = dms_to_decimal(gps_data["GPSLongitude"], gps_data["GPSLongitudeRef"])
        findings.append(Finding("GPS-koordinaatit", f"{latitude:.6f}, {longitude:.6f}", "coordinates"))
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        pass

    for tag_name, label in (("DateTimeOriginal", "Kuvausaika"), ("Make", "Kameran valmistaja"), ("Model", "Kameran malli")):
        tag_id = next((key for key, name in ExifTags.TAGS.items() if name == tag_name), None)
        if tag_id is not None and raw_exif.get(tag_id):
            findings.append(Finding(label, str(raw_exif.get(tag_id)), "metadata"))
    return findings


def read_text(image: Image.Image) -> str | None:
    if pytesseract is None:
        return None
    try:
        text = pytesseract.image_to_string(image, lang="fin+eng")
        cleaned = " ".join(text.split())
        return cleaned[:800] or None
    except (pytesseract.TesseractNotFoundError, OSError):
        return None


@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    error = None
    if request.method == "POST":
        upload = request.files.get("image")
        if not upload or not upload.filename:
            error = "Valitse kuva ennen analyysiä."
        elif not allowed_file(upload.filename):
            error = "Sallittuja tiedostoja ovat JPG, PNG, WebP ja TIFF."
        else:
            try:
                image = Image.open(io.BytesIO(upload.read()))
                image.load()
                findings = read_exif(image)
                detected_text = read_text(image)
                query_parts = [item.value for item in findings if item.kind == "coordinates"]
                if detected_text:
                    query_parts.append(detected_text)
                query = " ".join(query_parts)
                result = {
                    "filename": os.path.basename(upload.filename),
                    "findings": findings,
                    "text": detected_text,
                    "map_url": f"https://www.openstreetmap.org/search?query={quote_plus(query)}" if query else None,
                    "search_url": f"https://www.google.com/search?q={quote_plus(query)}" if query else None,
                }
            except (OSError, ValueError):
                error = "Kuvaa ei voitu lukea. Tarkista, että tiedosto on ehjä kuva."
    return render_template("index.html", result=result, error=error)


@app.errorhandler(413)
def file_too_large(_error):
    return render_template("index.html", error="Kuvan enimmäiskoko on 12 Mt."), 413


if __name__ == "__main__":
    app.run(debug=True)
