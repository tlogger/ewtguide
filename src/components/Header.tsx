import React, { useState, useMemo } from 'react';
import {
  LogIn,
  User,
  ChevronDown,
  Menu,
  X,
  Search,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react';
import { UserAccount, SectionSummary } from '../types';
import { EastWestIcon } from './EastWestIcon';

interface HeaderProps {
  currentStep: 'title' | 'map';
  onNavigateTitle: () => void;
  completedSectionIds: number[];
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
  allSections?: SectionSummary[];
  currentSectionId?: number | null;
  onSelectSection?: (sectionId: number) => void;
  onOpenSectionDetail?: (sectionId: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onNavigateTitle,
  completedSectionIds,
  currentUser = null,
  onOpenAuth,
  allSections = [],
  currentSectionId,
  onSelectSection,
  onOpenSectionDetail,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOpened, setOnlyOpened] = useState(false);

  const openedCount = useMemo(
    () => allSections.filter((s) => s.is_opened !== false).length,
    [allSections]
  );

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSections.filter((sec) => {
      if (onlyOpened && sec.is_opened === false) return false;
      if (!q) return true;
      return (
        sec.section_number.toLowerCase().includes(q) ||
        sec.region.toLowerCase().includes(q) ||
        sec.title.toLowerCase().includes(q) ||
        sec.course.toLowerCase().includes(q)
      );
    });
  }, [allSections, searchQuery, onlyOpened]);

  if (currentStep === 'title') return null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-sm select-none">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Left: Brand + Quick Section Jump */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onNavigateTitle}
              className="flex items-center gap-1.5 cursor-pointer shrink-0 group"
              title="타이틀 스크린 보기"
            >
              <EastWestIcon size={28} variant="tile" className="group-hover:scale-105 transition-transform" />
              <span className="hidden sm:inline text-sm font-black tracking-tight group-hover:text-emerald-300">
                동서트레일
              </span>
            </button>

            {allSections.length > 0 && onSelectSection && (
              <div className="relative flex items-center">
                <select
                  value={currentSectionId ?? ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val) onSelectSection(val);
                  }}
                  className="appearance-none bg-slate-800/95 hover:bg-slate-700/90 text-emerald-400 font-black text-xs sm:text-sm pl-2.5 pr-6 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[155px] sm:max-w-[220px] truncate"
                  title="구간 바로 이동"
                >
                  <option value="" className="bg-slate-900 text-slate-300">
                    전체 55개 구간
                  </option>
                  {allSections.map((s) => (
                    <option
                      key={s.section_id}
                      value={s.section_id}
                      className="bg-slate-900 text-white font-semibold"
                    >
                      {s.section_number} ({s.region.replace(/,/g, ' ').trim().split(/\s+/)[0]})
                      {s.is_opened === false ? ' [미개통]' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-300">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Section Explorer Drawer + Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="구간 검색 · 완주 현황 · 앱 다운로드"
            >
              <Menu className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">구간·완주 ({completedSectionIds.length}/{openedCount || 32})</span>
            </button>

            {onOpenAuth && (
              <div className="pl-1 border-l border-slate-800/80">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="p-1 sm:p-1.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-emerald-500/50 text-slate-200 flex items-center justify-center cursor-pointer"
                    title={`${currentUser.name || currentUser.email} (${currentUser.provider}) 계정 관리`}
                  >
                    {currentUser.profile_image ? (
                      <img
                        src={currentUser.profile_image}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-400/60"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-emerald-600/30 flex items-center justify-center border border-emerald-500/50">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="로그인"
                  >
                    <LogIn className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">로그인</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-Over Section Explorer, Completion Dashboard & APK Download Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm h-full bg-slate-950 text-slate-100 shadow-2xl border-l border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">55개 구간 탐색 & 완주 현황</h2>
                <p className="text-xs text-emerald-400 font-bold">
                  완주 {completedSectionIds.length} / 개통 {openedCount || 32}구간 (전체 {allSections.length}구간)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-800 flex flex-col gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="구간 번호, 지역명, 코스 검색..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyOpened}
                  onChange={(e) => setOnlyOpened(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-600 text-emerald-500"
                />
                <span>개통 구간만 보기 ({openedCount}개)</span>
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {filteredSections.map((sec) => {
                const isDone = completedSectionIds.includes(sec.section_id);
                return (
                  <div
                    key={sec.section_id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSection?.(sec.section_id);
                        setIsDrawerOpen(false);
                      }}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white">{sec.section_number}</span>
                        <span className="text-xs text-slate-400 truncate">{sec.region}</span>
                        {sec.is_opened === false && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                            미개통
                          </span>
                        )}
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {sec.official_distance_km} km · +{sec.elevation_gain_m}m
                      </div>
                    </button>
                    {onOpenSectionDetail && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenSectionDetail(sec.section_id);
                          setIsDrawerOpen(false);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer shrink-0"
                        title="구간 상세"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Android APK Download Banner (inherited from SectionListView) */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/80">
              <a
                href={`${import.meta.env.BASE_URL}ewtguide.apk`}
                download="ewtguide.apk"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Android 앱 (APK) 다운로드</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
