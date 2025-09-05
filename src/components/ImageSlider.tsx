import { useState, useEffect } from 'react';
import type { PhotoRow } from '../types/db';
import { getPhotoUrl } from '../lib/photoUtils';

type ImageSliderProps = {
  photos: PhotoRow[];
  className?: string;
  photoUrls?: Map<string, string>;
};

export default function ImageSlider({ photos, className = '', photoUrls: externalPhotoUrls }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [internalPhotoUrls, setInternalPhotoUrls] = useState<Map<string, string>>(new Map());

  // 사진이 변경될 때마다 새로운 Signed URL 생성 (외부 URL이 없을 때만)
  useEffect(() => {
    if (externalPhotoUrls) {
      setInternalPhotoUrls(externalPhotoUrls);
      return;
    }

    const generateUrls = async () => {
      const urlMap = new Map<string, string>();
      
      for (const photo of photos) {
        if (photo.storage_path) {
          const url = await getPhotoUrl(photo.storage_path);
          if (url) {
            urlMap.set(photo.storage_path, url);
          }
        }
      }
      
      setInternalPhotoUrls(urlMap);
    };

    if (photos.length > 0) {
      generateUrls();
    }
  }, [photos, externalPhotoUrls]);

  if (photos.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 메인 이미지 */}
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
        <div className="aspect-[4/3] w-full">
          <img 
            src={photos[currentIndex]?.storage_path ? 
              internalPhotoUrls.get(photos[currentIndex].storage_path) || '' : 
              photos[currentIndex]?.public_url || ''} 
            alt={`Photo ${currentIndex + 1}`}
            className="h-full w-full object-cover"
            onError={async (e) => {
              // 이미지 로드 실패 시 새로운 Signed URL로 재시도
              const currentPhoto = photos[currentIndex];
              if (currentPhoto?.storage_path) {
                const newUrl = await getPhotoUrl(currentPhoto.storage_path);
                if (newUrl) {
                  e.currentTarget.src = newUrl;
                  setInternalPhotoUrls(prev => new Map(prev).set(currentPhoto.storage_path, newUrl));
                  return;
                }
              }
              // 그래도 실패하면 대체 이미지
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9IjAuM2VtIj7snbTrr7jsp4A8L3RleHQ+PC9zdmc+';
            }}
          />
        </div>

        {/* 여러 장일 때만 네비게이션 화살표 표시 */}
        {photos.length > 1 && (
          <>
            {/* 왼쪽 화살표 */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
              aria-label="이전 사진"
            >
              ‹
            </button>

            {/* 오른쪽 화살표 */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
              aria-label="다음 사진"
            >
              ›
            </button>

            {/* 사진 개수 표시 */}
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              {currentIndex + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {/* 여러 장일 때 하단 점 네비게이션 */}
      {photos.length > 1 && (
        <div className="flex justify-center mt-2 space-x-1">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-orange-500' : 'bg-gray-300'
              }`}
              aria-label={`사진 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
