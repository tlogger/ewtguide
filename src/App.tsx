import React, { useState, useEffect, useCallback } from 'react';
import { SectionSummary, TrekProgress, UserAccount } from './types';
import { Header } from './components/Header';
import { TitleScreenView } from './views/TitleScreenView';
import { UnifiedMapView } from './views/UnifiedMapView';
import { CertificationModal } from './components/CertificationModal';
import { AuthModal } from './components/AuthModal';
import {
  loadTrekProgress,
  toggleSectionCompletion,
  addCheckpoint,
  removeCheckpoint,
} from './services/storage';
import { getCurrentUser } from './services/facilityDb';
import {
  parseOAuthCallback,
  processOAuthCallbackResult,
  parseAppDeepLink,
} from './services/oauthService';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'title' | 'map'>(() => {
    return localStorage.getItem('ewtguide_skip_title') === 'true' ? 'map' : 'title';
  });
  const [sectionsSummary, setSectionsSummary] = useState<SectionSummary[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [focusSectionId, setFocusSectionId] = useState<number | null>(null);
  const [detailRequestSectionId, setDetailRequestSectionId] = useState<number | null>(null);
  const [certSectionId, setCertSectionId] = useState<number | null>(null);
  const [progress, setProgress] = useState<TrekProgress>(() => loadTrekProgress());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      setCurrentUser((e as CustomEvent).detail || null);
    };
    window.addEventListener('ewtguide_auth_changed', handleAuthChange);
    return () => window.removeEventListener('ewtguide_auth_changed', handleAuthChange);
  }, []);

  // Web OAuth callback -> route directly to unified map
  useEffect(() => {
    const callbackData = parseOAuthCallback();
    if (callbackData) {
      window.history.replaceState({}, document.title, window.location.pathname);
      processOAuthCallbackResult(callbackData).then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
          setCurrentStep('map');
          setIsAuthModalOpen(false);
        }
        showToast(res.message, res.success ? 'success' : 'error');
        if (!res.success) {
          setIsAuthModalOpen(true);
        }
      });
    }
  }, [showToast]);

  // Native deep link OAuth callback -> route directly to unified map
  useEffect(() => {
    let sub: Promise<{ remove?: () => void }> | null = null;
    try {
      sub = CapApp.addListener('appUrlOpen', async (data) => {
        if (!data?.url?.startsWith('com.ewtguide.app://oauth')) return;
        try {
          await Browser.close();
        } catch {
          // ignore
        }
        const callbackData = parseAppDeepLink(data.url);
        if (callbackData) {
          processOAuthCallbackResult(callbackData).then((res) => {
            if (res.user) {
              setCurrentUser(res.user);
              setCurrentStep('map');
              setIsAuthModalOpen(false);
            }
            showToast(res.message, res.success ? 'success' : 'error');
            if (!res.success) {
              setIsAuthModalOpen(true);
            }
          });
        }
      });
    } catch {
      // non-native environment
    }
    return () => {
      sub?.then((s) => s.remove?.());
    };
  }, [showToast]);

  // Load 55-section static summary once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sections_summary.json`)
      .then((res) => res.json())
      .then((data: SectionSummary[]) => setSectionsSummary(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load sections summary:', err));
  }, []);

  const certSectionSummary = certSectionId
    ? sectionsSummary.find((s) => s.section_id === certSectionId) || null
    : null;

  const handleAddCheckpoint = (sectionId: number, name: string) => {
    const sec = sectionsSummary.find((s) => s.section_id === sectionId);
    const lat = sec?.start_point?.lat ?? 36.5;
    const lng = sec?.start_point?.lng ?? 127.5;
    const updated = addCheckpoint(sectionId, { lat, lng, name });
    setProgress({ ...updated });
  };

  const handleRemoveCheckpoint = (sectionId: number, cpId: string) => {
    const updated = removeCheckpoint(sectionId, cpId);
    setProgress({ ...updated });
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col">
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold text-white ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'success'
              ? 'bg-emerald-600'
              : 'bg-slate-800'
          }`}
        >
          {toast.text}
        </div>
      )}

      {currentStep === 'title' ? (
        <TitleScreenView
          onStartMap={() => setCurrentStep('map')}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      ) : (
        <>
          <Header
            currentStep={currentStep}
            onNavigateTitle={() => setCurrentStep('title')}
            completedSectionIds={progress.completedSections}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            allSections={sectionsSummary}
            currentSectionId={activeSectionId}
            onSelectSection={(sectionId) => setFocusSectionId(sectionId)}
            onOpenSectionDetail={(sectionId) => setDetailRequestSectionId(sectionId)}
          />

          <UnifiedMapView
            sectionsSummary={sectionsSummary}
            progress={progress}
            focusSectionId={focusSectionId}
            detailRequestSectionId={detailRequestSectionId}
            onClearDetailRequest={() => setDetailRequestSectionId(null)}
            onActiveSectionChange={setActiveSectionId}
            onOpenCertModal={(sectionId) => setCertSectionId(sectionId)}
            onAddCheckpoint={handleAddCheckpoint}
            onRemoveCheckpoint={handleRemoveCheckpoint}
            onToast={showToast}
          />
        </>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          if (user) {
            showToast(`${user.name || '트레커'}님 환영합니다.`, 'success');
          } else {
            showToast('정상적으로 로그아웃되었습니다.', 'info');
          }
        }}
      />

      {certSectionSummary && (
        <CertificationModal
          isOpen={certSectionId !== null}
          onClose={() => setCertSectionId(null)}
          sectionNumber={certSectionSummary.section_number}
          sectionTitle={certSectionSummary.title}
          isCompleted={progress.completedSections.includes(certSectionSummary.section_id)}
          onToggleComplete={() => {
            const updated = toggleSectionCompletion(certSectionSummary.section_id);
            setProgress({ ...updated });
          }}
        />
      )}
    </div>
  );
};

export default App;
