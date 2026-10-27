import React, { useState, useEffect } from 'react';
import { SectionSummary, SectionDetail, TrekProgress, POI } from './types';
import { Header } from './components/Header';
import { SectionListView } from './views/SectionListView';
import { SectionDetailView } from './views/SectionDetailView';
import { TrailMapView } from './views/TrailMapView';
import { CertificationModal } from './components/CertificationModal';
import {
  loadTrekProgress,
  toggleSectionCompletion,
  addCheckpoint,
  removeCheckpoint,
  loadUserFacilities,
  addUserFacility
} from './services/storage';

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'list' | 'detail' | 'map'>('list');
  const [sectionsSummary, setSectionsSummary] = useState<SectionSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSectionDetail, setSelectedSectionDetail] = useState<SectionDetail | null>(null);
  const [progress, setProgress] = useState<TrekProgress>(loadTrekProgress());
  const [userFacilities, setUserFacilities] = useState<POI[]>([]);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load summary on mount
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sections_summary.json`)
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
  const handleSelectSection = (sectionId: number) => {
    setIsLoading(true);
    setSelectedSectionId(sectionId);
    fetch(`${import.meta.env.BASE_URL}data/sections/section_${sectionId}.json`)
      .then((res) => res.json())
      .then((detail: SectionDetail) => {
        setSelectedSectionDetail(detail);
        setUserFacilities(loadUserFacilities(sectionId));
        setCurrentStep('detail');
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch((err) => {
        console.error('Failed to load section detail:', err);
        setIsLoading(false);
      });
  };

  const handleToggleComplete = (sectionId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = toggleSectionCompletion(sectionId);
    setProgress({ ...updated });
  };

  const handleAddCheckpoint = (name: string) => {
    if (!selectedSectionId || !selectedSectionDetail) return;
    const lat = selectedSectionDetail.start_point.lat;
    const lng = selectedSectionDetail.start_point.lng;
    const updated = addCheckpoint(selectedSectionId, { lat, lng, name });
    setProgress({ ...updated });
  };

  const handleRemoveCheckpoint = (cpId: string) => {
    if (!selectedSectionId) return;
    const updated = removeCheckpoint(selectedSectionId, cpId);
    setProgress({ ...updated });
  };

  const handleAddFacility = (fac: POI) => {
    if (!selectedSectionId) return;
    const updated = addUserFacility(selectedSectionId, fac);
    setUserFacilities(updated);
  };

  const getHeaderTitle = () => {
    if (currentStep === 'map' && selectedSectionDetail) {
      return `${selectedSectionDetail.section_number} 지도 보기`;
    }
    if (currentStep === 'detail' && selectedSectionDetail) {
      return `${selectedSectionDetail.section_number} 상세 안내`;
    }
    return '동서트레일 가이드';
  };

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
        title={getHeaderTitle()}
        completedCount={progress.completedSections.length}
        totalCount={sectionsSummary.length || 32}
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
            onToggleComplete={handleToggleComplete}
          />
        ) : currentStep === 'detail' && selectedSectionDetail ? (
          <SectionDetailView
            section={selectedSectionDetail}
            isCompleted={progress.completedSections.includes(selectedSectionDetail.section_id)}
            checkpoints={progress.checkpoints[selectedSectionDetail.section_id] || []}
            userFacilities={userFacilities}
            onOpenMap={() => setCurrentStep('map')}
            onOpenCertify={() => setIsCertModalOpen(true)}
            onAddFacility={handleAddFacility}
            onAddCheckpoint={handleAddCheckpoint}
            onRemoveCheckpoint={handleRemoveCheckpoint}
          />
        ) : currentStep === 'map' && selectedSectionDetail ? (
          <TrailMapView
            section={selectedSectionDetail}
            userFacilities={userFacilities}
            onAddFacility={handleAddFacility}
            onBackToDetail={() => setCurrentStep('detail')}
          />
        ) : null}
      </main>

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
