import AdminPageHeader from '../AdminPageHeader'
import RetentionClient from './RetentionClient'

export const metadata = {
  title: 'Conservación de datos | Admin Utopia Van Life',
  description: 'Purga de la documentación de identidad al vencer sus plazos: simulación, borrado confirmado e historial.',
}

/**
 * Purga de la documentación de identidad (política de conservación). El acceso por rol lo exige el
 * layout de /admin y, en cada llamada, las rutas /api/admin/retention/* con `requireAdmin()`.
 */
export default function AdminRetentionPage() {
  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Conservación de datos"
        description="Borra la documentación de identidad al vencer sus plazos: simula primero, confirma después."
      />
      <RetentionClient />
    </div>
  )
}
