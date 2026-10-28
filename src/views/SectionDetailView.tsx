import React, { useState } from 'react';
import { SectionDetail, SectionSummary, POI, Checkpoint } from '../types';
import { ElevationChart } from '../components/ElevationChart';
import { TaxiCallCard } from '../components/TaxiCallCard';
import { FacilityModal } from '../components/FacilityModal';
import {
  Map,
  Award,
  Clock,
  TrendingUp,
  TrendingDown,
  MapPin,
  PlusCircle,
  Phone,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Camera,
  X
} from 'lucide-react';

interface SectionDetailViewProps {
  section: SectionDetail;
  allSections: SectionSummary[];
  isCompleted: boolean;
  checkpoints: Checkpoint[];
  userFacilities: POI[];
  onOpenMap: () => void;
  onOpenCertify: () => void;
  onAddFacility: (facility: POI) => void;
  onAddCheckpoint: (name: string) => void;
  onRemoveCheckpoint: (id: string) => void;
  onNavigateSection: (sectionId: number) => void;
}

export const SectionDetailView: React.FC<SectionDetailViewProps> = ({
  section,
  allSections,
  isCompleted,
  checkpoints,
  userFacilities,
  onOpenMap,
  onOpenCertify,
  onAddFacility,
  onAddCheckpoint,
  onRemoveCheckpoint,
  onNavigateSection
}) => {
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [newCpName, setNewCpName] = useState('');
  const [showCpInput, setShowCpInput] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Previous & Next Section Calculation (Only opened sections, automatically skipping unopened sections)
  const openedSections = allSections.filter((s) => s.is_opened !== false);
  const currentOpenedIndex = openedSections.findIndex((s) => s.section_id === section.section_id);
  const prevSection = currentOpenedIndex > 0 ? openedSections[currentOpenedIndex - 1] : null;
  const nextSection = currentOpenedIndex !== -1 && currentOpenedIndex < openedSections.length - 1
    ? openedSections[currentOpenedIndex + 1]
    : null;

  // Scientific hiking time (Munter / Tobler formula)
  // Distance/3.5 + Gain/400 + Loss/800
  const hoursFloat = (section.official_distance_km / 3.5) + (section.elevation_gain_m / 400.0) + (section.elevation_loss_m / 800.0);
  const totalMinutes = Math.round(hoursFloat * 60);
  const hikingHours = Math.floor(totalMinutes / 60);
  const hikingMins = totalMinutes % 60;
  const timeDisplay = `${hikingHours}시간 ${hikingMins}분`;

  // Difficulty rating
  const difficulty =
    section.elevation_gain_m > 700 || section.official_distance_km > 18
      ? { label: '상급 코스', color: 'text-red-700 bg-red-50 border-red-200' }
      : section.elevation_gain_m > 350 || section.official_distance_km > 14
      ? { label: '중급 코스', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      : { label: '초급 코스', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };

  // Combine official and user facilities
  const allFacilities: POI[] = [...userFacilities, ...(section.pois || [])];
  const filteredFacilities = activeCategory === 'all'
    ? allFacilities
    : allFacilities.filter(f => f.category === activeCategory);

  const waypoints = section.course
    .replace(`${section.section_number} : `, '')
    .split(' ~ ')
    .map(w => w.trim());

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      {/* 1. Top Section Prev/Next Navigation Bar with compact Map button */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-2.5 border border-gray-200 shadow-xs text-xs sm:text-sm font-bold">
        {prevSection ? (
          <button
            onClick={() => onNavigateSection(prevSection.section_id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-700" />
            <span className="truncate max-w-[110px] sm:max-w-none">
              이전: {prevSection.section_number}
            </span>
          </button>
        ) : (
          <div className="text-gray-300 px-3 py-2">시작 구간</div>
        )}

        {/* Center: Section Number & Map Button */}
        <div className="flex items-center gap-2">
          <span className="text-emerald-800 font-black text-sm sm:text-base">
            {section.section_number}
          </span>
          <button
            onClick={onOpenMap}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="구간 지도 보기"
          >
            <Map className="w-4 h-4" />
            <span>지도</span>
          </button>
        </div>

        {nextSection ? (
          <button
            onClick={() => onNavigateSection(nextSection.section_id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
          >
            <span className="truncate max-w-[110px] sm:max-w-none">
              다음: {nextSection.section_number}
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-700" />
          </button>
        ) : (
          <div className="text-gray-300 px-3 py-2">종점 구간</div>
        )}
      </div>

      {/* 2. Core Stats Grid with Scientific Hiking Time */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <div className="text-xs text-gray-500 font-bold mb-1">총 구간 거리</div>
          <div className="text-xl font-black text-gray-900">
            {section.official_distance_km} <span className="text-xs font-normal">km</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-orange-200 bg-orange-50/30 shadow-xs">
          <div className="text-xs text-orange-800 font-bold mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>예상 소요시간</span>
          </div>
          <div className="text-xl font-black text-orange-700">
            약 {timeDisplay}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <div className="text-xs text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
            <span>누적 오르막</span>
          </div>
          <div className="text-xl font-black text-orange-600">
            +{section.elevation_gain_m} <span className="text-xs font-normal">m</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <div className="text-xs text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
            <span>누적 내리막</span>
          </div>
          <div className="text-xl font-black text-blue-600">
            -{section.elevation_loss_m} <span className="text-xs font-normal">m</span>
          </div>
        </div>
      </div>

      {/* 4. Course Route Timeline */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-700" />
          <span>주요 경유지 노선</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {waypoints.map((wp, idx) => (
            <React.Fragment key={idx}>
              <span
                className={`px-3 py-1.5 rounded-xl font-bold ${
                  idx === 0
                    ? 'bg-emerald-700 text-white'
                    : idx === waypoints.length - 1
                    ? 'bg-teal-700 text-white'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                {wp}
              </span>
              {idx < waypoints.length - 1 && (
                <span className="text-gray-300 font-bold">➔</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 5. Interactive Elevation Profile with POI Overlay Dots */}
      <ElevationChart
        points={section.points}
        pois={allFacilities}
        gain={section.elevation_gain_m}
        loss={section.elevation_loss_m}
        minEle={section.min_elevation_m || 0}
        maxEle={section.max_elevation_m || 100}
      />

      {/* 6. Call Taxi / Emergency Escape Card */}
      <TaxiCallCard region={section.region} />

      {/* 7. Multi-Checkpoint (이어걷기 중단점) Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-700" />
              <span>이어걷기 중단점 기록 ({checkpoints.length}개)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              코스를 며칠에 나누어 걷는 경우 멈춘 지점을 저장해 두세요
            </p>
          </div>
          <button
            onClick={() => setShowCpInput(!showCpInput)}
            className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200"
          >
            {showCpInput ? '닫기' : '+ 중단점 추가'}
          </button>
        </div>

        {showCpInput && (
          <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
            <input
              type="text"
              placeholder="예: 3구간 중간 저수지 앞 버스정류장"
              value={newCpName}
              onChange={(e) => setNewCpName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white"
            />
            <button
              onClick={() => {
                if (!newCpName.trim()) return;
                onAddCheckpoint(newCpName.trim());
                setNewCpName('');
                setShowCpInput(false);
              }}
              className="w-full py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold"
            >
              현재 위치/지점 저장하기
            </button>
          </div>
        )}

        {checkpoints.length === 0 ? (
          <div className="text-xs text-gray-400 py-2 text-center">
            등록된 중단점이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900">{cp.name}</div>
                  <div className="text-gray-400 text-[10px]">
                    {new Date(cp.timestamp).toLocaleString('ko-KR')}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveCheckpoint(cp.id)}
                  className="text-red-500 hover:text-red-700 font-medium ml-2"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Facilities & Community Wiki */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🏪</span>
              <span>편의시설 & 뷰포인트 ({allFacilities.length}개소)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              공식 안내소, 뷰포인트 및 동료 트레커들이 등록한 편의시설 목록입니다
            </p>
          </div>
          <button
            onClick={() => setIsFacilityModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>새 시설/명소 직접 등록</span>
          </button>
        </div>

        {/* Category Tabs (9 Categories) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { key: 'all', label: '전체' },
            { key: 'viewpoint', label: '📸 뷰포인트' },
            { key: 'shelter', label: '⛺ 쉼터' },
            { key: 'toilet', label: '🚻 화장실' },
            { key: 'restaurant', label: '🍚 식당' },
            { key: 'lodging', label: '🏡 숙소' },
            { key: 'mart', label: '🏪 마트' },
            { key: 'transport', label: '🚕 교통' },
            { key: 'cert_center', label: '🚩 안내' }
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full font-bold transition-colors whitespace-nowrap ${
                activeCategory === cat.key
                  ? 'bg-emerald-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Facilities List */}
        <div className="space-y-3">
          {filteredFacilities.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              해당 분류의 시설 정보가 아직 등록되지 않았습니다.
            </div>
          ) : (
            filteredFacilities.map((fac, idx) => (
              <div
                key={fac.id || idx}
                className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {fac.name}
                    </span>
                    {!fac.is_official ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        사용자 공유
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                        공식
                      </span>
                    )}
                  </div>
                  {fac.phone && (
                    <a
                      href={`tel:${fac.phone}`}
                      className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-bold shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{fac.phone}</span>
                    </a>
                  )}
                </div>

                {/* Photo thumbnail if exists */}
                {fac.photo_url && (
                  <div
                    onClick={() => setPreviewPhoto(fac.photo_url!)}
                    className="w-24 h-24 rounded-xl overflow-hidden border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={fac.photo_url} alt={fac.name} className="w-full h-full object-cover" />
                  </div>
                )}

                {fac.description && (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {fac.description}
                  </p>
                )}
                {fac.memo && (
                  <p className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                    💡 {fac.memo}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 9. Bottom Prev/Next Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-3 border border-gray-200 shadow-xs text-xs sm:text-sm font-bold">
        {prevSection ? (
          <button
            onClick={() => onNavigateSection(prevSection.section_id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-700" />
            <span className="truncate max-w-[130px] sm:max-w-none">
              이전: {prevSection.section_number} ({prevSection.region})
            </span>
          </button>
        ) : (
          <div className="text-gray-300 px-3 py-2">시작 구간 (태안)</div>
        )}

        {nextSection ? (
          <button
            onClick={() => onNavigateSection(nextSection.section_id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
          >
            <span className="truncate max-w-[130px] sm:max-w-none">
              다음: {nextSection.section_number} ({nextSection.region})
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-700" />
          </button>
        ) : (
          <div className="text-gray-300 px-3 py-2">종점 구간 (울진)</div>
        )}
      </div>

      {/* Facility Registration Modal */}
      <FacilityModal
        isOpen={isFacilityModalOpen}
        onClose={() => setIsFacilityModalOpen(false)}
        onSubmit={onAddFacility}
        lat={section.start_point?.lat || 36.5}
        lng={section.start_point?.lng || 126.8}
        defaultSectionName={section.section_number}
      />

      {/* Photo Lightbox Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="relative max-w-xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img src={previewPhoto} alt="확대 사진" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
