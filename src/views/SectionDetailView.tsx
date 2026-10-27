import React, { useState } from 'react';
import { SectionDetail, POI, Checkpoint } from '../types';
import { ElevationChart } from '../components/ElevationChart';
import { TaxiCallCard } from '../components/TaxiCallCard';
import { FacilityModal } from '../components/FacilityModal';
import {
  Map,
  Award,
  Clock,
  TrendingUp,
  MapPin,
  PlusCircle,
  Phone,
  BookmarkCheck,
  CheckCircle2
} from 'lucide-react';

interface SectionDetailViewProps {
  section: SectionDetail;
  isCompleted: boolean;
  checkpoints: Checkpoint[];
  userFacilities: POI[];
  onOpenMap: () => void;
  onOpenCertify: () => void;
  onAddFacility: (facility: POI) => void;
  onAddCheckpoint: (name: string) => void;
  onRemoveCheckpoint: (id: string) => void;
}

export const SectionDetailView: React.FC<SectionDetailViewProps> = ({
  section,
  isCompleted,
  checkpoints,
  userFacilities,
  onOpenMap,
  onOpenCertify,
  onAddFacility,
  onAddCheckpoint,
  onRemoveCheckpoint
}) => {
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [newCpName, setNewCpName] = useState('');
  const [showCpInput, setShowCpInput] = useState(false);

  // Estimate walking time: 3.2 km/h senior pace + 10 mins per 100m climb
  const estimatedHours = (
    section.official_distance_km / 3.2 +
    (section.elevation_gain_m / 100) * (10 / 60)
  ).toFixed(1);

  // Difficulty rating
  const difficulty =
    section.elevation_gain_m > 700 || section.official_distance_km > 18
      ? { label: '상급 (힘든 코스)', color: 'text-red-700 bg-red-50 border-red-200' }
      : section.elevation_gain_m > 350 || section.official_distance_km > 14
      ? { label: '중급 (보통 코스)', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      : { label: '초급 (완만한 코스)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };

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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-800">
              {section.section_number}
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              {section.region}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficulty.color}`}>
              {difficulty.label}
            </span>
          </div>

          <button
            onClick={onOpenCertify}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm shadow-xs transition-transform active:scale-95 ${
              isCompleted
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{isCompleted ? '완주 달성! 🎉' : '완주 인증하기'}</span>
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 mb-3">
          {section.title}
        </h2>

        {/* 3-Step Primary Action Button (Open Map) */}
        <div className="pt-2">
          <button
            onClick={onOpenMap}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-lg rounded-2xl shadow-lg transition-transform active:scale-99 flex items-center justify-center gap-2"
          >
            <Map className="w-6 h-6" />
            <span>코스 지도 전체화면 보기 (3단계)</span>
          </button>
        </div>
      </div>

      {/* Course Core Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium mb-1">공식 거리</div>
          <div className="text-xl font-extrabold text-gray-900">
            {section.official_distance_km} <span className="text-xs font-normal">km</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>예상 소요시간</span>
          </div>
          <div className="text-xl font-extrabold text-gray-900">
            약 {estimatedHours} <span className="text-xs font-normal">시간</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>총 상승 고도</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-700">
            +{section.elevation_gain_m} <span className="text-xs font-normal">m</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium mb-1">최고 / 최저 고도</div>
          <div className="text-base font-extrabold text-gray-900 mt-1">
            {section.max_elevation_m}m / {section.min_elevation_m}m
          </div>
        </div>
      </div>

      {/* Course Route Timeline */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <span>주요 경유지 노선</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {waypoints.map((wp, idx) => (
            <React.Fragment key={idx}>
              <span
                className={`px-3 py-1.5 rounded-xl font-semibold ${
                  idx === 0
                    ? 'bg-emerald-600 text-white'
                    : idx === waypoints.length - 1
                    ? 'bg-teal-700 text-white'
                    : 'bg-gray-100 text-gray-800'
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

      {/* Interactive Elevation Profile */}
      <ElevationChart
        points={section.points}
        gain={section.elevation_gain_m}
        loss={section.elevation_loss_m}
        minEle={section.min_elevation_m}
        maxEle={section.max_elevation_m}
      />

      {/* Call Taxi / Emergency Escape Card */}
      <TaxiCallCard region={section.region} />

      {/* Multi-Checkpoint (이어걷기 중단점) Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-600" />
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
              placeholder="예: 3구간 중간 풍전저수지 앞 버스정류장"
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
              className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"
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

      {/* Facilities & Community Wiki */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🏪</span>
              <span>편의시설 & 안내 ({allFacilities.length}개소)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              공식 안내소 및 동료 트레커들이 등록한 편의시설 목록입니다
            </p>
          </div>
          <button
            onClick={() => setIsFacilityModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>새 시설 직접 등록</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { key: 'all', label: '전체' },
            { key: 'shelter', label: '쉼터' },
            { key: 'toilet', label: '화장실' },
            { key: 'restaurant', label: '식당' },
            { key: 'lodging', label: '숙소' },
            { key: 'mart', label: '마트' },
            { key: 'transport', label: '교통' },
            { key: 'cert_center', label: '인증/안내' }
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                activeCategory === cat.key
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
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
                      className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{fac.phone}</span>
                    </a>
                  )}
                </div>

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

      {/* Facility Registration Modal */}
      <FacilityModal
        isOpen={isFacilityModalOpen}
        onClose={() => setIsFacilityModalOpen(false)}
        onSubmit={onAddFacility}
        lat={section.start_point.lat}
        lng={section.start_point.lng}
      />
    </div>
  );
};
