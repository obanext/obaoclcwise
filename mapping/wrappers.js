import { mapWiseSearchToObaFull } from "./mapWiseSearchToObaFull";
import { mapWiseToObaFull } from "./mapWiseToObaFull";

/**
 * Wrapper zoeken
 *
 * Tijdelijke Aquabrowser-compatibiliteitsfunctie voor de zoekpagina.
 * Neemt de beschikbare OCLC/WISE zoekdata en levert de geparseerde
 * JSON-structuur terug die de oude Aquabrowser-output nabootst.
 */
export function wrapperZoeken(rawSearchData) {
  return mapWiseSearchToObaFull(rawSearchData);
}

/**
 * Wrapper detail
 *
 * Tijdelijke Aquabrowser-compatibiliteitsfunctie voor de detailpagina.
 * Neemt de beschikbare OCLC/WISE detaildata en levert de geparseerde
 * JSON-structuur terug die de oude Aquabrowser-output nabootst.
 */
export function wrapperDetail(rawDetailData) {
  return mapWiseToObaFull(rawDetailData);
}
