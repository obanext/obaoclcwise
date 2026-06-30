import { mapWiseSearchToObaFull } from "./mapWiseSearchToObaFull";

// Wrapper zoeken
// Neemt de beschikbare OCLC/WISE zoekdata als bron en geeft de volledige
// Aquabrowser-compatible parsed JSON terug. Deze functie is bedoeld als
// tijdelijk compatibiliteitscontract voor migratie.
export function wrapperZoeken(rawSearchData) {
  return mapWiseSearchToObaFull(rawSearchData);
}
