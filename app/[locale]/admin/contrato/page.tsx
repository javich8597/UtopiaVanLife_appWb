import { getContractTemplate } from '@/lib/contracts/templateService'
import ContractTemplateClient from './ContractTemplateClient'

export const metadata = {
  title: 'Plantilla de Contrato | Panel de Administración Utopia Van Life',
  description: 'Visualización y edición interactiva de la plantilla de contrato oficial de alquiler en PDF.'
}

export default async function AdminContractPage() {
  const template = await getContractTemplate()

  return <ContractTemplateClient initialTemplate={template} />
}
