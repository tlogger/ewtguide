import React from 'react';
import { FacilityCategory } from '../types';
import {
  Camera,
  Utensils,
  CarTaxiFront,
  Tent,
  Info,
  ShoppingBag,
  MapPin,
  HelpCircle
} from 'lucide-react';

export interface CategoryMeta {
  key: FacilityCategory;
  label: string;
  subLabel?: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  activeBgClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORY_DEFINITIONS: Record<FacilityCategory, CategoryMeta> = {
  viewpoint: {
    key: 'viewpoint',
    label: '명소',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-400',
    activeBgClass: 'bg-amber-600 text-white',
    icon: Camera
  },
  restaurant: {
    key: 'restaurant',
    label: '음식료',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-600',
    borderClass: 'border-orange-400',
    activeBgClass: 'bg-orange-600 text-white',
    icon: Utensils
  },
  transport: {
    key: 'transport',
    label: '교통',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-400',
    activeBgClass: 'bg-blue-600 text-white',
    icon: CarTaxiFront
  },
  lodging: {
    key: 'lodging',
    label: '숙소/야영',
    bgClass: 'bg-emerald-600',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-500',
    activeBgClass: 'bg-emerald-700 text-white',
    icon: Tent
  },
  cert_center: {
    key: 'cert_center',
    label: '안내소',
    bgClass: 'bg-indigo-600',
    textClass: 'text-indigo-600',
    borderClass: 'border-indigo-400',
    activeBgClass: 'bg-indigo-700 text-white',
    icon: Info
  },
  mart: {
    key: 'mart',
    label: '마트',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-600',
    borderClass: 'border-rose-400',
    activeBgClass: 'bg-rose-600 text-white',
    icon: ShoppingBag
  },
  toilet: {
    key: 'toilet',
    label: '화장실',
    bgClass: 'bg-cyan-600',
    textClass: 'text-cyan-600',
    borderClass: 'border-cyan-400',
    activeBgClass: 'bg-cyan-700 text-white',
    icon: () => (
      <span className="font-black text-[13px] leading-none select-none tracking-tighter">WC</span>
    )
  },
  other: {
    key: 'other',
    label: '기타',
    bgClass: 'bg-slate-500',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-400',
    activeBgClass: 'bg-slate-700 text-white',
    icon: MapPin
  },
  shelter: {
    key: 'shelter',
    label: '기타',
    bgClass: 'bg-slate-500',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-400',
    activeBgClass: 'bg-slate-700 text-white',
    icon: HelpCircle
  }
};

/** 사용자가 선택 가능한 카테고리 목록 (쉼터/정자 제외) */
export const SELECTABLE_CATEGORIES: CategoryMeta[] = [
  CATEGORY_DEFINITIONS.viewpoint,
  CATEGORY_DEFINITIONS.restaurant,
  CATEGORY_DEFINITIONS.transport,
  CATEGORY_DEFINITIONS.lodging,
  CATEGORY_DEFINITIONS.cert_center,
  CATEGORY_DEFINITIONS.mart,
  CATEGORY_DEFINITIONS.toilet,
  CATEGORY_DEFINITIONS.other
];

interface CategoryIconProps {
  category: FacilityCategory;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'solid' | 'outline' | 'ghost';
  selected?: boolean;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 'md',
  variant = 'solid',
  selected,
  className = ''
}) => {
  const meta = CATEGORY_DEFINITIONS[category] || CATEGORY_DEFINITIONS.other;
  const IconComp = meta.icon;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs p-1',
    md: 'w-8 h-8 text-sm p-1.5',
    lg: 'w-10 h-10 text-base p-2',
    xl: 'w-12 h-12 text-lg p-2.5'
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }[size];

  let styleClasses = '';
  if (selected !== undefined) {
    // 토글 모드
    styleClasses = selected
      ? `${meta.bgClass} text-white shadow-md ring-2 ring-offset-2 ring-emerald-500 scale-105`
      : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600';
  } else if (variant === 'solid') {
    styleClasses = `${meta.bgClass} text-white shadow-sm`;
  } else if (variant === 'outline') {
    styleClasses = `bg-white ${meta.textClass} border-2 ${meta.borderClass} shadow-xs`;
  } else {
    styleClasses = `bg-slate-100 ${meta.textClass}`;
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center transition-all duration-150 shrink-0 ${sizeClasses} ${styleClasses} ${className}`}
    >
      <IconComp className={iconSizes} />
    </div>
  );
};
