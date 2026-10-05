/** URLs firmadas (1 h) para las fotos y vídeos privados de una entrega */
export async function signHandoverMedia(db: any, h: any | null) {
  if (!h) return null
  const sign = async (path?: string | null) => {
    if (!path) return null
    const { data } = await db.storage.from('handovers').createSignedUrl(path, 3600)
    return data?.signedUrl || null
  }
  return {
    ...h,
    dashboardPhotoUrl: await sign(h.dashboard_photo_path),
    exteriorVideoUrl: await sign(h.exterior_video_path),
    interiorVideoUrl: await sign(h.interior_video_path),
    damagePhotoUrls: (await Promise.all((h.damage_photo_paths || []).map(sign))).filter(Boolean),
  }
}
