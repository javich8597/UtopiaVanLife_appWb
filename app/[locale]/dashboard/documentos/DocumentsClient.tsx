'use client'

import React, { useState, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import {
  FileText,
  Download,
  Eye,
  Calendar,
  ShieldCheck,
  Receipt,
  UserCheck,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Archive,
  Printer,
  X,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Truck,
  Sparkles,
  Search,
  PenTool,
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import { generateContractData, detectCamperModelSpecs } from '@/lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '@/lib/contracts/pdfGenerator'
import ContractSignModal from './ContractSignModal'

interface Props {
  bookings: any[]
  profile: any
  user: any
  contractTemplate?: any
}

export interface DocumentItem {
  id: string
  title: string
  category: 'contract' | 'invoice' | 'insurance' | 'verification' | 'checkin' | 'past'
  typeLabel: string
  refNumber: string
  date: string
  isoDate: string
  status: 'valid' | 'paid' | 'verified' | 'archived' | 'pending'
  statusLabel: string
  fileFormat: string
  isPast: boolean
  tripName: string
  bookingId?: string
  amount?: number
  summary: string
  contentDetails: {
    issuer: string
    cif: string
    clientName: string
    clientDni: string
    clientEmail: string
    clientPhone?: string
    camperName: string
    camperPlate?: string
    datesRange?: string
    pickupLocation?: string
    dropoffLocation?: string
    items?: { label: string; value: string; price?: number }[]
    legalClause?: string
    policyNumber?: string
    coverageDetails?: string[]
  }
}

export default function DocumentsClient({ bookings, profile, user, contractTemplate }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'current' | 'invoices' | 'past'>('all')
  const [activePreviewDoc, setActivePreviewDoc] = useState<DocumentItem | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['ctr-main']))
  const [searchQuery, setSearchQuery] = useState('')
  const [signingBooking, setSigningBooking] = useState<any | null>(null)
  const [signedContractsState, setSignedContractsState] = useState<Record<string, { signedAt: string; pdfUrl: string }>>({})

  const activeBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'active') || []
  const pastBookings = bookings?.filter(b => b.status === 'completed' || b.status === 'cancelled') || []
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || []

  const hasBookings = Boolean(bookings && bookings.length > 0)
  const nextBooking = activeBookings[0] || pendingBookings[0] || (bookings && bookings[0]) || null

  const safeProfile = useMemo(() => ({
    ...profile,
    full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Viajero',
    dni_nie: profile?.dni_nie || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    driver_license_id: profile?.driver_license_id || '',
    driver_license_issue_date: profile?.driver_license_issue_date || '',
    driver_license_expiry_date: profile?.driver_license_expiry_date || '',
    verification_status: profile?.verification_status || 'pending'
  }), [profile, user])

  const clientName = safeProfile.full_name
  const clientDni = safeProfile.dni_nie
  const clientEmail = user?.email || ''
  const clientPhone = safeProfile.phone
  const isVerified = safeProfile.verification_status === 'verified'

  // Bloquear scroll del body al abrir el visor de documentos
  React.useEffect(() => {
    if (activePreviewDoc) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [activePreviewDoc])

  // Toggle expandable accordion row
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Expand all / Collapse all
  const toggleAll = (expand: boolean) => {
    if (expand) {
      setExpandedIds(new Set(documents.map(d => d.id)))
    } else {
      setExpandedIds(new Set())
    }
  }

  // Build the complete list of documents
  const documents: DocumentItem[] = useMemo(() => {
    const list: DocumentItem[] = []

    // 1. Current / Upcoming Booking Documents
    if (nextBooking) {
      const bId = nextBooking.id.substring(0, 8).toUpperCase()
      const contractData = generateContractData(nextBooking, safeProfile, undefined, contractTemplate)
      const camperName = contractData.vehicle.modelName
      const fromDate = new Date(nextBooking.start_date)
      const toDate = new Date(nextBooking.end_date)
      const dateFormatted = fromDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      const rangeFormatted = `${fromDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${toDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`
      const creationDate = new Date(nextBooking.created_at || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      const priceTotal = nextBooking.total_price || 1155

      const isContractSigned = Boolean(
        signedContractsState[nextBooking.id] || nextBooking.contract_signed_at
      )
      const signedDate = signedContractsState[nextBooking.id]?.signedAt || nextBooking.contract_signed_at
      const formattedSignedDate = signedDate
        ? new Date(signedDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
        : null

      // Contract
      list.push({
        id: 'ctr-main',
        title: `Contrato Oficial de Alquiler · ${contractData.vehicle.modelName}`,
        category: 'contract',
        typeLabel: 'Contrato Oficial',
        refNumber: contractData.contractNumber,
        date: formattedSignedDate ? `Firmado el ${formattedSignedDate}` : creationDate,
        isoDate: signedDate || nextBooking.created_at || '2026-08-24',
        status: isContractSigned ? 'valid' : 'pending',
        statusLabel: isContractSigned ? '✓ Contrato Oficial Firmado' : 'Pendiente de Firma Digital',
        fileFormat: isContractSigned ? 'PDF Oficial Firmado' : 'Borrador Oficial',
        isPast: false,
        tripName: `Reserva · ${contractData.vehicle.modelName}`,
        bookingId: nextBooking.id,
        summary: isContractSigned
          ? `Contrato de arrendamiento formalizado y firmado digitalmente para ${contractData.vehicle.vehicleType} (${contractData.vehicle.plateNumber}). Custodiado con validez legal eIDAS.`
          : `Contrato oficial de arrendamiento sin conductor para ${contractData.vehicle.vehicleType}, fianza estándar de 1.000€, kilometraje de 150 km/día y normativa de uso en Mallorca. Pendiente de firma digital del titular.`,
        contentDetails: {
          issuer: contractData.lessor.companyName,
          cif: contractData.lessor.cif,
          clientName: contractData.lessee.fullName,
          clientDni: contractData.lessee.dniNie,
          clientEmail: contractData.lessee.email,
          clientPhone: contractData.lessee.phone,
          camperName: `${contractData.vehicle.modelName} (${contractData.vehicle.vehicleType})`,
          camperPlate: contractData.vehicle.plateNumber,
          datesRange: rangeFormatted,
          pickupLocation: contractData.booking.pickupLocation,
          dropoffLocation: contractData.booking.dropoffLocation,
          items: [
            { label: 'Vehículo Arrendado', value: `${contractData.vehicle.modelName} · ${contractData.vehicle.capacity}` },
            { label: 'Periodo de Arrendamiento', value: `${rangeFormatted} (${contractData.booking.pickupTime}h a ${contractData.booking.dropoffTime}h)` },
            { label: 'Fianza de Seguridad', value: `${formatPrice(contractData.pricing.depositAmount)} (Depósito bloqueado)` },
            { label: 'Kilometraje Autorizado', value: '150 km/día acumulables en la isla de Mallorca' },
            { label: 'Conductor Titular', value: `${contractData.lessee.fullName} (DNI: ${contractData.lessee.dniNie} | Carnet: ${contractData.lessee.driverLicenseId})` },
          ],
          legalClause: contractData.clauses.join('\n\n')
        }
      })

      // Invoice
      list.push({
        id: `fac-${nextBooking.id}`,
        title: 'Factura Oficial de Alquiler & Servicios',
        category: 'invoice',
        typeLabel: 'Factura Oficial',
        refNumber: `FAC-2026-${bId}`,
        date: creationDate,
        isoDate: nextBooking.created_at || '2026-08-24',
        status: 'paid',
        statusLabel: 'Pagada',
        fileFormat: 'PDF (940 KB)',
        isPast: false,
        tripName: `Reserva Actual · Camper ${camperName}`,
        bookingId: nextBooking.id,
        amount: priceTotal,
        summary: `Factura con desglose de IVA (21%) por importe de ${formatPrice(priceTotal)}, abonada con éxito mediante pasarela segura Redsys.`,
        contentDetails: {
          issuer: 'Utopia Van Life S.L.',
          cif: 'B-57984210',
          clientName,
          clientDni,
          clientEmail,
          camperName: `Camper ${camperName}`,
          datesRange: rangeFormatted,
          items: [
            { label: `Alquiler Camper ${camperName} (${rangeFormatted})`, value: 'Base Imponible', price: Math.round(priceTotal / 1.21) },
            { label: 'Kit de Ropa de Cama & Toallas Premium', value: 'Incluido de serie', price: 0 },
            { label: 'Set de Cocina & Cafetera Italiana', value: 'Incluido de serie', price: 0 },
            ...(Array.isArray(nextBooking.extras_selected) && nextBooking.extras_selected.length > 0
              ? nextBooking.extras_selected.map((ex: any) => ({
                  label: `${ex.name_es || ex.name || 'Extra'}${ex.quantity ? ` (x${ex.quantity})` : ''}`,
                  value: 'Servicio Contratado',
                  price: Number(ex.price || 0) * Number(ex.quantity || 1),
                }))
              : []),
            { label: 'IVA General (21%)', value: '21% I.V.A.', price: priceTotal - Math.round(priceTotal / 1.21) },
            { label: 'Importe Total Liquidado', value: 'Tarjeta / Bizum • Redsys', price: priceTotal },
          ]
        }
      })

      // Insurance
      list.push({
        id: `pol-${nextBooking.id}`,
        title: 'Certificado de Cobertura Allianz & Asistencia 24h',
        category: 'insurance',
        typeLabel: 'Póliza de Seguro',
        refNumber: `POL-ALLIANZ-UTO-9821`,
        date: dateFormatted,
        isoDate: nextBooking.start_date || '2026-08-24',
        status: 'valid',
        statusLabel: 'Cobertura Activa',
        fileFormat: 'PDF (1.1 MB)',
        isPast: false,
        tripName: `Reserva Actual · Camper ${camperName}`,
        bookingId: nextBooking.id,
        summary: 'Seguro a todo riesgo con franquicia de 1.000€, asistencia en carretera 24/7 en cualquier punto de Mallorca y vehículo de sustitución.',
        contentDetails: {
          issuer: 'Allianz Seguros / Utopia Van Life',
          cif: 'W-0045819-A',
          clientName,
          clientDni,
          clientEmail,
          camperName: `Camper ${camperName}`,
          camperPlate: '7482-LMB',
          policyNumber: 'POL-ALLIANZ-UTO-9821-ESP',
          datesRange: rangeFormatted,
          coverageDetails: [
            'Responsabilidad Civil Obligatoria y Voluntaria hasta 50.000.000 €',
            'Daños propios al vehículo a todo riesgo con franquicia de 1.000 €',
            'Asistencia en viaje y grúa rescate 24 horas en toda la isla de Mallorca',
            'Rotura de lunas, daños por fenómenos atmosféricos y robo de accesorios fijos',
            'Teléfono de Emergencia Exclusivo 24/7: +34 900 100 244 (Ref: Utopia)'
          ]
        }
      })

      // Check-in Sheet
      list.push({
        id: `chk-${nextBooking.id}`,
        title: 'Acta Digital de Entrega & Check-in de la Camper',
        category: 'checkin',
        typeLabel: 'Parte de Entrega',
        refNumber: `CHK-2026-${bId}`,
        date: dateFormatted,
        isoDate: nextBooking.start_date || '2026-08-24',
        status: 'valid',
        statusLabel: 'Listo para Entrega',
        fileFormat: 'PDF (1.8 MB)',
        isPast: false,
        tripName: `Reserva Actual · Camper ${camperName}`,
        bookingId: nextBooking.id,
        summary: 'Inspección técnica previa, depósito diésel al 100%, depósito de agua 113L lleno y baterías Victron al 100%.',
        contentDetails: {
          issuer: 'Utopia Van Life S.L. • Taller & Flota',
          cif: 'B-57984210',
          clientName,
          clientDni,
          clientEmail,
          camperName: `Camper ${camperName}`,
          camperPlate: '7482-LMB',
          items: [
            { label: 'Depósito Diésel', value: '100% Lleno (Devolver lleno)' },
            { label: 'Depósito Agua Limpia', value: '113 Litros (100% Lleno)' },
            { label: 'Batería Litio Victron', value: '540Ah al 100% de carga' },
            { label: 'Equipamiento Exterior', value: '2 Sillas camper + Mesa aluminio + Toldo Fiamma' },
            { label: 'Limpieza y Desinfección', value: 'Realizada con protocolo de ozono' },
          ]
        }
      })
    }

    // 2. Identity & Driver's License Document
    list.push({
      id: 'doc-identity-verification',
      title: 'Acreditación de Conductor & Permiso de Conducir B',
      category: 'verification',
      typeLabel: 'Identidad & Carnet',
      refNumber: `ID-VER-${user.id.substring(0, 6).toUpperCase()}`,
      date: isVerified ? '15 de Mayo, 2026' : 'Pendiente de validación',
      isoDate: '2026-05-15',
      status: isVerified ? 'verified' : 'pending',
      statusLabel: isVerified ? 'Verificado ✓' : 'En Revisión',
      fileFormat: 'PDF / JPG (1.5 MB)',
      isPast: false,
      tripName: 'Documentación del Conductor',
      summary: isVerified
        ? 'DNI/Pasaporte y Permiso de Conducir clase B verificados y validados por el equipo de Utopia Van Life.'
        : 'Documentos en proceso de verificación por nuestro equipo de soporte.',
      contentDetails: {
        issuer: 'Utopia Van Life • Validación de Conductores',
        cif: 'B-57984210',
        clientName,
        clientDni,
        clientEmail,
        camperName: 'Flota Utopia',
        items: [
          { label: 'Titular del Carnet', value: clientName },
          { label: 'Documento DNI / NIE / Pasaporte', value: clientDni },
          { label: 'Permiso de Conducción', value: 'Clase B (+2 años de antigüedad)' },
          { label: 'Estado de Validación', value: isVerified ? 'Aprobado y Conductor Habilitado ✓' : 'Pendiente de revisión' }
        ]
      }
    })

    // 3. Past Bookings Documents (Histórico)
    if (pastBookings.length > 0) {
      pastBookings.forEach((past) => {
        const pId = past.id.substring(0, 8).toUpperCase()
        const pCamper = past.camper?.name || (past.camper?.slug === 'space' ? 'SPACE' : 'NEO')
        const pFrom = new Date(past.start_date)
        const pTo = new Date(past.end_date)
        const pDateFormatted = pFrom.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
        const pRangeFormatted = `${pFrom.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${pTo.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`
        const pPrice = past.total_price || 980

        list.push({
          id: `past-ctr-${past.id}`,
          title: `Contrato de Alquiler · Viaje ${pCamper}`,
          category: 'past',
          typeLabel: 'Contrato Archivado',
          refNumber: `UTO-CTR-HIST-${pId}`,
          date: pDateFormatted,
          isoDate: past.start_date || '2025-06-10',
          status: 'archived',
          statusLabel: 'Archivado / Finalizado',
          fileFormat: 'PDF (2.1 MB)',
          isPast: true,
          tripName: `Viaje Finalizado · Camper ${pCamper} (${pFrom.getFullYear()})`,
          bookingId: past.id,
          summary: `Contrato finalizado del viaje del ${pRangeFormatted} en Mallorca. Fianza devuelta íntegramente.`,
          contentDetails: {
            issuer: 'Utopia Van Life S.L.',
            cif: 'B-57984210',
            clientName,
            clientDni,
            clientEmail,
            camperName: `Camper ${pCamper}`,
            datesRange: pRangeFormatted,
            items: [
              { label: 'Periodo de Alquiler', value: pRangeFormatted },
              { label: 'Vehículo', value: `Camper ${pCamper}` },
              { label: 'Estado del Servicio', value: 'Completado sin incidencias ✓' },
              { label: 'Fianza', value: 'Devuelta al 100% (800,00 €)' }
            ]
          }
        })

        list.push({
          id: `past-fac-${past.id}`,
          title: `Factura Oficial · Viaje ${pCamper}`,
          category: 'past',
          typeLabel: 'Factura Archivada',
          refNumber: `FAC-HIST-${pId}`,
          date: pDateFormatted,
          isoDate: past.start_date || '2025-06-10',
          status: 'paid',
          statusLabel: 'Pagada',
          fileFormat: 'PDF (820 KB)',
          isPast: true,
          tripName: `Viaje Finalizado · Camper ${pCamper} (${pFrom.getFullYear()})`,
          bookingId: past.id,
          amount: pPrice,
          summary: `Factura oficial por importe de ${formatPrice(pPrice)}, abonada y archivada.`,
          contentDetails: {
            issuer: 'Utopia Van Life S.L.',
            cif: 'B-57984210',
            clientName,
            clientDni,
            clientEmail,
            camperName: `Camper ${pCamper}`,
            datesRange: pRangeFormatted,
            items: [
              { label: `Alquiler Camper ${pCamper} (${pRangeFormatted})`, value: 'Base Imponible', price: Math.round(pPrice / 1.21) },
              { label: 'IVA General (21%)', value: '21% I.V.A.', price: pPrice - Math.round(pPrice / 1.21) },
              { label: 'Importe Total Liquidado', value: 'Pagado • Redsys', price: pPrice },
            ]
          }
        })
      })
    }

    return list
  }, [nextBooking, pastBookings, clientName, clientDni, clientEmail, clientPhone, isVerified, user.id])

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (selectedFilter === 'current' && doc.isPast) return false
      if (selectedFilter === 'past' && !doc.isPast) return false
      if (selectedFilter === 'invoices' && doc.category !== 'invoice' && !doc.title.toLowerCase().includes('factura')) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.refNumber.toLowerCase().includes(q) ||
          doc.typeLabel.toLowerCase().includes(q) ||
          doc.date.toLowerCase().includes(q) ||
          doc.tripName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [documents, selectedFilter, searchQuery])

  // Direct PDF Download Handler using jsPDF
  const handleDownload = async (doc: DocumentItem) => {
    setDownloadingId(doc.id)
    try {
      // Si es un contrato, generar el PDF oficial multipágina completo
      if (doc.category === 'contract') {
        const targetBooking = bookings?.find(b => b.id === doc.bookingId) || nextBooking
        const signedState = signedContractsState[doc.bookingId || '']
        const signature = signedState?.pdfUrl ? undefined : targetBooking?.contract_signature
        const contractData = generateContractData(targetBooking, safeProfile, undefined, contractTemplate)
        const { doc: officialDoc } = await generateOfficialContractPdfBlob(contractData, signature)
        officialDoc.save(`${doc.refNumber}_Contrato_Oficial.pdf`)
        return
      }

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Top dark accent stripe
      pdf.setFillColor(26, 43, 33)
      pdf.rect(0, 0, 210, 6, 'F')

      // Utopia Brand Header
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.setTextColor(26, 43, 33)
      pdf.text('UTOPIA VAN LIFE', 18, 22)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text('MALLORCA ISLAND  •  PREMIUM CAMPER EXPERIENCE', 18, 27)
      pdf.text('Utopia Van Life S.L.  •  CIF B-57984210  •  Palma de Mallorca', 18, 31)

      // Right-aligned Ref & Issue Date
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(26, 43, 33)
      pdf.text(doc.refNumber, 192, 20, { align: 'right' })

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Fecha de Emisión: ${doc.date}`, 192, 25, { align: 'right' })
      pdf.text(`Estado: ${doc.statusLabel}`, 192, 29, { align: 'right' })

      // Divider Line
      pdf.setDrawColor(26, 43, 33)
      pdf.setLineWidth(0.5)
      pdf.line(18, 35, 192, 35)

      // Document Main Title
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.setTextColor(26, 43, 33)
      pdf.text(doc.title, 18, 44)

      let yPos = 50

      // Box 1: Traveler / Client Data
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(18, yPos, 83, 34, 2, 2, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text('DATOS DEL ARRENDATARIO / TITULAR', 22, yPos + 5.5)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(30, 41, 59)
      pdf.text('Titular:', 22, yPos + 12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${doc.contentDetails.clientName}`, 40, yPos + 12)

      pdf.setFont('helvetica', 'normal')
      pdf.text('DNI / NIE:', 22, yPos + 17.5)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${doc.contentDetails.clientDni}`, 40, yPos + 17.5)

      pdf.setFont('helvetica', 'normal')
      pdf.text('Email:', 22, yPos + 23)
      pdf.text(`${doc.contentDetails.clientEmail}`, 40, yPos + 23)

      pdf.text('Teléfono:', 22, yPos + 28.5)
      pdf.text(`${doc.contentDetails.clientPhone || '+34 600 000 000'}`, 40, yPos + 28.5)

      // Box 2: Vehicle & Trip Data
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(109, yPos, 83, 34, 2, 2, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(100, 116, 139)
      pdf.text('DATOS DEL VEHÍCULO & VIAJE', 113, yPos + 5.5)

      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(30, 41, 59)
      pdf.text('Vehículo:', 113, yPos + 12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${doc.contentDetails.camperName}`, 131, yPos + 12)

      pdf.setFont('helvetica', 'normal')
      pdf.text('Matrícula:', 113, yPos + 17.5)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${doc.contentDetails.camperPlate || '7482-LMB'}`, 131, yPos + 17.5)

      pdf.setFont('helvetica', 'normal')
      pdf.text('Periodo:', 113, yPos + 23)
      pdf.text(`${doc.contentDetails.datesRange || 'Temporada 2026'}`, 131, yPos + 23)

      pdf.text('Entrega:', 113, yPos + 28.5)
      pdf.text('Palma de Mallorca (Base Utopia)', 131, yPos + 28.5)

      yPos += 40

      // Table of Items / Concepts
      if (doc.contentDetails.items && doc.contentDetails.items.length > 0) {
        pdf.setFillColor(26, 43, 33)
        pdf.rect(18, yPos, 174, 6.5, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7.5)
        pdf.setTextColor(255, 255, 255)
        pdf.text('CONCEPTO / DESCRIPCIÓN', 22, yPos + 4.5)
        pdf.text('DETALLE / IMPORTE', 190, yPos + 4.5, { align: 'right' })

        yPos += 6.5

        doc.contentDetails.items.forEach((item, index) => {
          pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252)
          pdf.rect(18, yPos, 174, 6.5, 'F')
          pdf.setDrawColor(226, 232, 240)
          pdf.line(18, yPos + 6.5, 192, yPos + 6.5)

          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(7.5)
          pdf.setTextColor(30, 41, 59)
          pdf.text(item.label, 22, yPos + 4.5)

          pdf.setFont('helvetica', 'bold')
          const valText = item.price !== undefined ? `${item.price.toFixed(2)} €` : item.value
          pdf.text(valText, 190, yPos + 4.5, { align: 'right' })

          yPos += 6.5
        })

        yPos += 6
      }

      // Coverage Details
      if (doc.contentDetails.coverageDetails) {
        pdf.setFillColor(240, 253, 244)
        pdf.setDrawColor(187, 247, 208)
        const covBoxH = 7 + doc.contentDetails.coverageDetails.length * 5
        pdf.roundedRect(18, yPos, 174, covBoxH, 2, 2, 'FD')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7.5)
        pdf.setTextColor(22, 101, 52)
        pdf.text('COBERTURAS INCLUIDAS EN LA PÓLIZA ALLIANZ', 22, yPos + 5)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        let covY = yPos + 9.5
        doc.contentDetails.coverageDetails.forEach(cov => {
          pdf.text(`• ${cov}`, 24, covY)
          covY += 5
        })

        yPos += covBoxH + 6
      }

      // Legal Clause
      if (doc.contentDetails.legalClause) {
        pdf.setFillColor(248, 250, 252)
        pdf.setDrawColor(226, 232, 240)
        pdf.roundedRect(18, yPos, 174, 15, 2, 2, 'FD')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(6.5)
        pdf.setTextColor(100, 116, 139)
        pdf.text('CLÁUSULA DE USO RESPONSABLE:', 22, yPos + 4.5)

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(71, 85, 105)
        const splitText = pdf.splitTextToSize(doc.contentDetails.legalClause, 166)
        pdf.text(splitText, 22, yPos + 8.5)

        yPos += 20
      }

      // Signatures & Verification Badge
      yPos = Math.max(yPos, 235)
      pdf.setDrawColor(226, 232, 240)
      pdf.line(18, yPos, 192, yPos)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.setTextColor(26, 43, 33)
      pdf.text('Utopia Van Life S.L.', 18, yPos + 7)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Firma digital del emisor & arrendador', 18, yPos + 11.5)
      pdf.text('Expedido en Palma de Mallorca', 18, yPos + 15.5)

      // Green Verification Stamp Box
      pdf.setFillColor(240, 253, 244)
      pdf.setDrawColor(5, 150, 105)
      pdf.roundedRect(118, yPos + 3, 74, 16, 2, 2, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(5, 150, 105)
      pdf.text('✓ DOCUMENTO OFICIAL VÁLIDO', 122, yPos + 8)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Certificado digital • Ref: ${doc.refNumber}`, 122, yPos + 12)
      pdf.text(`Fecha de verificación: ${doc.date}`, 122, yPos + 15.5)

      // Direct file download trigger in browser
      const cleanFileName = `${doc.refNumber}_${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      pdf.save(cleanFileName)
    } catch (err) {
      console.error('Error generating PDF:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const currentCount = documents.filter(d => !d.isPast).length
  const pastCount = documents.filter(d => d.isPast).length
  const invoiceCount = documents.filter(d => d.category === 'invoice' || d.title.includes('Factura')).length

  return (
    <div className="mini-docs-container">
      {/* ─── Minimalist Header ─── */}
      <div className="mini-docs-header">
        <div className="header-text-block">
          <div className="header-kicker">
            <ShieldCheck size={13} />
            <span>Documentos Oficiales</span>
          </div>
          <h1 className="mini-docs-title">Documentación & Facturas</h1>
          <p className="mini-docs-sub">
            Accede a tus contratos, comprobantes fiscales y pólizas de viaje con su fecha de emisión.
          </p>
        </div>

        {hasBookings && (
          /* Filter Pills */
          <div className="mini-filter-bar">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`mini-filter-btn ${selectedFilter === 'all' ? 'mini-filter-btn--active' : ''}`}
            >
              Todos <span className="pill-qty">{documents.length}</span>
            </button>
            <button
              onClick={() => setSelectedFilter('current')}
              className={`mini-filter-btn ${selectedFilter === 'current' ? 'mini-filter-btn--active' : ''}`}
            >
              Reserva Actual <span className="pill-qty">{currentCount}</span>
            </button>
            <button
              onClick={() => setSelectedFilter('invoices')}
              className={`mini-filter-btn ${selectedFilter === 'invoices' ? 'mini-filter-btn--active' : ''}`}
            >
              Facturas <span className="pill-qty">{invoiceCount}</span>
            </button>
            <button
              onClick={() => setSelectedFilter('past')}
              className={`mini-filter-btn ${selectedFilter === 'past' ? 'mini-filter-btn--active' : ''}`}
            >
              Histórico <span className="pill-qty">{pastCount}</span>
            </button>
          </div>
        )}
      </div>

      {!hasBookings ? (
        <div className="empty-docs-container">
          <div className="empty-docs-badge">
            <Sparkles size={13} />
            <span>Preparado para tu próxima aventura</span>
          </div>
          <div className="empty-docs-icon-wrap">
            <FileText size={38} style={{ color: 'var(--forest-green)' }} />
          </div>
          <h2 className="empty-docs-title">Aún no tienes documentación generada</h2>
          <p className="empty-docs-desc">
            En cuanto reserves tu camper Utopia, aquí tendrás disponible en tiempo real tu contrato oficial de alquiler con firma digitalizada, actas de check-in, certificados de póliza a todo riesgo y facturas con IVA desglosado.
          </p>

          <div className="empty-docs-features-grid">
            <div className="empty-feature-item">
              <div className="empty-feature-icon"><FileCheck size={18} /></div>
              <div>
                <h4 className="empty-feature-title">Contrato Oficial de Alquiler</h4>
                <p className="empty-feature-text">31 artículos legales con cobertura completa, kilometraje oficial y condiciones de fianza.</p>
              </div>
            </div>
            <div className="empty-feature-item">
              <div className="empty-feature-icon"><ShieldCheck size={18} /></div>
              <div>
                <h4 className="empty-feature-title">Póliza Allianz & Asistencia 24h</h4>
                <p className="empty-feature-text">Certificado oficial de cobertura en carretera y teléfono directo de asistencia.</p>
              </div>
            </div>
            <div className="empty-feature-item">
              <div className="empty-feature-icon"><ClipboardCheck size={18} /></div>
              <div>
                <h4 className="empty-feature-title">Acta de Entrega Digital</h4>
                <p className="empty-feature-text">Check-in con fotos, niveles de fluidos al 100% y revisión del kit exterior.</p>
              </div>
            </div>
            <div className="empty-feature-item">
              <div className="empty-feature-icon"><Receipt size={18} /></div>
              <div>
                <h4 className="empty-feature-title">Facturas Oficiales</h4>
                <p className="empty-feature-text">Desglose de IVA al 21%, recibos de pago y certificados de devolución de fianza.</p>
              </div>
            </div>
          </div>

          <div className="empty-docs-cta-group">
            <Link href="/campers" className="btn btn-forest" style={{ padding: '12px 24px', gap: 8, textDecoration: 'none' }}>
              <Truck size={16} />
              <span>Explorar Campers & Reservar</span>
            </Link>
            <Link href="/dashboard/profile" className="btn btn-outline" style={{ padding: '12px 20px', gap: 8, textDecoration: 'none' }}>
              <UserCheck size={16} />
              <span>Completar Perfil de Conductor</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ─── Minimalist Stack (Unos encima de otros con desplegable) ─── */
        filteredDocuments.length === 0 ? (
          <div className="mini-empty-card">
            <FileText size={36} style={{ color: '#94A3B8' }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#1A2B21' }}>No hay documentos en esta categoría</p>
            <button onClick={() => setSelectedFilter('all')} className="mini-link-btn">
              Mostrar todos los documentos
            </button>
          </div>
        ) : (
          <div className="docs-accordion-stack">
          {filteredDocuments.map(doc => {
            const isExpanded = expandedIds.has(doc.id)
            const isDownloading = downloadingId === doc.id
            const isContract = doc.category === 'contract'
            const isInvoice = doc.category === 'invoice'
            const isInsurance = doc.category === 'insurance'
            const isVerification = doc.category === 'verification'
            const isCheckin = doc.category === 'checkin'

            return (
              <div
                key={doc.id}
                className={`accordion-item ${isExpanded ? 'accordion-item--expanded' : ''} ${doc.isPast ? 'accordion-item--past' : ''}`}
              >
                {/* ─── Clickable Header Row ─── */}
                <div
                  className="accordion-header"
                  onClick={() => toggleExpand(doc.id)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Left: Icon + Titles */}
                  <div className="accordion-header__main">
                    <div className={`mini-icon-box mini-icon-box--${doc.category}`}>
                      {isContract && <FileCheck size={18} />}
                      {isInvoice && <Receipt size={18} />}
                      {isInsurance && <ShieldCheck size={18} />}
                      {isVerification && <UserCheck size={18} />}
                      {isCheckin && <ClipboardCheck size={18} />}
                      {doc.isPast && <Archive size={18} />}
                    </div>

                    <div className="accordion-title-col">
                      <div className="accordion-title-row">
                        <span className="doc-primary-title">{doc.title}</span>
                        <span className={`mini-status-badge mini-status-badge--${doc.status}`}>
                          {doc.statusLabel}
                        </span>
                      </div>

                      <div className="doc-meta-row">
                        <span className="meta-inline-item">
                          <Calendar size={12} />
                          <span>{doc.date}</span>
                        </span>
                        <span className="meta-sep">•</span>
                        <span className="meta-inline-item font-mono">
                          {doc.refNumber}
                        </span>
                        <span className="meta-sep">•</span>
                        <span className="meta-inline-item meta-trip">
                          {doc.tripName}
                        </span>
                        {doc.amount && (
                          <>
                            <span className="meta-sep">•</span>
                            <span className="meta-inline-item meta-price">
                              {formatPrice(doc.amount)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Toggle */}
                  <div className="accordion-header__actions" onClick={(e) => e.stopPropagation()}>
                    {doc.category === 'contract' && (
                      (() => {
                        const targetBooking = bookings?.find(b => b.id === doc.bookingId) || nextBooking
                        const isSigned = Boolean(
                          signedContractsState[doc.bookingId || ''] || targetBooking?.contract_signed_at
                        )
                        return !isSigned ? (
                          <button
                            onClick={() => setSigningBooking(targetBooking)}
                            className="btn-action"
                            style={{
                              background: '#1A2B21',
                              color: '#ffffff',
                              border: '1px solid #1A2B21',
                              fontWeight: 600
                            }}
                            title="Firmar digitalmente este contrato oficial"
                          >
                            <PenTool size={13} />
                            <span>Firmar Contrato</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Firmado</span>
                          </span>
                        )
                      })()
                    )}

                    <button
                      onClick={() => setActivePreviewDoc(doc)}
                      className="btn-action btn-action--view"
                      title="Ver vista previa completa del documento"
                    >
                      <Eye size={14} />
                      <span>Ver</span>
                    </button>

                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading}
                      className="btn-action btn-action--download"
                      title="Descargar documento oficial en PDF"
                    >
                      <Download size={14} />
                      <span>{isDownloading ? '...' : 'Descargar'}</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(doc.id)}
                      className="btn-chevron"
                      title={isExpanded ? 'Contraer detalles' : 'Desplegar detalles'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* ─── Expandable Drawer / Body ─── */}
                {isExpanded && (
                  <div className="accordion-body">
                    <div className="accordion-body__inner">
                      {/* Summary Banner */}
                      <p className="body-summary-text">{doc.summary}</p>

                      {/* Details Grid */}
                      <div className="body-details-grid">
                        <div className="details-col">
                          <span className="details-col__label">Titular & Conductor</span>
                          <div className="details-card-flat">
                            <div className="flat-row">
                              <span>Nombre:</span>
                              <strong>{doc.contentDetails.clientName}</strong>
                            </div>
                            <div className="flat-row">
                              <span>Documento:</span>
                              <strong>{doc.contentDetails.clientDni}</strong>
                            </div>
                            <div className="flat-row">
                              <span>Email:</span>
                              <span>{doc.contentDetails.clientEmail}</span>
                            </div>
                          </div>
                        </div>

                        <div className="details-col">
                          <span className="details-col__label">Vehículo & Servicio</span>
                          <div className="details-card-flat">
                            <div className="flat-row">
                              <span>Modelo:</span>
                              <strong>{doc.contentDetails.camperName}</strong>
                            </div>
                            {doc.contentDetails.camperPlate && (
                              <div className="flat-row">
                                <span>Matrícula:</span>
                                <strong>{doc.contentDetails.camperPlate}</strong>
                              </div>
                            )}
                            {doc.contentDetails.datesRange && (
                              <div className="flat-row">
                                <span>Periodo:</span>
                                <span>{doc.contentDetails.datesRange}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items table if exists */}
                      {doc.contentDetails.items && doc.contentDetails.items.length > 0 && (
                        <div className="body-table-wrap">
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th>Concepto</th>
                                <th style={{ textAlign: 'right' }}>Detalle</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doc.contentDetails.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.label}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {item.price !== undefined ? `${item.price.toFixed(2)} €` : item.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Insurance Highlights if exists */}
                      {doc.contentDetails.coverageDetails && (
                        <div className="body-coverage-box">
                          <span className="coverage-box__title">Coberturas incluidas en la póliza Allianz</span>
                          <ul className="coverage-box__list">
                            {doc.contentDetails.coverageDetails.map((cov, idx) => (
                              <li key={idx}>
                                <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                                <span>{cov}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Legal Clause Notice */}
                      {doc.contentDetails.legalClause && (
                        <div className="body-legal-bar">
                          <strong>Condición de Uso:</strong> {doc.contentDetails.legalClause}
                        </div>
                      )}

                      {/* Footer Actions in Drawer */}
                      <div className="drawer-footer-row">
                        <div className="digital-signature-tag">
                          <span className="sig-dot" />
                          <span>Certificado Digital Oficial • Utopia Van Life S.L. ({doc.refNumber})</span>
                        </div>

                        <div className="drawer-actions">
                          {doc.category === 'contract' && (
                            (() => {
                              const targetBooking = bookings?.find(b => b.id === doc.bookingId) || nextBooking
                              const isSigned = Boolean(
                                signedContractsState[doc.bookingId || ''] || targetBooking?.contract_signed_at
                              )
                              return !isSigned ? (
                                <button
                                  onClick={() => setSigningBooking(targetBooking)}
                                  className="btn-action"
                                  style={{
                                    background: '#1A2B21',
                                    color: '#ffffff',
                                    border: '1px solid #1A2B21',
                                    fontWeight: 600
                                  }}
                                >
                                  <PenTool size={13} />
                                  <span>Firmar Contrato</span>
                                </button>
                              ) : null
                            })()
                          )}
                          <button
                            onClick={() => setActivePreviewDoc(doc)}
                            className="btn-action btn-action--view"
                          >
                            <Eye size={13} />
                            <span>Ver en pantalla completa</span>
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={isDownloading}
                            className="btn-action btn-action--download"
                          >
                            <Download size={13} />
                            <span>Descargar PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* ─── Minimalist Modal Preview ─── */}
      {activePreviewDoc && (
        <div className="modal-backdrop" onClick={() => setActivePreviewDoc(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div className="modal-title-wrap">
                <span className="font-mono text-xs" style={{ color: '#64748B' }}>{activePreviewDoc.refNumber}</span>
                <h2 className="modal-heading">{activePreviewDoc.title}</h2>
              </div>
              <div className="modal-buttons">
                {activePreviewDoc.category === 'contract' && (
                  (() => {
                    const targetBooking = bookings?.find(b => b.id === activePreviewDoc.bookingId) || nextBooking
                    const isSigned = Boolean(
                      signedContractsState[activePreviewDoc.bookingId || ''] || targetBooking?.contract_signed_at
                    )
                    return !isSigned ? (
                      <button
                        onClick={() => {
                          setActivePreviewDoc(null)
                          setSigningBooking(targetBooking)
                        }}
                        className="btn-action"
                        style={{ background: '#1A2B21', color: '#ffffff', border: '1px solid #1A2B21', fontWeight: 600 }}
                      >
                        <PenTool size={14} />
                        <span>Firmar Ahora</span>
                      </button>
                    ) : null
                  })()
                )}
                <button
                  onClick={() => handleDownload(activePreviewDoc)}
                  className="btn-action btn-action--download"
                >
                  <Printer size={14} />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setActivePreviewDoc(null)}
                  className="btn-close-modal"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-sheet-content">
              <div className="sheet-top-header">
                <div>
                  <div className="sheet-logo-main">UTOPIA VAN LIFE</div>
                  <div className="sheet-logo-tagline">Mallorca Island • Premium Camper Experience</div>
                  <div className="sheet-cif-text">Utopia Van Life S.L. • CIF B-57984210 • Palma de Mallorca</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sheet-doc-ref font-mono">{activePreviewDoc.refNumber}</div>
                  <div className="sheet-doc-date">Fecha: <strong>{activePreviewDoc.date}</strong></div>
                  <span className="sheet-badge-green">{activePreviewDoc.statusLabel}</span>
                </div>
              </div>

              <div className="sheet-line" />

              <div className="sheet-boxes-grid">
                <div className="sheet-box">
                  <span className="sheet-box-title">Datos del Arrendatario / Titular</span>
                  <div className="sheet-box-row"><span>Nombre:</span><strong>{activePreviewDoc.contentDetails.clientName}</strong></div>
                  <div className="sheet-box-row"><span>DNI / NIE:</span><strong>{activePreviewDoc.contentDetails.clientDni}</strong></div>
                  <div className="sheet-box-row"><span>Email:</span><span>{activePreviewDoc.contentDetails.clientEmail}</span></div>
                </div>

                <div className="sheet-box">
                  <span className="sheet-box-title">Datos del Vehículo & Servicio</span>
                  <div className="sheet-box-row"><span>Vehículo:</span><strong>{activePreviewDoc.contentDetails.camperName}</strong></div>
                  {activePreviewDoc.contentDetails.camperPlate && (
                    <div className="sheet-box-row"><span>Matrícula:</span><strong>{activePreviewDoc.contentDetails.camperPlate}</strong></div>
                  )}
                  {activePreviewDoc.contentDetails.datesRange && (
                    <div className="sheet-box-row"><span>Periodo:</span><span>{activePreviewDoc.contentDetails.datesRange}</span></div>
                  )}
                </div>
              </div>

              {activePreviewDoc.contentDetails.items && activePreviewDoc.contentDetails.items.length > 0 && (
                <table className="sheet-full-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th style={{ textAlign: 'right' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePreviewDoc.contentDetails.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.label}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {item.price !== undefined ? `${item.price.toFixed(2)} €` : item.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activePreviewDoc.contentDetails.coverageDetails && (
                <div className="sheet-coverage-block">
                  <span className="sheet-box-title">Coberturas Póliza Allianz</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '0.8rem', color: '#166534' }}>
                    {activePreviewDoc.contentDetails.coverageDetails.map((c, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activePreviewDoc.contentDetails.legalClause && (
                <div className="sheet-clause-box">
                  <strong>Condición:</strong> {activePreviewDoc.contentDetails.legalClause}
                </div>
              )}

              <div className="sheet-footer-signatures">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A2B21' }}>Utopia Van Life S.L.</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Firma digital autorizada</div>
                </div>
                <div className="sheet-valid-seal">
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.75rem' }}>✓ DOCUMENTO OFICIAL VÁLIDO</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Código: {activePreviewDoc.refNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Lectura y Firma Digital del Contrato ─── */}
      {signingBooking && (
        <ContractSignModal
          booking={signingBooking}
          profile={safeProfile}
          contractTemplate={contractTemplate}
          onClose={() => setSigningBooking(null)}
          onSigned={(signedAt, pdfUrl) => {
            setSignedContractsState(prev => ({
              ...prev,
              [signingBooking.id]: { signedAt, pdfUrl }
            }))
          }}
        />
      )}

      {/* ─── Scoped Minimalist Styles ─── */}
      <style jsx>{`
        .mini-docs-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ─── Header ─── */
        .mini-docs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
          padding-bottom: 16px;
          border-bottom: 1px solid #E2E8F0;
        }
        .header-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #4A5568;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .mini-docs-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1A2B21;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0 0 4px 0;
        }
        .mini-docs-sub {
          font-size: 0.85rem;
          color: #64748B;
          margin: 0;
          max-width: 580px;
          line-height: 1.4;
        }

        /* ─── Minimalist Filter Bar ─── */
        .mini-filter-bar {
          display: flex;
          gap: 6px;
          background: #F1F5F9;
          padding: 3px;
          border-radius: 10px;
          flex-wrap: wrap;
        }
        .mini-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #64748B;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mini-filter-btn:hover {
          color: #1A2B21;
        }
        .mini-filter-btn--active {
          background: #FFFFFF;
          color: #1A2B21;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .pill-qty {
          font-size: 0.68rem;
          padding: 1px 5px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.05);
        }
        .mini-filter-btn--active .pill-qty {
          background: #1A2B21;
          color: #FFFFFF;
        }

        /* ─── Accordion Stack (Unos encima de otros) ─── */
        .docs-accordion-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .accordion-item {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .accordion-item:hover {
          border-color: #CBD5E0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .accordion-item--expanded {
          border-color: #94A3B8;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
        }
        .accordion-item--past {
          background: #FAFAFA;
        }

        /* ─── Accordion Header Row ─── */
        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          user-select: none;
          gap: 16px;
        }
        .accordion-header__main {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .mini-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .mini-icon-box--contract { background: #E0F2FE; color: #0284C7; }
        .mini-icon-box--invoice { background: #FEF3C7; color: #D97706; }
        .mini-icon-box--insurance { background: #D1FAE5; color: #059669; }
        .mini-icon-box--verification { background: #EDE9FE; color: #7C3AED; }
        .mini-icon-box--checkin { background: #FCE7F3; color: #DB2777; }
        .mini-icon-box--past { background: #F1F5F9; color: #64748B; }

        .accordion-title-col {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .accordion-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .doc-primary-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #1A2B21;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mini-status-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .mini-status-badge--valid,
        .mini-status-badge--verified,
        .mini-status-badge--paid {
          background: #D1FAE5;
          color: #047857;
        }
        .mini-status-badge--archived {
          background: #F1F5F9;
          color: #64748B;
        }
        .mini-status-badge--pending {
          background: #FEF3C7;
          color: #B45309;
        }

        .doc-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #64748B;
          flex-wrap: wrap;
        }
        .meta-inline-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .meta-sep {
          color: #CBD5E0;
        }
        .meta-trip {
          color: #4A5568;
        }
        .meta-price {
          color: #059669;
          font-weight: 700;
        }
        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        /* ─── Actions on Right ─── */
        .accordion-header__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 11px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        .btn-action--view {
          background: #F1F5F9;
          color: #1A2B21;
          border-color: #E2E8F0;
        }
        .btn-action--view:hover {
          background: #E2E8F0;
          color: #000000;
        }
        .btn-action--download {
          background: #1A2B21;
          color: #FFFFFF;
        }
        .btn-action--download:hover {
          background: #2D4A39;
        }
        .btn-chevron {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: transparent;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-chevron:hover {
          background: #F8FAFC;
          color: #1A2B21;
        }

        /* ─── Expandable Body ─── */
        .accordion-body {
          border-top: 1px solid #EDF2F7;
          background: #FAFAFA;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .accordion-body__inner {
          padding: 16px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .body-summary-text {
          font-size: 0.82rem;
          color: #4A5568;
          margin: 0;
          line-height: 1.45;
        }

        .body-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .details-col__label {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #718096;
          display: block;
          margin-bottom: 4px;
        }
        .details-card-flat {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .flat-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #4A5568;
        }
        .flat-row strong {
          color: #1A2B21;
          text-align: right;
        }

        .body-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          overflow: hidden;
        }
        .mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
        }
        .mini-table th {
          background: #F1F5F9;
          color: #4A5568;
          text-align: left;
          padding: 7px 12px;
          font-size: 0.7rem;
          text-transform: uppercase;
        }
        .mini-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #EDF2F7;
          color: #1A2B21;
        }

        .body-coverage-box {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          padding: 12px 14px;
        }
        .coverage-box__title {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #166534;
          display: block;
          margin-bottom: 6px;
        }
        .coverage-box__list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .coverage-box__list li {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 0.78rem;
          color: #15803D;
        }

        .body-legal-bar {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.75rem;
          color: #64748B;
          line-height: 1.4;
        }

        .drawer-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid #E2E8F0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .digital-signature-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #64748B;
        }
        .sig-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #059669;
        }
        .drawer-actions {
          display: flex;
          gap: 8px;
        }

        /* ─── Empty Card ─── */
        .mini-empty-card {
          background: #FFFFFF;
          border: 1px dashed #CBD5E0;
          border-radius: 14px;
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .mini-link-btn {
          background: none;
          border: none;
          color: #0284C7;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        /* ─── Modal ─── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-dialog {
          background: #FFFFFF;
          border-radius: 18px;
          width: 100%;
          max-width: 740px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #E2E8F0;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
        }
        .modal-top-bar {
          position: sticky;
          top: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid #E2E8F0;
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
        }
        .modal-heading {
          font-size: 1rem;
          font-weight: 800;
          color: #1A2B21;
          margin: 0;
        }
        .modal-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-close-modal {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #F1F5F9;
          border: none;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .btn-close-modal:hover {
          background: #E2E8F0;
          color: #000;
        }

        .modal-sheet-content {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .sheet-top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .sheet-logo-main {
          font-size: 1.3rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #1A2B21;
        }
        .sheet-logo-tagline {
          font-size: 0.72rem;
          color: #64748B;
          text-transform: uppercase;
        }
        .sheet-cif-text {
          font-size: 0.7rem;
          color: #94A3B8;
          margin-top: 3px;
        }
        .sheet-doc-ref {
          font-size: 0.95rem;
          font-weight: 800;
          color: #1A2B21;
        }
        .sheet-doc-date {
          font-size: 0.75rem;
          color: #64748B;
          margin-top: 2px;
        }
        .sheet-badge-green {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 8px;
          border-radius: 9999px;
          background: #D1FAE5;
          color: #047857;
          font-size: 0.68rem;
          font-weight: 700;
        }
        .sheet-line {
          height: 2px;
          background: #1A2B21;
        }
        .sheet-boxes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .sheet-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sheet-box-title {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748B;
          display: block;
          margin-bottom: 2px;
        }
        .sheet-box-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #4A5568;
        }
        .sheet-box-row strong {
          color: #1A2B21;
        }
        .sheet-full-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        .sheet-full-table th {
          background: #1A2B21;
          color: #FFFFFF;
          text-align: left;
          padding: 8px 12px;
          font-size: 0.72rem;
          text-transform: uppercase;
        }
        .sheet-full-table td {
          padding: 9px 12px;
          border-bottom: 1px solid #E2E8F0;
          color: #1A2B21;
        }
        .sheet-coverage-block {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          padding: 12px 14px;
        }
        .sheet-clause-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px;
          font-size: 0.75rem;
          color: #64748B;
        }
        .sheet-footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 14px;
          border-top: 1px solid #E2E8F0;
        }
        .sheet-valid-seal {
          border: 1px dashed #CBD5E0;
          border-radius: 8px;
          padding: 8px 14px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .mini-docs-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .accordion-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .accordion-header__actions {
            width: 100%;
            justify-content: flex-end;
          }
          .body-details-grid {
            grid-template-columns: 1fr;
          }
          .sheet-boxes-grid {
            grid-template-columns: 1fr;
          }
          .sheet-top-header {
            flex-direction: column;
            gap: 10px;
          }
          .sheet-top-header > div:last-child {
            text-align: left !important;
          }
          .modal-sheet-content {
            padding: 18px;
          }
        }

        @media (max-width: 640px) {
          .modal-backdrop {
            align-items: flex-end;
            padding: 0;
          }
          .modal-dialog {
            max-height: 94vh;
            border-radius: 20px 20px 0 0;
            border-bottom: none;
            animation: modalDocSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes modalDocSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .mini-docs-title {
            font-size: 1.35rem;
          }
          .mini-filter-bar {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding: 4px;
            width: 100%;
            scrollbar-width: none;
          }
          .mini-filter-bar::-webkit-scrollbar {
            display: none;
          }
          .mini-filter-btn {
            white-space: nowrap;
            flex-shrink: 0;
            font-size: 0.75rem;
            padding: 5px 10px;
          }
          .accordion-header {
            padding: 12px;
          }
          .accordion-header__actions {
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
          }
          .accordion-header__actions button {
            flex: 1;
            justify-content: center;
            min-height: 40px;
          }
          .doc-primary-title {
            white-space: normal;
            font-size: 0.92rem;
          }
          .accordion-body-content {
            padding: 12px;
          }
          .body-details-grid {
            grid-template-columns: 1fr;
          }
          .modal-sheet-content {
            padding: 14px;
          }
          .sheet-full-table th,
          .sheet-full-table td {
            padding: 8px 6px;
            font-size: 0.75rem;
          }
          .sheet-footer-signatures {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          .sheet-valid-seal {
            text-align: center;
          }
          .sheet-box-row {
            font-size: 0.78rem;
          }
          .empty-docs-container {
            padding: 36px 16px;
          }
          .empty-docs-cta-group {
            flex-direction: column;
            width: 100%;
          }
          .empty-docs-cta-group a,
          .empty-docs-cta-group button {
            width: 100%;
            justify-content: center;
          }
          .empty-docs-title {
            font-size: 1.25rem;
          }
          .empty-docs-desc {
            font-size: 0.88rem;
          }
          .empty-feature-item {
            padding: 12px 14px;
          }
        }

        .empty-docs-container {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: var(--radius-xl, 16px);
          padding: 56px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          margin-top: 12px;
        }
        .empty-docs-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F4F1EA;
          color: #1A2B21;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 6px 14px;
          border-radius: 9999px;
          margin-bottom: 24px;
        }
        .empty-docs-icon-wrap {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: #E8F5E9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .empty-docs-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1A2B21;
          margin: 0 0 10px 0;
          letter-spacing: -0.02em;
        }
        .empty-docs-desc {
          font-size: 0.95rem;
          color: #4B5563;
          max-width: 600px;
          line-height: 1.6;
          margin: 0 0 32px 0;
        }
        .empty-docs-features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          max-width: 740px;
          width: 100%;
          margin-bottom: 36px;
          text-align: left;
        }
        @media (max-width: 640px) {
          .empty-docs-features-grid {
            grid-template-columns: 1fr;
          }
        }
        .empty-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: #FAF8F5;
          border: 1px solid #EAE5DC;
          border-radius: var(--radius-lg, 12px);
          padding: 16px 18px;
        }
        .empty-feature-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid #E2DDD5;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A2B21;
          flex-shrink: 0;
        }
        .empty-feature-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #1A2B21;
          margin: 0 0 4px 0;
        }
        .empty-feature-text {
          font-size: 0.8rem;
          color: #6B7280;
          line-height: 1.4;
          margin: 0;
        }
        .empty-docs-cta-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}
