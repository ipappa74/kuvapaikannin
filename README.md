# Kuvapaikannin

Selainpohjainen työkalu, joka etsii kuvasta paikkavihjeitä EXIF-metatiedoista ja tekstintunnistuksella. Ladattu kuva käsitellään selaimessa eikä sitä siirretä palvelimelle.

## GitHub Pages

Julkaistava sivusto on `docs/`-kansiossa. Ota GitHubissa käyttöön **Settings → Pages → Deploy from a branch → main → /docs**.

## Käynnistys Windowsissa

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask --app app run
```

Avaa selaimessa `http://127.0.0.1:5000`.

GitHub Pages -versio lataa EXIF-luvun ja tekstintunnistuksen selainkirjastoina. Ensimmäinen tekstintunnistus voi kestää hetken, koska selain lataa OCR-kieliaineiston.

## Rajaus ja yksityisyys

Työkalu antaa vihjeitä, ei varmistettuja päätelmiä. Käytä sitä vain kuviin, joiden tutkimiseen sinulla on lupa. Älä käytä työkalua henkilön reaaliaikaiseen paikantamiseen.
