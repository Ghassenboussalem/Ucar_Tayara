export function getSelectedInstitution() {
  try { return JSON.parse(sessionStorage.getItem('ucar_inst_filter') || 'null') } catch { return null }
}

export function setSelectedInstitution(inst) {
  if (inst) sessionStorage.setItem('ucar_inst_filter', JSON.stringify(inst))
  else sessionStorage.removeItem('ucar_inst_filter')
  window.dispatchEvent(new Event('ucar_inst_change'))
}
