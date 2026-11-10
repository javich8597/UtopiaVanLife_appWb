import type { ContractData } from '../contracts/contractEngine'
import { secondDriverSupplementText } from '../contracts/pdfGenerator'

// La frase del suplemento es la del PDF del cliente: una sola función, no una copia que se desincronice
export { secondDriverSupplementText }

/**
 * Contrato imprimible del backoffice (`/api/admin/contract`).
 *
 * Tiene que decir lo mismo que el PDF que ve el cliente (`lib/contracts/pdfGenerator.ts`), incluido el
 * bloque del segundo conductor y el texto de su suplemento. Todo valor que llega de la reserva o del
 * cliente (nombres, direcciones, notas) se escapa: el HTML se abre en la sesión del administrador.
 */

export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function renderContractHtml(contract: ContractData): string {
    const e = escapeHtml
    const sd = contract.secondDriver

    const secondDriverBlock = sd
        ? `
  <div class="card second-driver">
    <div class="card-title">Segundo conductor autorizado</div>
    <div class="field"><strong>Nombre:</strong> ${e(sd.fullName)}</div>
    <div class="field"><strong>DNI / NIE:</strong> ${e(sd.dniNie)}</div>
    <div class="field"><strong>Nº Carnet:</strong> ${e(sd.driverLicenseId)}</div>
    <div class="field">Facultado como conductor adicional bajo los mismos términos, garantías y coberturas. ${e(secondDriverSupplementText(sd))}</div>
  </div>
`
        : ''

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Alquiler · ${e(contract.contractNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: auto; line-height: 1.5; font-size: 14px; }
    .header { border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { font-size: 22px; font-weight: 800; color: #16a34a; letter-spacing: -0.5px; }
    .contract-tag { font-size: 13px; font-weight: 700; color: #4b5563; background: #f3f4f6; padding: 4px 10px; border-radius: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .second-driver { margin-bottom: 24px; }
    .card-title { font-weight: 700; font-size: 13px; text-transform: uppercase; color: #16a34a; margin-bottom: 8px; }
    .field { margin-bottom: 4px; }
    .field strong { color: #374151; font-size: 12px; }
    .clauses { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px; color: #4b5563; }
    .clauses ol { padding-left: 20px; margin: 0; }
    .clauses li { margin-bottom: 8px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; }
    .sig-box { border-top: 1px dashed #9ca3af; padding-top: 10px; font-size: 12px; color: #6b7280; }
    @media print {
      body { padding: 0; font-size: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Imprimir / Guardar PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="logo">UTOPIA VAN LIFE</div>
      <div style="font-size: 12px; color: #6b7280;">Alquiler de Campers Premium en Mallorca</div>
    </div>
    <div style="text-align: right;">
      <div class="contract-tag">${e(contract.contractNumber)}</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Fecha: ${e(contract.generatedAt)}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Arrendador (Empresa)</div>
      <div class="field"><strong>Empresa:</strong> ${e(contract.lessor.companyName)}</div>
      <div class="field"><strong>CIF:</strong> ${e(contract.lessor.cif)}</div>
      <div class="field"><strong>Dirección:</strong> ${e(contract.lessor.address)}</div>
      <div class="field"><strong>Email:</strong> ${e(contract.lessor.email)}</div>
      <div class="field"><strong>Teléfono:</strong> ${e(contract.lessor.phone)}</div>
    </div>

    <div class="card">
      <div class="card-title">Arrendatario (Cliente)</div>
      <div class="field"><strong>Nombre:</strong> ${e(contract.lessee.fullName)}</div>
      <div class="field"><strong>DNI / NIE:</strong> ${e(contract.lessee.dniNie)}</div>
      <div class="field"><strong>Nº Carnet:</strong> ${e(contract.lessee.driverLicenseId)}</div>
      <div class="field"><strong>Email:</strong> ${e(contract.lessee.email)}</div>
      <div class="field"><strong>Teléfono:</strong> ${e(contract.lessee.phone)}</div>
    </div>
  </div>
${secondDriverBlock}
  <div class="grid">
    <div class="card">
      <div class="card-title">Vehículo Asignado</div>
      <div class="field"><strong>Modelo:</strong> ${e(contract.vehicle.modelName)}</div>
      <div class="field"><strong>Tipo:</strong> ${e(contract.vehicle.vehicleType)}</div>
      <div class="field"><strong>Capacidad:</strong> ${e(contract.vehicle.capacity)}</div>
      <div class="field"><strong>Matrícula:</strong> ${e(contract.vehicle.plateNumber)}</div>
    </div>

    <div class="card">
      <div class="card-title">Periodo y Tarifas</div>
      <div class="field"><strong>Recogida:</strong> ${e(contract.booking.startDate)} a las ${e(contract.booking.pickupTime)}h</div>
      <div class="field"><strong>Devolución:</strong> ${e(contract.booking.endDate)} a las ${e(contract.booking.dropoffTime)}h</div>
      <div class="field"><strong>Lugar:</strong> ${e(contract.booking.pickupLocation)}</div>
      <div class="field" style="margin-top: 8px;"><strong>Total Alquiler:</strong> <span style="color: #16a34a; font-weight: 700; font-size: 15px;">${e(contract.pricing.totalPrice)} €</span></div>
      <div class="field"><strong>Fianza Obligatoria:</strong> ${e(contract.pricing.depositAmount)} €</div>
    </div>
  </div>

  <div class="clauses">
    <div class="card-title" style="margin-bottom: 10px;">Cláusulas del Contrato de Alquiler</div>
    <ol>
      ${contract.clauses.map(c => `<li>${e(c)}</li>`).join('')}
    </ol>
  </div>

  <div class="signatures">
    <div class="sig-box">
      Firma del Arrendador<br>
      <strong>Utopia Van Life S.L.</strong>
    </div>
    <div class="sig-box">
      Firma del Arrendatario (Conductor)<br>
      <strong>${e(contract.lessee.fullName)}</strong>
    </div>
  </div>
</body>
</html>`
}
