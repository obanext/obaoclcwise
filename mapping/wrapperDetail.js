import { mapWiseToObaFull } from "./mapWiseToObaFull";

// Wrapper detail
// Neemt de beschikbare OCLC/WISE detaildata als bron en geeft de volledige
// Aquabrowser-compatible parsed JSON terug. Deze functie is bedoeld als
// tijdelijk compatibiliteitscontract voor migratie.
export function wrapperDetail(rawDetailData) {
  return mapWiseToObaFull(rawDetailData);
}
