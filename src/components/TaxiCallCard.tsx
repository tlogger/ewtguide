import React from 'react';
import { PhoneCall, Car, AlertCircle } from 'lucide-react';

interface TaxiCallCardProps {
  region: string;
}

// Region-specific emergency and dispatch call taxi registry
const TAXI_DIRECTORY: Record<string, { name: string; phone: string; note: string }[]> = {
  '태안군': [
    { name: '태안 모범콜택시', phone: '041-674-8255', note: '안면도/태안 전역 배차' },
    { name: '안면도 개인콜택시', phone: '041-673-0300', note: '1구간, 2구간 신속 배차' }
  ],
  '서산시': [
    { name: '서산 브랜드콜', phone: '041-664-8282', note: '팔봉산/간대산 방면' },
    { name: '서산 개인택시콜', phone: '041-667-0033', note: '서산 전 지역 24시간' }
  ],
  '당진시': [
    { name: '당진 해나루콜', phone: '041-355-8282', note: '안국사지/삼웅리 방면' },
    { name: '당진 콜택시', phone: '041-356-8282', note: '당진 시내 및 면단위' }
  ],
  '예산군': [
    { name: '예산 통합콜택시', phone: '041-332-8282', note: '덕산/충의사 방면' },
    { name: '예산 개인콜', phone: '041-334-1144', note: '예산군 전역' }
  ],
  '홍성군': [
    { name: '홍성 서해콜택시', phone: '041-631-8282', note: '용봉산/광천읍 방면' },
    { name: '광천 개인택시', phone: '041-641-2333', note: '11구간, 12구간 오서산 방면' }
  ],
  '청양군': [
    { name: '청양 칠갑산콜', phone: '041-943-8282', note: '산성리/위라리 방면' },
    { name: '청양 개인콜', phone: '041-942-8282', note: '청양 전역' }
  ],
  '공주시': [
    { name: '공주 고마콜택시', phone: '041-858-8282', note: '대룡리/유구 방면' },
    { name: '공주 개인택시', phone: '041-855-8282', note: '공주시 전역' }
  ],
  '대전시': [
    { name: '대전 한빛콜택시', phone: '042-540-8282', note: '신탄진/대청호 방면' },
    { name: '대전 양반콜택시', phone: '042-586-8000', note: '대전 전역 24시간' }
  ],
  '괴산군': [
    { name: '괴산 콜택시', phone: '043-834-8282', note: '태성리/삼풍리/연풍 방면' },
    { name: '연풍 개인택시', phone: '043-833-5188', note: '32구간, 33구간 분지리 방면' }
  ],
  '문경시': [
    { name: '문경 점촌콜택시', phone: '054-554-8282', note: '문경/가은/점촌 전역' },
    { name: '가은 개인택시', phone: '054-571-0021', note: '33구간, 34구간 하내리 방면' }
  ],
  '상주시': [
    { name: '상주 삼백콜택시', phone: '054-531-8282', note: '함창/모전동 인근' },
    { name: '상주 개인택시', phone: '054-535-3333', note: '상주시 전역' }
  ],
  '단양군': [
    { name: '단양 콜택시', phone: '043-423-8282', note: '의풍리/영춘 방면' }
  ],
  '영주시': [
    { name: '영주 선비콜택시', phone: '054-633-8282', note: '부석/남대리 방면' }
  ],
  '봉화군': [
    { name: '봉화 파인콜택시', phone: '054-673-8282', note: '춘양/오전약수/분천 방면' },
    { name: '춘양 콜택시', phone: '054-672-3344', note: '48구간, 49구간 춘양면' }
  ],
  '울진군': [
    { name: '울진 삼근콜택시', phone: '054-782-9090', note: '51구간, 52구간 소광리 방면' },
    { name: '울진 북면택시', phone: '054-782-8255', note: '53구간 두천리/십이령 방면' },
    { name: '울진 개인콜택시', phone: '054-783-8282', note: '54구간, 55구간 망양정 방면' }
  ]
};

export const TaxiCallCard: React.FC<TaxiCallCardProps> = ({ region }) => {
  // Find matching taxis based on region substrings
  const matchedTaxis: { name: string; phone: string; note: string }[] = [];
  
  Object.keys(TAXI_DIRECTORY).forEach((key) => {
    if (region.includes(key)) {
      matchedTaxis.push(...TAXI_DIRECTORY[key]);
    }
  });

  if (matchedTaxis.length === 0) {
    // Default fallback
    matchedTaxis.push({
      name: `${region} 지역 콜택시 안내`,
      phone: '114',
      note: '지역 콜택시 번호 114 전화 문의'
    });
  }

  return (
    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-bold text-amber-950 flex items-center gap-2">
          <Car className="w-5 h-5 text-amber-700" />
          <span>관할 지역 콜택시 / 탈출 교통</span>
        </h4>
        <span className="text-xs bg-amber-200/60 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
          {region}
        </span>
      </div>

      <div className="space-y-2.5">
        {matchedTaxis.map((taxi, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100 shadow-xs"
          >
            <div>
              <div className="font-bold text-gray-900 text-sm">{taxi.name}</div>
              <div className="text-xs text-gray-500">{taxi.note}</div>
            </div>
            <a
              href={`tel:${taxi.phone}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-transform active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>전화걸기</span>
            </a>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-800/80">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>산간 오지 구간에서는 호출 시 15~30분 이상 소요될 수 있으므로 여유를 두고 호출하세요.</span>
      </div>
    </div>
  );
};
