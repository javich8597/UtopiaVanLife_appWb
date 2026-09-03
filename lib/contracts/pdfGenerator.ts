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
  // PÁGINA 1: CARÁTULA FORMAL Y CONDICIONES ESPECÍFICAS
  // ─────────────────────────────────────────────────────────────
  drawPageHeader(1)

  let yPos = 34

  // Main Contract Title
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11.5)
  pdf.setTextColor(...primaryColor)
  pdf.text('CONTRATO DE ARRENDAMIENTO DE VEHÍCULO VIVIENDA SIN CONDUCTOR', 105, yPos, { align: 'center' })

  yPos += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateMuted)
  pdf.text('Suscrito entre Utopia Van Life S.L. y la parte Arrendataria en Palma de Mallorca', 105, yPos, { align: 'center' })

  yPos += 7

  // Bloque 1: Arrendador (Izquierda) & Arrendatario (Derecha)
  const boxWidth = 84
  const boxHeight = 44

  // Caja Arrendador
  pdf.setFillColor(...bgSoft)
  pdf.setDrawColor(...borderLight)
  pdf.roundedRect(18, yPos, boxWidth, boxHeight, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateMuted)
  pdf.text('1. PARTE ARRENDADORA (UTOPIA)', 22, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('Razón Social:', 22, yPos + 12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.lessor.companyName, 43, yPos + 12)

  pdf.setFont('helvetica', 'normal')
  pdf.text('CIF / NIF:', 22, yPos + 17)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.lessor.cif, 43, yPos + 17)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Domicilio:', 22, yPos + 22)
  const lessorAddr = pdf.splitTextToSize(`${data.lessor.address}, ${data.lessor.city}`, 58)
  pdf.text(lessorAddr, 43, yPos + 22)

  pdf.text('Representante:', 22, yPos + 32)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.lessor.representative, 43, yPos + 32)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Contacto:', 22, yPos + 38)
  pdf.text(`${data.lessor.email} | ${data.lessor.phone}`, 43, yPos + 38)

  // Caja Arrendatario
  pdf.setFillColor(...bgSoft)
  pdf.roundedRect(108, yPos, boxWidth, boxHeight, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateMuted)
  pdf.text('2. PARTE ARRENDATARIA (CLIENTE)', 112, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('Nombre:', 112, yPos + 12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.lessee.fullName, 133, yPos + 12)

  pdf.setFont('helvetica', 'normal')
  pdf.text('DNI / Pasaporte:', 112, yPos + 17)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.lessee.dniNie, 133, yPos + 17)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Carné Conducir:', 112, yPos + 22)
  pdf.text(`${data.lessee.driverLicenseId} (${data.lessee.yearsHeld} años antig.)`, 133, yPos + 22)

  pdf.text('Domicilio:', 112, yPos + 27)
  const clientAddr = pdf.splitTextToSize(data.lessee.address, 58)
  pdf.text(clientAddr, 133, yPos + 27)

  pdf.text('Teléfono:', 112, yPos + 34)
  pdf.text(data.lessee.phone, 133, yPos + 34)

  pdf.text('Email:', 112, yPos + 39)
  pdf.text(data.lessee.email, 133, yPos + 39)

  yPos += boxHeight + 6

  // Segundo conductor si aplica
  if (data.secondDriver) {
    pdf.setFillColor(...bgSoft)
    pdf.roundedRect(18, yPos, 174, 16, 2, 2, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...slateMuted)
    pdf.text('SEGUNDO CONDUCTOR AUTORIZADO / OTROS OCUPANTES', 22, yPos + 5.5)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...slateDark)
    pdf.text(`Nombre: ${data.secondDriver.fullName}`, 22, yPos + 11)
    pdf.text(`DNI/NIE: ${data.secondDriver.dniNie}`, 90, yPos + 11)
    pdf.text(`Nº Carnet: ${data.secondDriver.driverLicenseId}`, 145, yPos + 11)

    yPos += 21
  }

  // Bloque 3: Vehículo y Fechas / Precio
  const row2H = 46

  // Vehículo
  pdf.setFillColor(...bgSoft)
  pdf.roundedRect(18, yPos, boxWidth, row2H, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateMuted)
  pdf.text('3. VEHÍCULO ARRENDADO', 22, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('Modelo:', 22, yPos + 12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.vehicle.modelName, 43, yPos + 12)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Matrícula:', 22, yPos + 17.5)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.vehicle.plateNumber, 43, yPos + 17.5)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Tipo Chasis:', 22, yPos + 23)
  pdf.text(data.vehicle.vehicleType, 43, yPos + 23)

  pdf.text('Capacidad:', 22, yPos + 28.5)
  pdf.text(data.vehicle.capacity, 43, yPos + 28.5)

  pdf.text('Sistemas:', 22, yPos + 34)
  const sysText = pdf.splitTextToSize('Litio Victron 540Ah, Placas 400W, A/A 12V Dometic, Calefacción Truma', 58)
  pdf.text(sysText, 43, yPos + 34)

  // Duración, Precio y Fianza
  pdf.setFillColor(...bgSoft)
  pdf.roundedRect(108, yPos, boxWidth, row2H, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateMuted)
  pdf.text('4. CONDICIONES DE RESERVA Y FIANZA', 112, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('Inicio alquiler:', 112, yPos + 12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${data.booking.startDate} (desde las ${data.booking.pickupTime})`, 135, yPos + 12)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Fin alquiler:', 112, yPos + 17.5)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${data.booking.endDate} (antes de las ${data.booking.dropoffTime})`, 135, yPos + 17.5)

  pdf.setFont('helvetica', 'normal')
  pdf.text('Lugar Entrega:', 112, yPos + 23)
  const locText = pdf.splitTextToSize(data.booking.pickupLocation, 56)
  pdf.text(locText, 135, yPos + 23)

  pdf.setFont('helvetica', 'bold')
  pdf.text('PRECIO TOTAL:', 112, yPos + 34)
  pdf.setTextColor(...primaryColor)
  pdf.setFontSize(9)
  pdf.text(`${data.pricing.totalPrice.toFixed(2)} € (IVA inc.)`, 140, yPos + 34)

  pdf.setFontSize(7.5)
  pdf.setTextColor(...slateDark)
  pdf.text('FIANZA OBLIGATORIA:', 112, yPos + 40)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(180, 83, 9) // Amber
  pdf.text(`${data.pricing.depositAmount.toFixed(2)} € (Tarjeta)`, 145, yPos + 40)

  yPos += row2H + 8

  // Resumen de aceptación preliminar en página 1
  pdf.setFillColor(240, 253, 244)
  pdf.setDrawColor(187, 247, 208)
  pdf.roundedRect(18, yPos, 174, 20, 2, 2, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(22, 101, 52)
  pdf.text('✓ DECLARACIÓN EXPRESA DE CONFORMIDAD Y VALIDEZ CONTRACTUAL', 22, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(21, 128, 61)
  const declText =
    'Ambas partes acuerdan formalizar el presente contrato de alquiler, declarando el arrendatario haber recibido información previa, conocer los requisitos del conductor y aceptar íntegramente las Condiciones Generales detalladas en los siguientes capítulos.'
  const declLines = pdf.splitTextToSize(declText, 166)
  pdf.text(declLines, 22, yPos + 10.5)

  // ─────────────────────────────────────────────────────────────
  // PÁGINAS 2+: ARTÍCULOS LEGALES ÍNTEGROS (1 al 17)
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
      'Utopia Van Life S.L. · CIF B24902637 · C/ Cristo de los remedios, nº2 · San Sebastián de los Reyes · administracion@utopiavanlife.com',
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
