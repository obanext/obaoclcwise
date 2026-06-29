# oclcwise endpoints op oba


## Aquabrowser parsed JSON vergelijken

De tijdelijke compatibiliteitslaag levert mapped output in de vorm van Aquabrowser parsed JSON. Voor regressiecontrole is er een vergelijkfunctie toegevoegd:

```js
import {
  compareParsedJson,
  compareSearchParsedJson,
  compareDetailParsedJson,
  compareParsedJsonShape,
} from './mapping/compareAquabrowserParsedJson.js';

const diff = compareDetailParsedJson(oldParsedJson, newParsedJson);

if (!diff.equal) {
  console.table(diff.differences);
}
```

Gebruik `compareParsedJson(..., { mode: 'exact' })` voor een strikte vergelijking. Gebruik `compareSearchParsedJson` of `compareDetailParsedJson` voor compatibiliteitsvergelijking waarbij dynamische velden zoals `meta.rctx._text` standaard genegeerd worden. Gebruik `compareParsedJsonShape` wanneer alleen de JSON-structuur moet overeenkomen.


## Parsed JSON output

De mock-up geeft nu naast de visuele representatie en de OCLC/WISE API-calls expliciet de Aquabrowser-compatible parsed JSON terug.

In de API-responses staat dit veld als `parsedJson`:

- `/api/oba-search?...` → `{ raw, parsedJson, mapped }`
- `/api/oba-detail?id=...` → `{ raw, parsedJson, mapped }`

`mapped` blijft tijdelijk aanwezig als alias voor bestaande mock-up code. De inhoud van `parsedJson` is de volledige wrapper die de oude geparseerde Aquabrowser-JSON zo dicht mogelijk volgt.

De debugpagina's tonen dit onder: **Parsed JSON (Aquabrowser-compatible wrapper)**.

## Wrapper-functies

De mock-up bevat nu twee expliciete wrapper-functies in `mapping/wrappers.js`:

- `wrapperZoeken(rawSearchData)` voor de zoekpagina
- `wrapperDetail(rawDetailData)` voor de detailpagina

Deze functies zijn het vaste punt waar OCLC/WISE-data wordt vertaald naar de Aquabrowser-compatible parsed JSON. De visuele mock-up leest daarna uit `parsedJson`, niet rechtstreeks uit de raw OCLC/WISE-response. In de UI staat dit ook als card boven de debug-output.
