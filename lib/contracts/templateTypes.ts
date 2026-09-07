import { ContractArticle } from './contractEngine';

export interface ContractTermsSettings {
  // Conductor
  conductorMinAge: number;
  conductorMinLicenseYears: number;
  conductorLicenseType: string;

  // Kilometraje
  includedKmPerDay: number;
  extraKmPrice: number;
  unlimitedKmPricePerDay: number;

  // Fianza y Franquicia
  depositAmount: number;
  depositReturnDaysDamageAssessment: number;
  insuranceDeductible: number;

  // Horarios
  pickupWindow: string;
  dropoffWindow: string;
  flexibleHoursExtraCost: number;

  // Penalizaciones Operativas
  lateReturnFeeBase: number;
  lateReturnFeePerHour: number;
  lateReturnRecoveryHours: number;
  keyPenalty: number;
  documentPenalty: number;
  smokePenalty: number;
  petsPenalty: number;
  fuelServiceCharge: number;
  cleaningBasic: number;
  cleaningIntensive: number;
  cleaningWc: number;

  // Errores Graves
  waterFuelContaminationPenalty: number;
  heightLimitMeters: number;

  // Cancelaciones (Días y porcentajes de reembolso / penalización)
  cancellationNoticeDays100Refund: number;
  cancellationNoticeDays50Refund: number;

  // Inventario y Siniestros
  inventoryAdminFeePercent: number;
  claimAdminFee: number;
}

export interface LessorSettings {
  legalName: string;
  commercialName: string;
  cif: string;
  address: string;
  legalRepresentative: string;
  legalRepresentativeDni: string;
  contactEmail: string;
  contactPhone: string;
}

export interface ContractTemplateData {
  id?: string;
  version: number;
  title: string;
  subtitle: string;
  lessor: LessorSettings;
  terms: ContractTermsSettings;
  articles: ContractArticle[];
  updatedAt?: string;
  updatedBy?: string;
}

export const defaultContractTerms: ContractTermsSettings = {
  conductorMinAge: 25,
  conductorMinLicenseYears: 2,
  conductorLicenseType: 'B',

  includedKmPerDay: 150,
  extraKmPrice: 0.25,
  unlimitedKmPricePerDay: 20,

  depositAmount: 1000,
  depositReturnDaysDamageAssessment: 30,
  insuranceDeductible: 1000,

  pickupWindow: '10:00 - 14:00',
  dropoffWindow: '16:00 - 20:00',
  flexibleHoursExtraCost: 40,

  lateReturnFeeBase: 50,
  lateReturnFeePerHour: 25,
  lateReturnRecoveryHours: 4,
  keyPenalty: 400,
  documentPenalty: 200,
  smokePenalty: 300,
  petsPenalty: 150,
  fuelServiceCharge: 40,
  cleaningBasic: 50,
  cleaningIntensive: 150,
  cleaningWc: 200,

  waterFuelContaminationPenalty: 2000,
  heightLimitMeters: 2.80,

  cancellationNoticeDays100Refund: 30,
  cancellationNoticeDays50Refund: 15,

  inventoryAdminFeePercent: 25,
  claimAdminFee: 50,
};

export const defaultLessorSettings: LessorSettings = {
  legalName: 'UTOPIA VAN LIFE S.L.',
  commercialName: 'Utopia Van Life',
  cif: 'B24902637',
  address: 'C\\ Cristo de los remedios nº2 Planta 0 Puerta 2, 28703 San Sebastián de los Reyes (Madrid)',
  legalRepresentative: 'Roberto Estébanez Blanco',
  legalRepresentativeDni: '',
  contactEmail: 'info@utopiavanlife.com',
  contactPhone: '611 560 916',
};
