import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Mountain } from 'lucide-react';
import type { SectionDetail, TrailPoint, POI } from '../../types';
import { ElevationChart } from '../ElevationChart';
import { getSavedElevationOpen, saveElevationOpen } from '../../utils/cookieStorage';

interface ElevationDrawerProps {
  sectionDetail: SectionDetail | null;
  sectionPois: POI[];
  onHoverPoint?: (pt: TrailPoint | null) => void;
}

export const ElevationDrawer: React.FC<ElevationDrawerProps> = ({
  sectionDetail,
  sectionPois,
  onHoverPoint,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => getSavedElevationOpen());

  if (!sectionDetail || !sectionDetail.points || sectionDetail.points.length === 0) {
    return null;
  }

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    saveElevationOpen(next);
  };

  return (
    <div className="w-full bg-white border-t border-gray-200 shadow-lg z-20 shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-emerald-600" />
          <span>{sectionDetail.section_number} 고도 프로필</span>
          <span className="text-xs font-semibold text-gray-500">
            (+{sectionDetail.elevation_gain_m}m / -{sectionDetail.elevation_loss_m}m)
          </span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="px-2 pb-3 pt-1 h-44 sm:h-48">
          <ElevationChart
            points={sectionDetail.points}
            pois={sectionPois}
            onHoverPoint={onHoverPoint}
            gain={sectionDetail.elevation_gain_m}
            loss={sectionDetail.elevation_loss_m}
            minEle={sectionDetail.min_elevation_m ?? 0}
            maxEle={sectionDetail.max_elevation_m ?? 500}
          />
        </div>
      )}
    </div>
  );
};
