import React, { useState, useEffect } from 'react';
import { UserAccount, AuthProvider } from '../types';
import {
  findUserAccount,
  registerUserAccount,
  updateUserLoginSession,
  signOutUser
} from '../services/facilityDb';
import {
  getOAuthClientConfig,
  saveOAuthClientConfig,
  buildOAuthAuthorizeUrl,
  getOAuthRedirectUri,
  processOAuthCallbackResult
} from '../services/oauthService';
import {
  X,
  LogIn,
  LogOut,
  Shield,
  User,
  ArrowRight,
  Settings,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  HelpCircle
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
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  // Client ID Configurations
  const [kakaoKey, setKakaoKey] = useState('');
  const [naverKey, setNaverKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getOAuthClientConfig();
      setKakaoKey(cfg.kakaoClientId);
      setNaverKey(cfg.naverClientId);
      setGoogleKey(cfg.googleClientId);
      setStatusMessage(null);
      setConfigSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const redirectUri = getOAuthRedirectUri();

  /** API 키 저장 핸들러 */
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveOAuthClientConfig({
      kakaoClientId: kakaoKey.trim(),
      naverClientId: naverKey.trim(),
      googleClientId: googleKey.trim()
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  /**
   * 공식 소셜 OAuth2 인가 페이지 호출 (실제 네이버, 카카오, 구글 로그인 화면으로 이동)
   */
  const handleSocialAuth = (provider: AuthProvider) => {
    setIsLoading(true);
    setStatusMessage(null);

    // 1. 공식 OAuth2 인가 URL 빌드
    const { url, error } = buildOAuthAuthorizeUrl(provider, activeTab);

    if (error || !url) {
      setStatusMessage({
        type: 'error',
        text: error || '소셜 인증 인가 URL 생성에 실패했습니다.'
      });
      setShowConfig(true); // 키 입력 패널 자동 열림
      setIsLoading(false);
      return;
    }

    // 2. 카카오 사전 설정 가이드 확인 안내
    if (provider === 'kakao') {
      setStatusMessage({
        type: 'info',
        text: '카카오 공식 인증 화면으로 이동합니다. (카카오 개발자 콘솔에서 [카카오 로그인: ON] 필수)'
      });
    } else if (provider === 'naver') {
      setStatusMessage({
        type: 'info',
        text: '네이버 공식 로그인 화면으로 이동합니다.'
      });
    } else if (provider === 'google') {
      setStatusMessage({
        type: 'info',
        text: '구글 공식 계정 선택 화면으로 이동합니다.'
      });
    }

    // 3. 실제 공급자의 공식 OAuth2 로그인/가입 동의 페이지로 리다이렉트
    setTimeout(() => {
      window.location.href = url;
    }, 400);
  };

  /**
   * 개발/테스트용 즉시 체험 시뮬레이션 (API 키 등록 전 화면 플로우 확인용)
   */
  const handleSandboxSimulate = async (provider: AuthProvider) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const result = await processOAuthCallbackResult({
        provider,
        mode: activeTab,
        accessToken: `sandbox_${provider}_tok_${Date.now()}`
      });

      if (result.success && result.user) {
        setStatusMessage({ type: 'success', text: result.message });
        setTimeout(() => {
          onAuthSuccess(result.user!);
          onClose();
        }, 800);
      } else {
        setStatusMessage({ type: 'info', text: result.message });
        setActiveTab('signup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutUser();
      onAuthSuccess(null);
      setStatusMessage({ type: 'success', text: '정상적으로 로그아웃되었습니다.' });
      setTimeout(() => {
        onClose();
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl text-white space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {currentUser ? '내 계정 관리' : activeTab === 'login' ? '소셜 로그인' : '소셜 회원가입 신청'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!currentUser && (
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  showConfig
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                    : 'text-slate-400 hover:text-white border-slate-700/60 hover:bg-slate-800'
                }`}
                title="OAuth Client ID 설정"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser.email || '인증된 트레커'}</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span>계정 인증 상태</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OAuth2 토큰 DB 보전됨</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>최근 로그인</span>
                <span>{currentUser.last_login_at ? new Date(currentUser.last_login_at).toLocaleString() : '-'}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full py-3.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          /* Not Logged In: Mode Selection & Social Buttons */
          <div className="space-y-4">
            {/* Mode Switch Tabs: [로그인] vs [가입 신청] */}
            <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setStatusMessage(null);
                }}
                className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setStatusMessage(null);
                }}
                className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                가입 신청
              </button>
            </div>

            <p className="text-xs text-slate-300 text-center leading-relaxed">
              {activeTab === 'login'
                ? '네이버, 카카오, 구글의 공식 OAuth2 로그인 화면으로 이동합니다.'
                : '공식 OAuth2 표준 동의를 거쳐 가입 신청하며, 토큰은 DB에 보전됩니다.'}
            </p>

            {/* Social Provider Buttons (실제 공식 OAuth2 엔드포인트 호출) */}
            <div className="space-y-2.5 pt-1">
              {/* Naver Button */}
              <button
                type="button"
                onClick={() => handleSocialAuth('naver')}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#03C75A] hover:bg-[#02b350] active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-3 transition-transform shadow-xs cursor-pointer"
              >
                <span className="font-black text-base px-1">N</span>
                <span>네이버로 {activeTab === 'login' ? '로그인' : '가입 신청'}</span>
              </button>

              {/* Kakao Button */}
              <button
                type="button"
                onClick={() => handleSocialAuth('kakao')}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#f5dc00] active:scale-98 text-[#191919] font-bold text-sm flex items-center justify-center gap-3 transition-transform shadow-xs cursor-pointer"
              >
                <span className="font-black text-sm">💬</span>
                <span>카카오로 {activeTab === 'login' ? '로그인' : '가입 신청'}</span>
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
                <span>구글로 {activeTab === 'login' ? '로그인' : '가입 신청'}</span>
              </button>
            </div>

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

            {/* Mode Toggle Link */}
            <div className="pt-2 text-center border-t border-slate-800">
              {activeTab === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setStatusMessage(null);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>아직 계정이 없으신가요? 가입 신청하기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setStatusMessage(null);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>이미 가입하셨나요? 로그인하기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Collapsible OAuth API Keys & Developer Console Setup */}
            {showConfig && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 text-xs text-slate-300 animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span>소셜 OAuth2 Client ID 설정</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Callback URI:</span>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 break-all select-all">
                  {redirectUri}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  * 위 Callback URI를 각 포털 개발자 콘솔의 <strong>Redirect URI</strong>로 등록해야 합니다.
                </p>

                <form onSubmit={handleSaveConfig} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      네이버 Client ID (Naver Developers)
                    </label>
                    <input
                      type="text"
                      placeholder="네이버 개발자센터에서 발급받은 Client ID"
                      value={naverKey}
                      onChange={(e) => setNaverKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      카카오 REST / JavaScript Key (Kakao Developers)
                    </label>
                    <input
                      type="text"
                      placeholder="카카오 개발자 콘솔의 REST API 또는 JS 키"
                      value={kakaoKey}
                      onChange={(e) => setKakaoKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      ⚠️ 카카오 개발자 콘솔 &gt; [카카오 로그인]에서 <strong>[활성화 설정: ON]</strong> 필수 (KOE004 방지)
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      구글 Client ID (Google Cloud Console)
                    </label>
                    <input
                      type="text"
                      placeholder="Google Cloud Console 웹 클라이언트 ID"
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {configSaved ? '✓ 설정 저장 완료' : 'Client ID 설정 저장'}
                  </button>
                </form>

                {/* Sandbox Mock Test Mode */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="block text-[11px] font-bold text-slate-400 mb-1.5">
                    💡 빠른 UI/기능 체험용 (테스트 세션)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSandboxSimulate('naver')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      네이버 테스트
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSandboxSimulate('kakao')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      카카오 테스트
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSandboxSimulate('google')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      구글 테스트
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
