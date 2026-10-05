/**
 * Convierte la selección de FullCalendar en un rango de días 'YYYY-MM-DD' (ambos incluidos).
 *
 * FullCalendar da el final como exclusivo (el día siguiente al último seleccionado) en las
 * vistas de día completo. Antes se restaba un día a un Date local y se pasaba a ISO (UTC),
 * lo que en España (UTC+1/+2) retrocedía otro día más: el bloqueo se guardaba un día corto
 * y seleccionar un solo día fallaba con "la fecha final es anterior a la inicial".
 * Aquí se trabaja solo con las cadenas de fecha, sin zonas horarias.
 */
export function selectionToDayRange(startStr: string, endStr: string, allDay: boolean): { start: string; end: string } {
  const start = startStr.slice(0, 10)
  let end = endStr.slice(0, 10)

  if (allDay) {
    const [y, m, d] = end.split('-').map(Number)
    const prev = new Date(Date.UTC(y, m - 1, d - 1))
    end = prev.toISOString().slice(0, 10)
  }

  return { start, end: end < start ? start : end }
}
