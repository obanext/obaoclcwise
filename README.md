# OCLC Wise → OBA mockup

Deze mockup is een tijdelijke testinstallatie. Het doel is niet om een nieuw definitief datamodel te bouwen en ook niet om oude OBA/ABL-inhoud na te maken.

De installatie heeft drie functies:

1. **Bewijsvoering**  
   Tonen welke OCLC endpoint, welk veld en welke bronwaarde gebruikt worden.

2. **Mapping op het huidige OBA JSON-contract**  
   Tonen waar OCLC-data terechtkomt in de huidige OBA/GB raw JSON-structuur.

3. **Visuele A/B-representatie**  
   Zoek- en detailpagina visueel kunnen beoordelen met OCLC-data.

## Actieve IST-hoofdstromen

### IST search

Bestanden:

- `pages/oba-search.js`
- `pages/api/oba-search.js`
- `mapping/mapWiseSearchToObaFull.js`
- `utils/searchMappingRows.js`

Gebruikte OCLC-bronnen:

- `/branch/1000/clienttype/default/perspective`
- `/branch/1000/perspective/{perspectiveId}/titlesummary`

Zichtbare outputs:

- visuele zoekresultaten
- Alles OCLC
- OCLC API calls
- Mapped output
- Download mapping CSV

Niet zichtbaar als aparte tab:

- mockup raw wrapper
- mapping rows

### IST detail

Bestanden:

- `pages/oba-detail/[id].js`
- `pages/api/oba-detail.js`
- `mapping/mapWiseToObaFull.js`
- `utils/mappingRows.js`
- `utils/csv.js`

Gebruikte OCLC-bronnen:

- `/discovery/title/{id}`
- `/title/{id}`
- `/branch/1000/titleavailability/{id}?clientType=PUBLIC&holdsCount=true`
- `/title/{id}/iteminformation`

Zichtbare outputs:

- visuele detailpagina
- Alles OCLC
- OCLC API calls
- Mapped output
- Download mapping CSV

## Mappingstatussen

De CSV gebruikt deze betekenissen:

- `direct`: OCLC-veldwaarde wordt direct op het contractpad gezet.
- `technische contractvorming`: OCLC-waarde wordt in de bestaande JSON-vorm geplaatst, bijvoorbeeld `_text` en `_attributes`.
- `afgeleid`: waarde wordt gesplitst, samengesteld of uit requestcontext gehaald.
- `leeg bewust`: het contractveld bestaat, maar er is geen bruikbare OCLC-bronwaarde.
- `niet beschikbaar in OCLC`: het bestaande OBA/GB veld heeft geen equivalent in de gebruikte OCLC responses.

## Belangrijke regel

Oude OBA/ABL-waarden worden niet inhoudelijk nagemaakt. Alleen technische contractvorming is toegestaan als het huidige OBA JSON-contract die vorm nodig heeft. Dat moet in codecommentaar en CSV zichtbaar zijn.

## Nog apart te beoordelen testpagina's

Deze testflows blijven voorlopig apart beoordeelbaar en worden later per stuk opgeschoond:

- ALL
- SOLL
- Preselect
- geavanceerd zoeken
- natuurlijke taal / Nexi

Ze worden niet samengevoegd met IST search/detail zolang hun testdoel nog apart beoordeeld moet worden.
