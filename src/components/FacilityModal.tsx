import React, { useState } from 'react';
import { FacilityCategory, POI } from '../types';
import { X, Phone, Clock, FileText, CheckCircle2 } from 'lucide-react';

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (facility: POI) => void;
  lat: number;
  lng: number;
}

const CATEGORIES: { key: FacilityCategory; label: string; icon: string }[] = [
  { key: 'shelter', label: '쉼터/정자', icon: '⛺' },
  { key: 'toilet', label: '화장실', icon: '🚻' },
  { key: 'restaurant', label: '식당', icon: '🍚' },
  { key: 'lodging', label: '숙소/민박', icon: '🏡' },
  { key: 'mart', label: '마트/편의점', icon: '🏪' },
  { key: 'transport', label: '교통/콜택시', icon: '🚕' },
  { key: 'cert_center', label: '인증/안내소', icon: '🚩' },
  { key: 'other', label: '기타/주의', icon: '📌' },
];

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lat,
  lng
}) => {
  const [category, setCategory] = useState<FacilityCategory>('shelter');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [memo, setMemo] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('시설 또는 장소 명칭을 입력해 주세요.');
      return;
    }
    onSubmit({
      name: name.trim(),
      category,
      lat,
      lng,
      phone: phone.trim() || undefined,
      business_hours: hours.trim() || undefined,
      memo: memo.trim() || undefined
    });
    setName('');
    setPhone('');
    setHours('');
    setMemo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50">
          <div>
            <h2 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
              <span>📍</span> 새 편의시설 등록
            </h2>
            <p className="text-xs text-emerald-700 mt-0.5">
              동료 트레커들을 위해 트레일 주변 시설 정보를 나눠주세요
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              시설 종류 (선택)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl mb-1">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              시설/장소 명칭 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 백사장항 공중화장실, 솔밭쉼터, 안면콜택시"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-base px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-600" />
              전화번호 (콜택시/식당/숙소 추천)
            </label>
            <input
              type="tel"
              placeholder="예: 041-673-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-base px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              placeholder="예: 24시간 개방, 09:00 ~ 18:00, 월요일 휴무"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full text-base px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              placeholder="예: 온수 잘 나옴, 식수대 있음, 마을버스 정류장 바로 앞"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>등록 완료하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
