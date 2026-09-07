# Kuvapaikannin

Paikallisesti ajettava Flask-työkalu, joka etsii kuvasta paikkavihjeitä EXIF-metatiedoista ja tekstintunnistuksella. Ladattuja kuvia ei tallenneta levylle.

## Käynnistys Windowsissa

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask --app app run
```

Avaa selaimessa `http://127.0.0.1:5000`.

Tekstintunnistus tarvitsee lisäksi [Tesseract OCR:n](https://github.com/UB-Mannheim/tesseract/wiki) sekä suomen ja englannin kielipaketit. Jos se puuttuu, metatietojen luku toimii silti.

## Rajaus ja yksityisyys

Työkalu antaa vihjeitä, ei varmistettuja päätelmiä. Käytä sitä vain kuviin, joiden tutkimiseen sinulla on lupa. Älä käytä työkalua henkilön reaaliaikaiseen paikantamiseen.
