import React, { useState, useMemo } from 'react';
import { SectionSummary, TrekProgress } from '../types';
import { cleanTrailingCommaInParentheses } from '../utils/cookieStorage';
import {
  Search,
  MapPin,
  TrendingUp,
  CheckCircle,
  Map,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';

interface SectionListViewProps {
  sections: SectionSummary[];
  progress: TrekProgress;
  onSelectSection: (sectionId: number) => void;
  onOpenSectionMap?: (sectionId: number) => void;
  onToggleComplete: (sectionId: number, e: React.MouseEvent) => void;
  onOpenAllMap: () => void;
}

const REGION_GROUPS = [
  { key: 'all', label: '전체 (55)' },
  { key: 'opened', label: '개통 완료 (32)' },
  { key: 'unopened', label: '미개통 (23)' },
  { key: 'chungnam', label: '충남·서해 (1~14)' },
  { key: 'daejeon', label: '대전권 (15~22)' },
  { key: 'central', label: '충북·경북 (23~45)' },
  { key: 'east_sea', label: '영주·봉화·울진 (46~55)' }
];

export const SectionListView: React.FC<SectionListViewProps> = ({
  sections,
  progress,
  onSelectSection,
  onOpenSectionMap,
  onToggleComplete,
  onOpenAllMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  const openedSectionsCount = useMemo(() => {
    return sections.filter((s) => s.is_opened).length;
  }, [sections]);

  const unopenedSectionsCount = useMemo(() => {
    return sections.filter((s) => !s.is_opened).length;
  }, [sections]);

  const totalDistance = useMemo(() => {
    return sections.reduce((acc, s) => acc + s.official_distance_km, 0).toFixed(1);
  }, [sections]);

  const completedDistance = useMemo(() => {
    return sections
      .filter((s) => progress.completedSections.includes(s.section_id))
      .reduce((acc, s) => acc + s.official_distance_km, 0)
      .toFixed(1);
  }, [sections, progress.completedSections]);

  const completionPercent = useMemo(() => {
    const baseCount = openedSectionsCount || 32;
    return Math.round((progress.completedSections.length / baseCount) * 100);
  }, [openedSectionsCount, progress.completedSections]);

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      // Group filter
      if (selectedGroup === 'opened' && !s.is_opened) return false;
      if (selectedGroup === 'unopened' && s.is_opened) return false;
      if (selectedGroup === 'chungnam' && (s.section_id < 1 || s.section_id > 14)) return false;
      if (selectedGroup === 'daejeon' && (s.section_id < 15 || s.section_id > 22)) return false;
      if (selectedGroup === 'central' && (s.section_id < 23 || s.section_id > 45)) return false;
      if (selectedGroup === 'east_sea' && (s.section_id < 46 || s.section_id > 55)) return false;

      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.section_number.toLowerCase().includes(term) ||
        s.region.toLowerCase().includes(term) ||
        s.course.toLowerCase().includes(term) ||
        s.title.toLowerCase().includes(term)
      );
    });
  }, [sections, selectedGroup, searchTerm]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Trekking Dashboard Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full uppercase tracking-wider">
                East-West Trail 55 Sections
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
                동서트레일 대장정 현황
              </h2>
            </div>
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-black text-emerald-300">
                {completionPercent}%
              </div>
              <div className="text-xs text-emerald-200">
                개통 {progress.completedSections.length} / {openedSectionsCount || 32} 구간 완주
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950/60 rounded-full h-3.5 mb-4 overflow-hidden border border-emerald-700/50">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, completionPercent)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm">
            <div className="bg-emerald-900/40 rounded-2xl p-3 border border-emerald-700/40">
              <div className="text-emerald-300 font-medium">총 코스 연장</div>
              <div className="text-lg font-bold">{totalDistance} km <span className="text-xs font-normal text-emerald-200">(55개 구간)</span></div>
            </div>
            <div className="bg-emerald-900/40 rounded-2xl p-3 border border-emerald-700/40">
              <div className="text-emerald-300 font-medium">나의 누적 완주</div>
              <div className="text-lg font-bold text-emerald-300">{completedDistance} km</div>
            </div>
            <div className="bg-emerald-900/40 rounded-2xl p-3 border border-emerald-700/40 col-span-2 sm:col-span-1">
              <div className="text-emerald-300 font-medium">구간 개통 현황</div>
              <div className="text-base font-bold">
                개통 32 <span className="text-xs text-amber-300">· 미개통 {unopenedSectionsCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Action: Open All Sections Map */}
          <div className="mt-4 pt-3 border-t border-emerald-700/40 flex items-center justify-end">
            <button
              onClick={onOpenAllMap}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-900 font-extrabold rounded-2xl shadow-lg flex items-center justify-center text-sm transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <span>전 구간 지도</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Region Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="구간 번호(예: 25구간), 지역명(태안, 보은, 문경, 울진 등), 경유지 검색..."
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-gray-200 shadow-xs text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
          />
        </div>

        {/* Region Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {REGION_GROUPS.map((grp) => {
            const isSelected = selectedGroup === grp.key;
            return (
              <button
                key={grp.key}
                onClick={() => setSelectedGroup(grp.key)}
                className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {grp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
          <span>총 <strong>{filteredSections.length}</strong>개 구간 검색됨</span>
          <span>원하는 구간을 터치하세요</span>
        </div>

        {filteredSections.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">검색 결과와 일치하는 구간이 없습니다.</p>
          </div>
        ) : (
          filteredSections.map((sec) => {
            const isDone = progress.completedSections.includes(sec.section_id);
            const isOpened = sec.is_opened !== false;

            return (
              <div
                key={sec.section_id}
                onClick={() => {
                  if (!isOpened) return;
                  onSelectSection(sec.section_id);
                }}
                className={`group rounded-3xl p-5 border transition-all shadow-xs ${
                  !isOpened
                    ? 'bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed select-none'
                    : isDone
                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-300 cursor-pointer hover:shadow-md'
                    : 'bg-white border-slate-200 hover:border-emerald-400 cursor-pointer hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-12 h-12 rounded-2xl font-black flex items-center justify-center text-base shadow-xs shrink-0 ${
                        isOpened
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-400 text-white'
                      }`}
                    >
                      {sec.section_id}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-extrabold text-lg text-gray-900">
                          {sec.section_number}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                          {cleanTrailingCommaInParentheses(sec.region)}
                        </span>

                        {isOpened ? (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                            개통 완료
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-slate-500" />
                            <span>미개통 · 준비 중</span>
                          </span>
                        )}

                        {isDone && (
                          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold">
                            완주 완료
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[240px] sm:max-w-md">
                          {cleanTrailingCommaInParentheses(sec.course.replace(`${sec.section_number} : `, ''))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOpened && (
                    <button
                      onClick={(e) => onToggleComplete(sec.section_id, e)}
                      title={isDone ? '완주 취소' : '완주 체크'}
                      className={`p-2 rounded-full transition-transform active:scale-90 cursor-pointer ${
                        isDone
                          ? 'text-emerald-600 bg-emerald-100'
                          : 'text-gray-300 hover:text-emerald-500 hover:bg-gray-100'
                      }`}
                    >
                      <CheckCircle className="w-7 h-7" />
                    </button>
                  )}
                </div>

                {/* Section Stats & Direct Action Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs text-gray-600">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div>
                      거리: <strong className="text-gray-900 text-sm">{sec.official_distance_km} km</strong>
                    </div>

                    {sec.hiking_time_text && isOpened && (
                      <div className="flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{sec.hiking_time_text}</span>
                      </div>
                    )}

                    {sec.elevation_gain_m > 0 && isOpened && (
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{sec.elevation_gain_m}m</span>
                      </div>
                    )}

                    {(sec.pois_count ?? sec.poi_count ?? 0) > 0 && isOpened && (
                      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                        시설 {(sec.pois_count ?? sec.poi_count ?? 0)}개
                      </span>
                    )}
                  </div>

                  {isOpened ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* 상세 보기 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSection(sec.section_id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 border border-slate-200/80 transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="구간 상세 정보 보기"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>상세 보기</span>
                      </button>

                      {/* 지도 보기 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenSectionMap) {
                            onOpenSectionMap(sec.section_id);
                          } else {
                            onSelectSection(sec.section_id);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="구간 지도 보기"
                      >
                        <Map className="w-3.5 h-3.5 text-emerald-100" />
                        <span>지도 보기</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">미개통</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
