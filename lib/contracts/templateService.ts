import { createClient } from '@supabase/supabase-js';
import { getOfficialContractArticles } from './contractEngine';
import {
  ContractTemplateData,
  defaultContractTerms,
  defaultLessorSettings,
} from './templateTypes';

export const CONTRACT_TEMPLATE_ROW_ID = 'default';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Retorna la plantilla predeterminada oficial de fábrica con los 31 artículos.
 */
export function getDefaultFactoryTemplate(): ContractTemplateData {
  return {
    id: CONTRACT_TEMPLATE_ROW_ID,
    version: 1,
    title: 'CONTRATO DE ARRENDAMIENTO DE VEHÍCULO VIVIENDA (CAMPER)',
    subtitle: 'CONDICIONES GENERALES Y PARTICULARES DE CONTRATACIÓN',
    lessor: { ...defaultLessorSettings },
    terms: { ...defaultContractTerms },
    articles: getOfficialContractArticles(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };
}

/**
 * Obtiene la plantilla activa del contrato.
 * Si existe en la base de datos Supabase, la retorna.
 * Si no existe, si falla la conexión o si la tabla aún no fue creada,
 * retorna de forma transparente y resiliente la plantilla oficial de fábrica.
 */
export async function getContractTemplate(): Promise<ContractTemplateData> {
  const fallback = getDefaultFactoryTemplate();

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return fallback;
    }

    const { data, error } = await supabase
      .from('contract_template_settings')
      .select('*')
      .eq('id', CONTRACT_TEMPLATE_ROW_ID)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    return {
      id: data.id,
      version: data.version ?? 1,
      title: data.title ?? fallback.title,
      subtitle: data.subtitle ?? fallback.subtitle,
      lessor: data.lessor ? { ...fallback.lessor, ...data.lessor } : fallback.lessor,
      terms: data.terms ? { ...fallback.terms, ...data.terms } : fallback.terms,
      articles: Array.isArray(data.articles) && data.articles.length > 0 ? data.articles : fallback.articles,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  } catch {
    return fallback;
  }
}

/**
 * Guarda o actualiza la plantilla activa del contrato.
 */
export async function saveContractTemplate(
  template: Partial<ContractTemplateData>,
  userEmail?: string
): Promise<{ success: boolean; data?: ContractTemplateData; error?: string }> {
  try {
    const current = await getContractTemplate();
    const updated: ContractTemplateData = {
      ...current,
      ...template,
      id: CONTRACT_TEMPLATE_ROW_ID,
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail ?? 'admin',
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('contract_template_settings')
        .upsert({
          id: CONTRACT_TEMPLATE_ROW_ID,
          version: updated.version,
          title: updated.title,
          subtitle: updated.subtitle,
          lessor: updated.lessor,
          terms: updated.terms,
          articles: updated.articles,
          updated_at: updated.updatedAt,
          updated_by: updated.updatedBy,
        });

      if (error) {
        console.error('[templateService] Error saving contract template to DB:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true, data: updated };
  } catch (err: any) {
    console.error('[templateService] Unexpected error saving contract template:', err);
    return { success: false, error: err?.message || 'Error desconocido al guardar' };
  }
}

/**
 * Restablece la plantilla a los valores de fábrica oficiales (31 artículos y tarifas oficiales).
 */
export async function resetContractTemplateToDefault(
  userEmail?: string
): Promise<{ success: boolean; data?: ContractTemplateData; error?: string }> {
  const factory = getDefaultFactoryTemplate();
  factory.updatedBy = userEmail ?? 'admin_reset';
  return saveContractTemplate(factory, userEmail);
}
