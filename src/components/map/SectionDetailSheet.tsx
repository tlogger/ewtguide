import React from 'react';
import { X } from 'lucide-react';
import type { SectionDetail, SectionSummary, TrekProgress, POI } from '../../types';
import { SectionDetailView } from '../../views/SectionDetailView';

interface SectionDetailSheetProps {
  isOpen: boolean;
  section: SectionDetail | null;
  allSections: SectionSummary[];
  progress: TrekProgress;
  facilities: POI[];
  onClose: () => void;
  onNavigateSection: (sectionId: number) => void;
  onOpenCertModal: () => void;
  onFocusOnMap: (sectionId: number) => void;
  onAddFacility: (facility: POI) => void;
  onRemoveFacility: (facilityId: string) => void;
  onAddCheckpoint: (sectionId: number, name: string) => void;
  onRemoveCheckpoint: (sectionId: number, cpId: string) => void;
}

export const SectionDetailSheet: React.FC<SectionDetailSheetProps> = ({
  isOpen,
  section,
  allSections,
  progress,
  facilities,
  onClose,
  onNavigateSection,
  onOpenCertModal,
  onFocusOnMap,
  onAddFacility,
  onRemoveFacility,
  onAddCheckpoint,
  onRemoveCheckpoint,
}) => {
  if (!isOpen || !section) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-2xl h-[92dvh] sm:h-[88vh] bg-gray-50 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="font-black text-base truncate">
            {section.section_number} 상세 정보
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4">
          <SectionDetailView
            section={section}
            allSections={allSections}
            isCompleted={progress.completedSections.includes(section.section_id)}
            checkpoints={progress.checkpoints[section.section_id] || []}
            userFacilities={facilities}
            onOpenMap={() => {
              onFocusOnMap(section.section_id);
              onClose();
            }}
            onOpenCertify={onOpenCertModal}
            onAddFacility={onAddFacility}
            onRemoveFacility={onRemoveFacility}
            onAddCheckpoint={(name) => onAddCheckpoint(section.section_id, name)}
            onRemoveCheckpoint={(cpId) => onRemoveCheckpoint(section.section_id, cpId)}
            onNavigateSection={onNavigateSection}
          />
        </div>
      </div>
    </div>
  );
};
