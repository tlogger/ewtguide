import React from 'react';
import { Award, CheckCircle, X, Calendar, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionNumber: string;
  sectionTitle: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

export const CertificationModal: React.FC<CertificationModalProps> = ({
  isOpen,
  onClose,
  sectionNumber,
  sectionTitle,
  isCompleted,
  onToggleComplete
}) => {
  if (!isOpen) return null;

  const handleCertify = () => {
    if (!isCompleted) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
    onToggleComplete();
    onClose();
  };

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
          <Award className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-1">
          {sectionNumber} 완주 인증
        </h3>
        <p className="text-sm text-gray-600 mb-4 flex items-center justify-center gap-1">
          <MapPin className="w-4 h-4 text-emerald-600" />
          {sectionTitle}
        </p>

        <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100 text-left space-y-2">
          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            인증 기준일: {todayStr}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            동서트레일 공식 노선을 시점부터 종점까지(또는 역방향) 완주하셨다면 아래 인증 버튼을 눌러주세요.
          </p>
        </div>

        <button
          onClick={handleCertify}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
            isCompleted
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98'
          }`}
        >
          <CheckCircle className="w-6 h-6" />
          <span>{isCompleted ? '완주 인증 취소하기' : '완주 인증 완료! 🎉'}</span>
        </button>
      </div>
    </div>
  );
};
