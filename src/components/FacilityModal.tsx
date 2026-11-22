import React, { useState, useRef } from 'react';
import { FacilityCategory, POI } from '../types';
import { SELECTABLE_CATEGORIES, CategoryIcon } from './CategoryIcon';
import { X, Phone, Clock, FileText, CheckCircle2, Camera, Image } from 'lucide-react';
import { compressPoiPhotoToWebP } from '../utils/imageCompress';
import { getApiBaseUrl, getPoiDataMode } from '../utils/apiBase';
import { getCurrentUser } from '../services/facilityDb';

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (facility: POI) => void;
  onDelete?: (facility: POI) => void;
  lat: number;
  lng: number;
  defaultSectionName?: string;
  initialFacility?: POI | null;
}

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lat,
  lng,
  defaultSectionName = '',
  initialFacility = null
}) => {
  const [selectedCategories, setSelectedCategories] = useState<FacilityCategory[]>(['viewpoint']);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setFormError('');
    if (initialFacility) {
      const initialCats: FacilityCategory[] =
        initialFacility.categories && initialFacility.categories.length > 0
          ? initialFacility.categories.filter((c) => c !== 'shelter')
          : initialFacility.category && initialFacility.category !== 'shelter'
          ? [initialFacility.category]
          : ['viewpoint'];

      setSelectedCategories(initialCats.length > 0 ? initialCats : ['viewpoint']);
      setName(initialFacility.name || '');
      setPhone(initialFacility.phone || '');
      setHours(initialFacility.business_hours || '');
      setMemo(initialFacility.memo || '');
      setPhotoUrl(initialFacility.photo_url || null);
    } else {
      setSelectedCategories(['viewpoint']);
      setName('');
      setPhone('');
      setHours('');
      setMemo('');
      setPhotoUrl(null);
    }
  }, [initialFacility, isOpen]);

  if (!isOpen) return null;

  // Handle category toggle
  const handleToggleCategory = (catKey: FacilityCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(catKey)) {
        if (prev.length === 1) return prev; // 최소 1개는 선택 유지
        return prev.filter((k) => k !== catKey);
      } else {
        return [...prev, catKey];
      }
    });
  };

  // Handle image selection: compress to WebP (<= 300KB) and upload binary to Vercel Blob (or local placeholder)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError('');
    setIsCompressing(true);

    try {
      const compressedBlob = await compressPoiPhotoToWebP(file);

      if (getPoiDataMode() === 'local') {
        setPhotoUrl('/images/local-photo-placeholder.svg');
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser?.id) {
        setFormError('사진을 업로드하려면 먼저 로그인해 주세요.');
        return;
      }

      const sectionIdHeader = String(initialFacility?.section_id ?? 0);
      const uploadRes = await fetch(`${getApiBaseUrl()}/api/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': compressedBlob.type || 'image/webp',
          'x-user-id': currentUser.id,
          'x-section-id': sectionIdHeader,
        },
        body: compressedBlob,
      });

      if (!uploadRes.ok) {
        const errPayload = (await uploadRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errPayload.error || `사진 업로드 실패 (${uploadRes.status})`);
      }

      const { url } = (await uploadRes.json()) as { url?: string };
      if (!url) {
        throw new Error('업로드된 사진 URL을 받지 못했습니다.');
      }
      setPhotoUrl(url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '사진 처리 중 오류가 발생했습니다.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const isOnlyToilet = selectedCategories.length === 1 && selectedCategories[0] === 'toilet';
    let finalName = name.trim();
    if (!finalName) {
      if (isOnlyToilet) {
        finalName = '공중화장실';
      } else {
        setFormError('시설 또는 장소 명칭을 입력해 주세요.');
        return;
      }
    }

    const primaryCategory = selectedCategories[0] || 'other';

    onSubmit({
      id: initialFacility?.id,
      section_id: initialFacility?.section_id,
      name: finalName,
      category: primaryCategory,
      categories: selectedCategories,
      lat: initialFacility?.lat ?? lat,
      lng: initialFacility?.lng ?? lng,
      phone: phone.trim() || undefined,
      business_hours: hours.trim() || undefined,
      memo: memo.trim() || undefined,
      photo_url: photoUrl || undefined,
      is_official: initialFacility?.is_official
    });

    setName('');
    setPhone('');
    setHours('');
    setMemo('');
    setPhotoUrl(null);
    onClose();
  };

  const isToilet = selectedCategories.includes('toilet');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header - 5.1 불필요 안내문구 삭제 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50">
          <div>
            <h2 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
              <span>📍</span> {initialFacility ? '편의시설 / 명소 수정' : '새 편의시설 / 명소 등록'}
            </h2>
            {defaultSectionName && (
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                {defaultSectionName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-emerald-100/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* 5.3 명칭 / 이름이 시설 종류(다수 선택) 보다 먼저 배치 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-gray-800">
                명칭 / 이름 {!isToilet && <span className="text-red-500">*</span>}
              </label>
              {isToilet && (
                <span className="text-xs text-emerald-700 font-semibold">
                  (화장실은 이름 생략 가능 · [공중화장실]로 자동 저장)
                </span>
              )}
            </div>
            <input
              type="text"
              required={!isToilet}
              placeholder={
                isToilet
                  ? "미입력 시 '공중화장실'로 자동 저장됩니다"
                  : "예: 삼봉해변 뷰포인트, 솔밭식당, 안면콜택시"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-base px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* 5.2 시설 종류 다중 선택 - 원형 Material 아이콘 토글/반전 디자인 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-800">
                시설 종류 <span className="text-xs text-emerald-700 font-normal">(다중 선택 가능)</span>
              </label>
              <span className="text-xs text-gray-500">
                선택됨: <strong className="text-emerald-700">{selectedCategories.length}</strong>개
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {SELECTABLE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleToggleCategory(cat.key)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                        : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <CategoryIcon
                      category={cat.key}
                      size="md"
                      selected={isSelected}
                    />
                    <span
                      className={`mt-1.5 text-xs font-bold truncate max-w-full ${
                        isSelected ? 'text-emerald-950 font-black' : 'text-gray-600'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Attachment */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              현장 사진 첨부 (선택)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {photoUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={photoUrl} alt="첨부 사진" loading="lazy" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-emerald-700 transition-colors bg-gray-50/50"
              >
                {isCompressing ? (
                  <span>사진 압축 중...</span>
                ) : (
                  <>
                    <Image className="w-5 h-5 text-gray-400" />
                    <span>카메라 촬영 또는 갤러리에서 사진 첨부</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-600" />
              전화번호 (콜택시/식당/숙소 등)
            </label>
            <input
              type="tel"
              placeholder="예: 041-673-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-base px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Business Hours */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              운영 / 이용 시간 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 24시간 개방, 09:00 ~ 18:00, 일몰 후 출입제한"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full text-base px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* 5.4 메모 (최소 5줄) */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              메모
            </label>
            <textarea
              rows={5}
              placeholder="동료 트레커들을 위한 상세 정보, 이용 팁, 주변 주의사항 등을 자유롭게 적어주세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-y"
            />
          </div>

          {/* Form Error Message */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
              ⚠️ {formError}
            </div>
          )}

          {/* 5.5 Action Buttons: 좌측 '취소', 우측 '저장' */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-28 py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-base rounded-2xl transition-colors cursor-pointer shrink-0 text-center"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={isCompressing}
              className="flex-1 py-4 px-6 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-base sm:text-lg rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>{isCompressing ? '사진 처리 중...' : '저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
