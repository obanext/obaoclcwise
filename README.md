# OCLC Wise → OBA mockup

Deze mockup is een tijdelijke testinstallatie voor bronbewijs, contractmapping en visuele A/B-tests met OCLC-data.

De installatie heeft drie functies:

1. **Bewijsvoering**  
   Tonen welke OCLC endpoint, welk veld en welke bronwaarde gebruikt worden.

2. **Mapping op het huidige OBA JSON-contract**  
   Tonen waar OCLC-data terechtkomt in de huidige OBA/GB raw JSON-structuur.

3. **Visuele A/B-representatie**  
   Zoek- en detailpagina visueel kunnen beoordelen met OCLC-data.

## Actieve IST-hoofdstromen

### IST search

De zoekresultaatpagina gebruikt `titlesummary` voor ranking, totaal, paginering en facetten. Voor de maximaal twintig zichtbare resultaten wordt `/discovery/title/{id}` gebruikt om aanvullende contractvelden zoals uitgever, collatie, PPN, onderwerpen, reeks en doelgroep te vullen.

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

De search mapping CSV bevat de algemene zoekregels één keer en daarna de veldmapping voor alle maximaal 20 resultaten van de huidige pagina.

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

De CSV gebruikt uitsluitend deze statussen:

- `direct`: de OCLC-waarde wordt op het juiste OBA JSON-contractpad gezet. `_text` en `_attributes` horen bij deze directe contractplaatsing.
- `afgeleid`: de waarde wordt berekend, gesplitst of samengesteld uit één of meer OCLC/requestwaarden.
- `na`: de gebruikte OCLC-response bevat geen bruikbare bronwaarde voor dit contractveld. Er wordt niets verzonnen.

Een veld dat zowel in OCLC als in het huidige OBA JSON-contract bestaat, wordt gemapt.

## Belangrijke regel

OCLC-waarden worden op de bestaande OBA JSON-contractpaden geplaatst. Afleidingen worden expliciet als `afgeleid` gedocumenteerd.

## Nog apart te beoordelen testpagina's

Deze testflows blijven voorlopig apart beoordeelbaar en worden later per stuk opgeschoond:

- ALL
- SOLL
- Preselect
- geavanceerd zoeken
- natuurlijke taal / Nexi

Ze worden niet samengevoegd met IST search/detail zolang hun testdoel nog apart beoordeeld moet worden.


## ALL OCLC testflows

De ALL-pagina's tonen OCLC-brondata zonder mapping naar het OBA JSON-contract.

- `/oclc-search`: visuele zoekresultaten, Alles OCLC, OCLC API calls, JSON-download, resultaten-CSV en facetten-CSV.
- `/oclc-detail/[id]`: visuele detailpagina, specificaties, beschikbaarheid, vijf aanbevolen titels, Alles OCLC, OCLC API calls, JSON-download en brondata-CSV.

De ALL-detailpagina gebruikt daarnaast `/title/{titleId}/recommended/title?limit=5&offset=0` voor de aanbevelingen.

Zoekresultaten van `/oclc-search` linken naar `/oclc-detail/[id]`.
