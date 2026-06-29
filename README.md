# OBA OCLC Wise mock-up

Deze versie herstelt de voorgaande mock-up en voegt twee aparte wrapper-routes toe.

## Bestaande IST-routes

- `/oba-search` — IST zoekpagina
- `/oba-detail/[id]` — IST detailpagina

## Nieuwe wrapper-routes

- `/wrapper-zoeken` — gebruikt `wrapperZoeken(rawSearchData)`
- `/wrapper-detail/[id]` — gebruikt `wrapperDetail(rawDetailData)`

De wrapper-routes volgen deze flow:

```text
OCLC/WISE API-calls
→ raw OCLC/WISE data
→ wrapperZoeken(raw) of wrapperDetail(raw)
→ volledige Aquabrowser-compatible parsed JSON
→ mock-up visualisatie
```

De visualisatie op de wrapper-pagina’s leest dus uit de `parsedJson`-wrapper. De raw OCLC/WISE API-calls blijven zichtbaar als controle-informatie.

De wrapper-functies staan apart in:

- `mapping/wrapperZoeken.js`
- `mapping/wrapperDetail.js`
