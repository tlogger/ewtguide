import React, { useState } from 'react';
import { UserAccount, AuthProvider } from '../types';
import { signOutUser } from '../services/facilityDb';
import { startSocialAuth } from '../services/oauthService';
import {
  X,
  LogOut,
  Shield,
  User,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onAuthSuccess: (user: UserAccount | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  /**
   * 공식 소셜 OAuth2 인가 페이지 호출 (웹: 페이지 이동 / 모바일 앱: Chrome Custom Tab 오픈)
   */
  const handleSocialAuth = async (provider: AuthProvider) => {
    setIsLoading(true);
    setStatusMessage(null);

    const res = await startSocialAuth(provider, 'login');
    if (res.error) {
      setStatusMessage({
        type: 'error',
        text: res.error
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutUser();
      onAuthSuccess(null);
      // 로그아웃 시 팝업에 머물지 않고 즉시 메인 창으로 복귀
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-white space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {currentUser ? '내 계정 관리' : '소셜 로그인'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Already Logged In */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3.5">
              {currentUser.profile_image ? (
                <img
                  src={currentUser.profile_image}
                  alt={currentUser.name || ''}
                  className="w-12 h-12 rounded-full border border-emerald-400/50 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-700 flex items-center justify-center font-black text-base text-white">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-white text-base truncate">{currentUser.name}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase border border-emerald-500/30">
                    {currentUser.provider}
                  </span>
                </div>
                {currentUser.email && !currentUser.email.includes('@kakao.com') && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span>계정 인증 상태</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>연동 완료</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>최근 접속</span>
                <span>{currentUser.last_login_at ? new Date(currentUser.last_login_at).toLocaleDateString() : '-'}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          /* Not Logged In: Direct 3 Social Buttons Only */
          <div className="space-y-3 pt-1">
            {/* Naver Button */}
            <button
              type="button"
              onClick={() => handleSocialAuth('naver')}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#03C75A] hover:bg-[#02b350] active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-3 transition-transform shadow-xs cursor-pointer"
            >
              <span className="font-black text-base px-1">N</span>
              <span>네이버로 로그인</span>
            </button>

            {/* Kakao Button */}
            <button
              type="button"
              onClick={() => handleSocialAuth('kakao')}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#f5dc00] active:scale-98 text-[#191919] font-bold text-sm flex items-center justify-center gap-3 transition-transform shadow-xs cursor-pointer"
            >
              <span className="font-black text-sm">💬</span>
              <span>카카오로 로그인</span>
            </button>

            {/* Google Button */}
            <button
              type="button"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 active:scale-98 text-gray-800 font-bold text-sm flex items-center justify-center gap-3 transition-transform shadow-xs cursor-pointer border border-gray-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>구글로 로그인</span>
            </button>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold leading-relaxed border flex items-start gap-2 ${
                  statusMessage.type === 'error'
                    ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                    : statusMessage.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                    : 'bg-blue-950/70 border-blue-800 text-blue-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{statusMessage.text}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
