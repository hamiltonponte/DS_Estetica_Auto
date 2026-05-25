import * as XLSX from 'xlsx';
import { EXCEL_SHEETS } from './constants';
import { readCollection, writeExcelFile } from './fileSystem';

function flattenRow(obj) {
  const row = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) row[key] = '';
    else if (typeof value === 'object') row[key] = JSON.stringify(value);
    else row[key] = value;
  }
  return row;
}

function buildFinancialRows(appointments) {
  return appointments
    .filter((a) => a.status === 'concluido' || a.payment_status)
    .map((a) => ({
      id: a.id,
      data: a.date,
      cliente: a.client_name,
      veiculo: a.vehicle_info,
      servicos: a.service_names,
      valor_total: a.total_price,
      status_pagamento: a.payment_status,
      forma_pagamento: a.payment_method,
      status_servico: a.status,
      observacoes: a.notes,
    }));
}

function sheetFromRows(rows, sheetName) {
  const ws = rows.length
    ? XLSX.utils.json_to_sheet(rows.map(flattenRow))
    : XLSX.utils.aoa_to_sheet([[`Nenhum registro em ${sheetName}`]]);
  return ws;
}

export async function syncWorkbook(rootHandle) {
  const wb = XLSX.utils.book_new();

  for (const sheet of EXCEL_SHEETS) {
    let rows = [];
    if (sheet.type === 'financial') {
      const appointments = await readCollection(rootHandle, 'Appointment');
      rows = buildFinancialRows(appointments);
    } else {
      const items = await readCollection(rootHandle, sheet.collection);
      rows = items.map(flattenRow);
    }
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows, sheet.name), sheet.name);
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await writeExcelFile(rootHandle, buffer);
  return buffer;
}

export function downloadWorkbook(buffer, filename = 'ds-estetica-dados.xlsx') {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
