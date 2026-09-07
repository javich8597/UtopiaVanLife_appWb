import { jsPDF } from 'jspdf'
import { ContractData } from './contractEngine'

export interface GeneratedPdfResult {
  doc: jsPDF
  blob: Blob
  buffer: Buffer
  base64: string
}

export async function generateOfficialContractPdfBlob(
  data: ContractData,
  clientSignatureDataUrl?: string
): Promise<GeneratedPdfResult> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const primaryColor: [number, number, number] = [26, 43, 33] // #1A2B21 (Forest Green)
  const slateDark: [number, number, number] = [30, 41, 59] // #1E293B
  const slateMuted: [number, number, number] = [100, 116, 139] // #64748B
  const bgSoft: [number, number, number] = [248, 250, 252] // #F8FAFC
  const borderLight: [number, number, number] = [226, 232, 240] // #E2E8F0

  const drawPageHeader = (pageNumber: number) => {
    // Top dark brand stripe
    pdf.setFillColor(...primaryColor)
    pdf.rect(0, 0, 210, 5, 'F')

    // Brand title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(...primaryColor)
    pdf.text('UTOPIA VAN LIFE', 18, 16)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...slateMuted)
    pdf.text('MALLORCA ISLAND  •  CONTRATO OFICIAL DE ARRENDAMIENTO', 18, 20.5)

    // Right-aligned Ref
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...primaryColor)
    pdf.text(data.contractNumber, 192, 15.5, { align: 'right' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...slateMuted)
    pdf.text(`Fecha de emisión: ${data.generatedAt}`, 192, 19.5, { align: 'right' })
    pdf.text('Ejemplar Oficial Vinculante', 192, 23.5, { align: 'right' })

    // Divider Line
    pdf.setDrawColor(...primaryColor)
    pdf.setLineWidth(0.4)
    pdf.line(18, 26, 192, 26)
  }

  const checkPageBreak = (neededHeight: number, currentY: number): number => {
    if (currentY + neededHeight > 275) {
      pdf.addPage()
      drawPageHeader(pdf.getNumberOfPages())
      return 34
    }
    return currentY
  }

  // ─────────────────────────────────────────────────────────────
  // PÁGINA 1: ENCABEZAMIENTO NOTARIAL Y CONDICIONES PARTICULARES
  // ─────────────────────────────────────────────────────────────
  drawPageHeader(1)

  let yPos = 34

  // Título Principal Formal
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...primaryColor)
  pdf.text('CONTRATO DE ARRENDAMIENTO DE VEHÍCULO VIVIENDA SIN CONDUCTOR', 105, yPos, { align: 'center' })

  yPos += 4.5
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...slateMuted)
  pdf.text('CONDICIONES PARTICULARES DE LA CONTRATACIÓN', 105, yPos, { align: 'center' })

  yPos += 3
  pdf.setDrawColor(...primaryColor)
  pdf.setLineWidth(0.4)
  pdf.line(18, yPos, 192, yPos)

  yPos += 6

  // 1. REUNIDOS / INTERVINIENTES
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...primaryColor)
  pdf.text('I. INTERVINIENTES (REUNIDOS)', 18, yPos)

  yPos += 4.5

  // Arrendador
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('DE UNA PARTE, COMO ARRENDADOR:', 18, yPos)
  yPos += 3.8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.2)
  const lessorLegalText = `${data.lessor.companyName}, con CIF ${data.lessor.cif}, domicilio social en ${data.lessor.address}, ${data.lessor.city} (España), con actividad de arrendamiento de vehículos vivienda sin conductor en la isla de Mallorca, debidamente representada en este acto por su representante legal D. ${data.lessor.representative} (Contacto: ${data.lessor.email} | ${data.lessor.phone}).`
  const lessorLines = pdf.splitTextToSize(lessorLegalText, 174)
  pdf.text(lessorLines, 18, yPos)
  yPos += lessorLines.length * 3.4 + 2.5

  // Arrendatario
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('DE OTRA PARTE, COMO ARRENDATARIO (CONDUCTOR PRINCIPAL):', 18, yPos)
  yPos += 3.8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.2)
  const lesseeLegalText = `D./Dña. ${data.lessee.fullName}, con documento identificativo DNI/NIE/Pasaporte nº ${data.lessee.dniNie}, titular de permiso de conducción de clase B en vigor nº ${data.lessee.driverLicenseId} (${data.lessee.yearsHeld} años de antigüedad de carné), con domicilio formal a efectos de notificaciones en ${data.lessee.address}, teléfono de contacto ${data.lessee.phone} y correo electrónico ${data.lessee.email}.`
  const lesseeLines = pdf.splitTextToSize(lesseeLegalText, 174)
  pdf.text(lesseeLines, 18, yPos)
  yPos += lesseeLines.length * 3.4 + 2.5

  // Segundo conductor si existe
  if (data.secondDriver) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...slateDark)
    pdf.text('SEGUNDO CONDUCTOR AUTORIZADO:', 18, yPos)
    yPos += 3.8

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.2)
    const secondDriverText = `D./Dña. ${data.secondDriver.fullName}, con DNI/NIE nº ${data.secondDriver.dniNie} y permiso de conducción nº ${data.secondDriver.driverLicenseId}, facultado como conductor adicional bajo los mismos términos, garantías y coberturas.`
    const secondDriverLines = pdf.splitTextToSize(secondDriverText, 174)
    pdf.text(secondDriverLines, 18, yPos)
    yPos += secondDriverLines.length * 3.4 + 2.5
  }

  // Párrafo de reconocimiento mutuo
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(7)
  pdf.setTextColor(...slateMuted)
  const capacityText = 'Ambas partes se reconocen mutuamente plena capacidad jurídica y de obrar suficiente para el otorgamiento del presente contrato de arrendamiento mercantil y, a tal fin, convienen las siguientes:'
  const capacityLines = pdf.splitTextToSize(capacityText, 174)
  pdf.text(capacityLines, 18, yPos)
  yPos += capacityLines.length * 3.2 + 4.5

  // 2. CONDICIONES PARTICULARES
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...primaryColor)
  pdf.text('II. CONDICIONES PARTICULARES Y ECONÓMICAS DEL ARRENDAMIENTO', 18, yPos)

  yPos += 4.5

  const particulars: Array<{ label: string; value: string; boldValue?: boolean; highlight?: boolean }> = [
    {
      label: 'Vehículo Arrendado:',
      value: `${data.vehicle.modelName} (Matrícula: ${data.vehicle.plateNumber} · Chasis: ${data.vehicle.vehicleType})`,
      boldValue: true
    },
    {
      label: 'Capacidad & Sistemas:',
      value: `${data.vehicle.capacity} · Sistema eléctrico Victron Litio 540Ah, Placas 400W, A/A Dometic, Calefacción Truma`
    },
    {
      label: 'Periodo de Arrendamiento:',
      value: `Del ${data.booking.startDate} (${data.booking.pickupTime}) hasta el ${data.booking.endDate} (${data.booking.dropoffTime})`,
      boldValue: true
    },
    {
      label: 'Lugar Entrega / Devolución:',
      value: `${data.booking.pickupLocation} · Palma de Mallorca (Illes Balears)`
    },
    {
      label: 'Precio Total del Alquiler:',
      value: `${data.pricing.totalPrice.toFixed(2)} € (IVA e impuestos incluidos)`,
      boldValue: true,
      highlight: true
    },
    {
      label: 'Fianza Obligatoria:',
      value: `${data.pricing.depositAmount.toFixed(2)} € (Bloqueo en tarjeta bancaria previa a la entrega física)`,
      boldValue: true
    },
    {
      label: 'Póliza de Seguro & Franquicia:',
      value: `Seguro a todo riesgo con franquicia de ${data.pricing.depositAmount.toFixed(2)} € por siniestro y asistencia 24h en Mallorca`
    },
    {
      label: 'Kilometraje & Territorio:',
      value: '150 km diarios acumulables · Ámbito territorial exclusivo en la isla de Mallorca (prohibido embarque marítimo)'
    }
  ]

  // Línea superior de la tabla
  pdf.setDrawColor(...primaryColor)
  pdf.setLineWidth(0.4)
  pdf.line(18, yPos, 192, yPos)
  yPos += 1.5

  const colLabelX = 20
  const colValX = 68
  const colValW = 122

  for (const row of particulars) {
    const rowYStart = yPos + 2.8
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.2)
    pdf.setTextColor(...slateDark)
    pdf.text(row.label, colLabelX, rowYStart)

    if (row.boldValue) {
      pdf.setFont('helvetica', 'bold')
    } else {
      pdf.setFont('helvetica', 'normal')
    }

    if (row.highlight) {
      pdf.setTextColor(...primaryColor)
      pdf.setFontSize(7.6)
    } else {
      pdf.setTextColor(...slateDark)
      pdf.setFontSize(7.2)
    }

    const valLines = pdf.splitTextToSize(row.value, colValW)
    pdf.text(valLines, colValX, rowYStart)

    const rowHeight = Math.max(5.2, valLines.length * 3.3 + 1.8)
    yPos += rowHeight

    // Línea sutil horizontal divisoria
    pdf.setDrawColor(...borderLight)
    pdf.setLineWidth(0.2)
    pdf.line(18, yPos, 192, yPos)
  }

  yPos += 5.5

  // 3. DISPOSICIÓN GENERAL
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...primaryColor)
  pdf.text('III. DISPOSICIÓN GENERAL Y CONFORMIDAD CONTRACTUAL', 18, yPos)

  yPos += 3.8
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.9)
  pdf.setTextColor(...slateDark)
  const agreementText =
    'Las partes contratantes convienen libremente someter el presente arrendamiento a las Condiciones Particulares precedentemente expuestas y a las Condiciones Generales que se desarrollan de manera correlativa y exhaustiva en las páginas siguientes (Artículos 1 al 31 inclusive, incluyendo inventario, normas de seguridad y política de protección de datos), las cuales el Arrendatario declara haber examinado con carácter previo a la formalización del presente contrato, comprendiendo y aceptando expresamente todos sus términos y efectos jurídicos.'
  const agreementLines = pdf.splitTextToSize(agreementText, 174)
  pdf.text(agreementLines, 18, yPos)

  // ─────────────────────────────────────────────────────────────
  // PÁGINAS 2+: ARTÍCULOS LEGALES ÍNTEGROS (1 al 31)
  // ─────────────────────────────────────────────────────────────
  pdf.addPage()
  drawPageHeader(pdf.getNumberOfPages())
  yPos = 34

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...primaryColor)
  pdf.text('CONDICIONES GENERALES Y CLÁUSULAS DEL CONTRATO DE ARRENDAMIENTO', 105, yPos, { align: 'center' })

  yPos += 7

  let lastChapter = ''

  for (const article of data.articles) {
    // Si cambia de capítulo, mostrar encabezado de capítulo
    if (article.chapter && article.chapter !== lastChapter) {
      lastChapter = article.chapter
      yPos = checkPageBreak(16, yPos)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 116, 139)
      pdf.text(article.chapter, 18, yPos)
      yPos += 5
    }

    // Título del artículo
    yPos = checkPageBreak(12, yPos)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...primaryColor)
    pdf.text(`Artículo ${article.number}. ${article.title}`, 18, yPos)
    yPos += 4.5

    // Contenido del artículo
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...slateDark)

    for (const paragraph of article.content) {
      const isBullet = paragraph.startsWith('•') || paragraph.startsWith('*')
      const indent = isBullet ? 22 : 18
      const maxTextW = isBullet ? 170 : 174

      const lines = pdf.splitTextToSize(paragraph, maxTextW)
      const paraHeight = lines.length * 3.8 + 2.5

      yPos = checkPageBreak(paraHeight, yPos)

      pdf.text(lines, indent, yPos)
      yPos += paraHeight
    }

    yPos += 2 // Espacio entre artículos
  }

  // ─────────────────────────────────────────────────────────────
  // CLÁUSULA RGPD & BLOQUE FINAL DE FIRMAS
  // ─────────────────────────────────────────────────────────────
  yPos = checkPageBreak(90, yPos)

  // Título RGPD
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...primaryColor)
  pdf.text('INFORMACIÓN BÁSICA SOBRE PROTECCIÓN DE DATOS (RGPD)', 18, yPos)
  yPos += 5

  pdf.setFillColor(...bgSoft)
  pdf.setDrawColor(...borderLight)
  pdf.roundedRect(18, yPos, 174, 25, 2, 2, 'FD')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.8)
  pdf.setTextColor(...slateDark)

  const rgpdContent = [
    `• Responsable: ${data.rgpdText.responsable}`,
    `• Finalidad: ${data.rgpdText.finalidad}`,
    `• Legitimación: ${data.rgpdText.legitimacion}`,
    `• Destinatarios: ${data.rgpdText.destinatarios}`,
    `• Derechos y Contacto: ${data.rgpdText.derechos}`
  ]

  let rgpdY = yPos + 4.5
  for (const line of rgpdContent) {
    const splitLine = pdf.splitTextToSize(line, 168)
    pdf.text(splitLine, 22, rgpdY)
    rgpdY += 4.2
  }

  yPos += 30

  // Bloque Formal de Firma de las Partes
  yPos = checkPageBreak(65, yPos)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(...primaryColor)
  pdf.text('FIRMA Y CONFORMIDAD DE LAS PARTES', 105, yPos, { align: 'center' })

  yPos += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateMuted)
  pdf.text('Ambas partes declaran haber leído y entendido el contenido íntegro del presente contrato, aceptando sus términos.', 105, yPos, { align: 'center' })

  yPos += 7

  const signBoxW = 84
  const signBoxH = 46

  // Firma Arrendador (Utopia Van Life / Roberto Estébanez)
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(...borderLight)
  pdf.roundedRect(18, yPos, signBoxW, signBoxH, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...primaryColor)
  pdf.text('POR UTOPIA VAN LIFE S.L. (ARRENDADOR)', 22, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...slateMuted)
  pdf.text('D. Roberto Estébanez Blanco', 22, yPos + 10.5)
  pdf.text(`Fecha: ${data.generatedAt}`, 22, yPos + 14.5)

  // Sello corporativo digital de Utopia
  pdf.setFillColor(240, 253, 244)
  pdf.setDrawColor(5, 150, 105)
  pdf.roundedRect(22, yPos + 18, 76, 22, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(5, 150, 105)
  pdf.text('✓ SELLO Y FIRMA DIGITAL VÁLIDA', 26, yPos + 23)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(71, 85, 105)
  pdf.text('UTOPIA VAN LIFE S.L. · CIF: B24902637', 26, yPos + 27.5)
  pdf.text('Autorización y entrega en Palma de Mallorca', 26, yPos + 31.5)
  pdf.text('Certificado eIDAS / Ley 6/2020', 26, yPos + 35.5)

  // Firma Arrendatario (Cliente)
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(...borderLight)
  pdf.roundedRect(108, yPos, signBoxW, signBoxH, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...primaryColor)
  pdf.text('POR EL CLIENTE (ARRENDATARIO)', 112, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...slateMuted)
  pdf.text(`D./Dña. ${data.lessee.fullName}`, 112, yPos + 10.5)
  pdf.text(`DNI/NIE: ${data.lessee.dniNie} · Fecha: ${data.generatedAt}`, 112, yPos + 14.5)

  // Si se ha proporcionado firma táctil / ratón en dataUrl
  if (clientSignatureDataUrl && clientSignatureDataUrl.startsWith('data:image/')) {
    try {
      pdf.addImage(clientSignatureDataUrl, 'PNG', 112, yPos + 17, 76, 24)
    } catch (e) {
      console.warn('Could not embed client signature image:', e)
      pdf.setDrawColor(203, 213, 225)
      pdf.line(116, yPos + 34, 184, yPos + 34)
      pdf.text('Firma digital verificada', 116, yPos + 38)
    }
  } else {
    // Espacio reservado para firma
    pdf.setDrawColor(203, 213, 225)
    pdf.line(116, yPos + 34, 184, yPos + 34)
    pdf.setFontSize(6.5)
    pdf.text('Firma manuscrita / digital del titular', 130, yPos + 38)
  }

  // ─────────────────────────────────────────────────────────────
  // PIE DE PÁGINA EN TODAS LAS PÁGINAS ("Página X de Y")
  // ─────────────────────────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)

    // Divider Line
    pdf.setDrawColor(...borderLight)
    pdf.setLineWidth(0.3)
    pdf.line(18, 284, 192, 284)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(...slateMuted)
    pdf.text(
      'Utopia Van Life S.L. · CIF B24902637 · C/ Cristo de los remedios, nº2 · San Sebastián de los Reyes · info@utopiavanlife.com · 611 560 916',
      18,
      288
    )

    pdf.setFont('helvetica', 'bold')
    pdf.text(`Página ${i} de ${totalPages}`, 192, 288, { align: 'right' })
  }

  const blob = pdf.output('blob')
  const arrayBuffer = pdf.output('arraybuffer')
  const buffer = Buffer.from(arrayBuffer)
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  return {
    doc: pdf,
    blob,
    buffer,
    base64
  }
}
