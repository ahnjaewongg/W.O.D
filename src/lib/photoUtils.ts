import { supabase } from './supabaseClient';

/**
 * 사진의 storage_path로부터 새로운 Signed URL을 생성합니다.
 * @param storagePath - Supabase Storage의 파일 경로
 * @param expiresIn - URL 만료 시간 (초), 기본값 7일
 * @returns 새로운 Signed URL 또는 null
 */
export async function getPhotoUrl(storagePath: string, expiresIn: number = 60 * 60 * 24 * 7): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('workout-photos')
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error generating photo URL:', error);
    return null;
  }
}

/**
 * 여러 사진의 URL을 한 번에 생성합니다.
 * @param storagePaths - Supabase Storage의 파일 경로 배열
 * @param expiresIn - URL 만료 시간 (초), 기본값 7일
 * @returns storagePath를 키로 하는 URL 맵
 */
export async function getPhotoUrls(storagePaths: string[], expiresIn: number = 60 * 60 * 24 * 7): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  // 병렬로 모든 URL 생성
  const promises = storagePaths.map(async (path) => {
    const url = await getPhotoUrl(path, expiresIn);
    if (url) {
      urlMap.set(path, url);
    }
  });
  
  await Promise.all(promises);
  return urlMap;
}
