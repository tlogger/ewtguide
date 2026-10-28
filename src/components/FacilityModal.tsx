import React, { useState, useRef } from 'react';
import { FacilityCategory, POI } from '../types';
import { X, Phone, Clock, FileText, CheckCircle2, Camera, Image, Trash2 } from 'lucide-react';

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

const CATEGORIES: { key: FacilityCategory; label: string; icon: string }[] = [
  { key: 'viewpoint', label: '뷰포인트/명소', icon: '📸' },
  { key: 'shelter', label: '쉼터/정자', icon: '⛺' },
  { key: 'toilet', label: '화장실', icon: '🚻' },
  { key: 'restaurant', label: '식당/카페', icon: '🍚' },
  { key: 'lodging', label: '숙소/야영장', icon: '🏡' },
  { key: 'mart', label: '마트/편의점', icon: '🏪' },
  { key: 'transport', label: '교통/콜택시', icon: '🚕' },
  { key: 'cert_center', label: '인증/안내소', icon: '🚩' },
  { key: 'other', label: '기타/주의지점', icon: '📌' },
];

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  lat,
  lng,
  defaultSectionName = '',
  initialFacility = null
}) => {
  const [category, setCategory] = useState<FacilityCategory>('viewpoint');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setFormError('');
    setShowDeleteConfirm(false);
    if (initialFacility) {
      setCategory(initialFacility.category || 'viewpoint');
      setName(initialFacility.name || '');
      setPhone(initialFacility.phone || '');
      setHours(initialFacility.business_hours || '');
      setMemo(initialFacility.memo || '');
      setPhotoUrl(initialFacility.photo_url || null);
    } else {
      setCategory('viewpoint');
      setName('');
      setPhone('');
      setHours('');
      setMemo('');
      setPhotoUrl(null);
    }
  }, [initialFacility, isOpen]);

  if (!isOpen) return null;

  // Handle image selection and client-side canvas compression
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotoUrl(compressedDataUrl);
        }
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // For toilet, auto-default if empty
    let finalName = name.trim();
    if (!finalName) {
      if (category === 'toilet') {
        finalName = '공중화장실';
      } else {
        setFormError('시설 또는 장소 명칭을 입력해 주세요.');
        return;
      }
    }

    onSubmit({
      id: initialFacility?.id,
      name: finalName,
      category,
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

  const handleDelete = () => {
    if (initialFacility && onDelete) {
      onDelete(initialFacility);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const isToilet = category === 'toilet';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50">
          <div>
            <h2 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
              <span>📍</span> {initialFacility ? '편의시설 / 명소 수정' : '새 편의시설 / 명소 등록'}
            </h2>
            <p className="text-xs text-emerald-700 mt-0.5">
              {initialFacility ? '등록된 편의시설 정보를 수정합니다' : '동료 트레커들을 위해 트레일 주변 쉼터, 화장실, 뷰포인트를 공유하세요'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-emerald-100/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              시설 종류 (선택)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-101'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Field */}
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
                  : "예: 삼봉해변 뷰포인트, 솔밭쉼터, 안면콜택시"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-base px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Photo Attachment (NEW) */}
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
                <img src={photoUrl} alt="첨부 사진" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
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

          {/* Memo */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              트레커를 위한 팁 및 메모 (선택)
            </label>
            <textarea
              rows={2}
              placeholder="예: 일몰 경관 최고, 식수 공급 가능, 그늘 벤치 3개"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full text-sm px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
            />
          </div>

          {/* Form Error Message (In-app, no browser alert) */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl animate-shake">
              ⚠️ {formError}
            </div>
          )}

          {/* Delete Confirm Prompt (In-app, no browser confirm) */}
          {showDeleteConfirm && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-rose-900">
                정말 이 편의시설을 삭제하시겠습니까?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  네, 삭제합니다
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 font-bold text-xs rounded-xl transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            {initialFacility && onDelete && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-4 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-sm rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="시설 삭제"
              >
                <Trash2 className="w-5 h-5" />
                <span>삭제</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-4 px-6 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base sm:text-lg rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>{initialFacility ? '수정 저장하기' : '등록 완료하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
