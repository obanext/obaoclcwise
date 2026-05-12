export function toDetailMappingCsv(rows) {
  const headers = [
    "OBA detailpagina",
    "raw json parsed veld",
    "OCLC endpoint",
    "OCLC veld",
    "OCLC waarde",
  ];

  const escape = (value) => {
    const stringValue = value === null || value === undefined ? "" : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.label,
        row.jsonPath,
        row.endpoint,
        row.oclcField,
        row.oclcValue,
      ].map(escape).join(",")
    ),
  ].join("\n");
}
