import React, { useState, useEffect } from 'react';
import { SectionSummary, SectionDetail, TrekProgress, POI, UserAccount } from './types';
import { Header } from './components/Header';
import { TitleScreenView } from './views/TitleScreenView';
import { SectionListView } from './views/SectionListView';
import { SectionDetailView } from './views/SectionDetailView';
import { TrailMapView } from './views/TrailMapView';
import { AllSectionsMapView } from './views/AllSectionsMapView';
import { CertificationModal } from './components/CertificationModal';
import { AuthModal } from './components/AuthModal';
import {
  loadTrekProgress,
  toggleSectionCompletion,
  addCheckpoint,
  removeCheckpoint
} from './services/storage';
import {
  loadSectionFacilities,
  saveFacilityToDb,
  deleteFacilityFromDb,
  getCurrentUser,
  signOutUser
} from './services/facilityDb';
import {
  parseOAuthCallback,
  processOAuthCallbackResult,
  parseAppDeepLink
} from './services/oauthService';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'title' | 'list' | 'detail' | 'map' | 'all_map'>(() => {
    return localStorage.getItem('ewtguide_skip_title') === 'true' ? 'list' : 'title';
  });
  const [sectionsSummary, setSectionsSummary] = useState<SectionSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSectionDetail, setSelectedSectionDetail] = useState<SectionDetail | null>(null);
  const [progress, setProgress] = useState<TrekProgress>(loadTrekProgress());
  const [userFacilities, setUserFacilities] = useState<POI[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authToast, setAuthToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Listen for user auth changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setCurrentUser(e.detail || null);
    };
    window.addEventListener('ewtguide_auth_changed', handleAuthChange);
    return () => window.removeEventListener('ewtguide_auth_changed', handleAuthChange);
  }, []);

  // Handle incoming OAuth callback from Naver, Kakao, or Google
  useEffect(() => {
    const callbackData = parseOAuthCallback();
    if (callbackData) {
      // 즉시 URL 해시 및 쿼리 파라미터 정격 제거하여 브라우저 재진입 루프 원천 차단
      window.history.replaceState({}, document.title, window.location.pathname);

      processOAuthCallbackResult(callbackData).then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
          setCurrentStep('list'); // 로그인/가입 완료 시 코스 목록 화면으로 바로 이동
          setIsAuthModalOpen(false);
        }
        setAuthToast({ text: res.message, type: res.success ? 'success' : 'error' });
        setTimeout(() => setAuthToast(null), 4500);

        if (!res.success) {
          setIsAuthModalOpen(true);
        }
      });
    }
  }, []);

  // Handle native mobile app deep link (com.ewtguide.app://oauth?...)
  useEffect(() => {
    let sub: any = null;
    try {
      sub = CapApp.addListener('appUrlOpen', async (data) => {
        if (!data || !data.url) return;
        if (data.url.startsWith('com.ewtguide.app://oauth')) {
          try {
            await Browser.close();
          } catch {}

          const callbackData = parseAppDeepLink(data.url);
          if (callbackData) {
            processOAuthCallbackResult(callbackData).then((res) => {
              if (res.user) {
                setCurrentUser(res.user);
                setCurrentStep('list');
                setIsAuthModalOpen(false);
              }
              setAuthToast({ text: res.message, type: res.success ? 'success' : 'error' });
              setTimeout(() => setAuthToast(null), 4500);

              if (!res.success) {
                setIsAuthModalOpen(true);
              }
            });
          }
        }
      });
    } catch (e) {
      console.warn('Capacitor App listener not active:', e);
    }

    return () => {
      if (sub && typeof sub.then === 'function') {
        sub.then((s: any) => s.remove && s.remove());
      }
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setAuthToast({ text: '정상적으로 로그아웃되었습니다.', type: 'info' });
    setTimeout(() => setAuthToast(null), 3000);
  };

  // Load summary on mount
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sections_summary.json?v=20261028_v3`)
      .then((res) => res.json())
      .then((data: SectionSummary[]) => {
        setSectionsSummary(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load sections summary:', err);
        setIsLoading(false);
      });
  }, []);

  // Load detail when section selected
  const handleSelectSection = async (sectionId: number) => {
    setIsLoading(true);
    setSelectedSectionId(sectionId);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/sections/section_${sectionId}.json?v=20261028_v5`);
      const detail: SectionDetail = await res.json();
      setSelectedSectionDetail(detail);
      
      // Supabase 중앙 DB 연동 및 병합 시설 로드
      const facilities = await loadSectionFacilities(sectionId, detail.pois || []);
      setUserFacilities(facilities);
      
      setCurrentStep('detail');
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load section detail:', err);
      setIsLoading(false);
    }
  };

  const handleOpenSectionMap = async (sectionId: number) => {
    setIsLoading(true);
    setSelectedSectionId(sectionId);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/sections/section_${sectionId}.json?v=20261028_v5`);
      const detail: SectionDetail = await res.json();
      setSelectedSectionDetail(detail);
      
      // Supabase 중앙 DB 연동 및 병합 시설 로드
      const facilities = await loadSectionFacilities(sectionId, detail.pois || []);
      setUserFacilities(facilities);
      
      setCurrentStep('map');
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load section map:', err);
      setIsLoading(false);
    }
  };

  const handleToggleComplete = (sectionId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = toggleSectionCompletion(sectionId);
    setProgress({ ...updated });
  };

  const handleAddCheckpoint = (name: string) => {
    if (!selectedSectionId || !selectedSectionDetail) return;
    const lat = selectedSectionDetail.start_point?.lat || 36.5;
    const lng = selectedSectionDetail.start_point?.lng || 126.8;
    const updated = addCheckpoint(selectedSectionId, { lat, lng, name });
    setProgress({ ...updated });
  };

  const handleRemoveCheckpoint = (cpId: string) => {
    if (!selectedSectionId) return;
    const updated = removeCheckpoint(selectedSectionId, cpId);
    setProgress({ ...updated });
  };

  const handleAddFacility = async (fac: POI) => {
    if (!selectedSectionId) return;
    const saved = await saveFacilityToDb(selectedSectionId, fac);
    setUserFacilities((prev) => {
      const exists = prev.some((f) => f.id === saved.id);
      return exists
        ? prev.map((f) => (f.id === saved.id ? saved : f))
        : [saved, ...prev];
    });
  };

  const handleRemoveFacility = async (facilityOrId: string | POI) => {
    if (!selectedSectionId) return;
    const targetId = typeof facilityOrId === 'string' ? facilityOrId : facilityOrId.id;
    const targetObj = typeof facilityOrId === 'object'
      ? facilityOrId
      : userFacilities.find((f) => f.id === targetId);

    if (targetObj) {
      await deleteFacilityFromDb(selectedSectionId, targetObj);
    } else if (targetId) {
      await deleteFacilityFromDb(selectedSectionId, { id: targetId, name: '', category: 'other' });
    }

    if (targetId) {
      setUserFacilities((prev) => prev.filter((f) => f.id !== targetId));
    }
  };

  const getHeaderTitle = () => {
    if (currentStep === 'all_map') {
      return '전체 지도';
    }
    if (currentStep === 'map' && selectedSectionDetail) {
      return `${selectedSectionDetail.section_number} 지도`;
    }
    if (currentStep === 'detail' && selectedSectionDetail) {
      return `${selectedSectionDetail.section_number} 상세`;
    }
    return '동서트레일 가이드';
  };

  // 1. Title Screen View (Immersive illustrated map artwork)
  if (currentStep === 'title') {
    return (
      <TitleScreenView
        onStartList={() => {
          setCurrentStep('list');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenMap={() => {
          setCurrentStep('all_map');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        totalDistance="867.1"
        totalSections={55}
        openedSectionsCount={32}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />
    );
  }

  // 2. Main Application Flow (List, Detail, Map, All-Map)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-12 sm:pb-0">
      <Header
        currentStep={currentStep}
        onNavigate={(step) => {
          if (step === 'list') {
            setSelectedSectionId(null);
            setSelectedSectionDetail(null);
          }
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        sectionNumber={selectedSectionDetail?.section_number}
        completedCount={progress.completedSections.length}
        totalCount={sectionsSummary.length || 55}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-gray-500">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">데이터를 불러오는 중입니다...</p>
          </div>
        ) : currentStep === 'list' ? (
          <SectionListView
            sections={sectionsSummary}
            progress={progress}
            onSelectSection={handleSelectSection}
            onOpenSectionMap={handleOpenSectionMap}
            onToggleComplete={handleToggleComplete}
            onOpenAllMap={() => setCurrentStep('all_map')}
          />
        ) : currentStep === 'all_map' ? (
          <AllSectionsMapView
            onBack={() => setCurrentStep('list')}
            onSelectSection={handleSelectSection}
            onOpenSectionMap={handleOpenSectionMap}
            summaryList={sectionsSummary}
          />
        ) : currentStep === 'detail' && selectedSectionDetail ? (
          <SectionDetailView
            section={selectedSectionDetail}
            allSections={sectionsSummary}
            isCompleted={progress.completedSections.includes(selectedSectionDetail.section_id)}
            checkpoints={progress.checkpoints[selectedSectionDetail.section_id] || []}
            userFacilities={userFacilities}
            onOpenMap={() => setCurrentStep('map')}
            onOpenCertify={() => setIsCertModalOpen(true)}
            onAddFacility={handleAddFacility}
            onRemoveFacility={handleRemoveFacility}
            onAddCheckpoint={handleAddCheckpoint}
            onRemoveCheckpoint={handleRemoveCheckpoint}
            onNavigateSection={handleSelectSection}
          />
        ) : currentStep === 'map' && selectedSectionDetail ? (
          <TrailMapView
            section={selectedSectionDetail}
            allSections={sectionsSummary}
            userFacilities={userFacilities}
            onAddFacility={handleAddFacility}
            onRemoveFacility={handleRemoveFacility}
            onNavigateSection={handleOpenSectionMap}
            onBackToDetail={() => setCurrentStep('detail')}
          />
        ) : null}
      </main>

      {/* Global Auth Toast */}
      {authToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border animate-in slide-in-from-top-4 duration-200 max-w-sm w-full mx-4 select-none bg-slate-900/95 text-white border-slate-700">
          <span>{authToast.type === 'success' ? '✅' : authToast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span className="flex-1">{authToast.text}</span>
          <button
            onClick={() => setAuthToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Auth Modal (Login / Sign Up / Token Preservation) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Certification Modal */}
      {selectedSectionDetail && (
        <CertificationModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          sectionNumber={selectedSectionDetail.section_number}
          sectionTitle={selectedSectionDetail.title}
          isCompleted={progress.completedSections.includes(selectedSectionDetail.section_id)}
          onToggleComplete={() => handleToggleComplete(selectedSectionDetail.section_id)}
        />
      )}
    </div>
  );
};

export default App;
