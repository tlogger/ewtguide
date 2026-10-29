import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import { TrailPoint, POI } from '../types';

interface ElevationChartProps {
  points: TrailPoint[];
  pois?: POI[];
  onHoverPoint?: (point: TrailPoint | null) => void;
  gain: number;
  loss: number;
  minEle: number;
  maxEle: number;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  points,
  pois = [],
  onHoverPoint,
  gain,
  loss,
  minEle,
  maxEle
}) => {
  if (!points || points.length === 0) {
    return <div className="text-gray-500 py-6 text-center">고도 정보가 없습니다.</div>;
  }

  // Sample points if too dense for smooth chart rendering
  const data = points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 100)) === 0);

  // Match each facility to the nearest trail point (dist, ele)
  const poiDots: { name: string; category: string; icon: string; dist: number; ele: number }[] = [];

  pois.forEach((poi) => {
    if (!poi.lat || !poi.lng) return;
    let closestPt = points[0];
    let minDist = 999999;
    points.forEach((p) => {
      const d = Math.hypot((p.lat - poi.lat!) * 110540, (p.lng - poi.lng!) * 111320);
      if (d < minDist) {
        minDist = d;
        closestPt = p;
      }
    });

    const icon =
      poi.category === 'viewpoint' ? '📷' :
      poi.category === 'restaurant' ? '🍴' :
      poi.category === 'transport' ? '🚗' :
      poi.category === 'lodging' ? '⛺' :
      poi.category === 'cert_center' ? 'ℹ️' :
      poi.category === 'mart' ? '🛍️' :
      poi.category === 'toilet' ? '🚻' : '📍';

    poiDots.push({
      name: poi.name,
      category: poi.category,
      icon,
      dist: closestPt.dist,
      ele: closestPt.ele
    });
  });

  return (
    <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>⛰️</span>
          <span>구간 고도 프로파일</span>
          {poiDots.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              시설 {poiDots.length}개소 연동
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full font-bold border border-orange-200">
            ▲ 오르막 +{gain}m
          </span>
          <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-bold border border-blue-200">
            ▼ 내리막 -{loss}m
          </span>
          <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full font-semibold">
            최고 {maxEle}m / 최저 {minEle}m
          </span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 18, right: 15, left: -20, bottom: 0 }}
            onMouseMove={(e) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const pt = e.activePayload[0].payload as TrailPoint;
                onHoverPoint?.(pt);
              }
            }}
            onMouseLeave={() => onHoverPoint?.(null)}
          >
            <defs>
              <linearGradient id="elevationGradOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dist"
              unit="km"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
            />
            <YAxis
              unit="m"
              domain={[Math.max(0, minEle - 20), maxEle + 35]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as TrailPoint;
                  // Check if any POI is near this point (within 0.5km)
                  const nearbyPoi = poiDots.find((p) => Math.abs(p.dist - pt.dist) <= 0.4);
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded-xl p-2.5 shadow-xl border border-gray-700 space-y-1">
                      <div className="font-extrabold text-orange-400">{pt.dist} km 지점</div>
                      <div>해발 고도: <strong>{pt.ele} m</strong></div>
                      {nearbyPoi && (
                        <div className="text-emerald-300 font-bold border-t border-gray-700 pt-1 mt-1 flex items-center gap-1">
                          <span>{nearbyPoi.icon}</span>
                          <span>{nearbyPoi.name}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="ele"
              stroke="#ea580c"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#elevationGradOrange)"
            />

            {/* Facility Overlay Dots on the Elevation Chart */}
            {poiDots.map((pDot, idx) => (
              <ReferenceDot
                key={idx}
                x={pDot.dist}
                y={pDot.ele}
                r={6}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth={2}
                label={{
                  value: `${pDot.icon} ${pDot.name.length > 7 ? pDot.name.slice(0, 6) + '..' : pDot.name}`,
                  position: 'top',
                  fill: '#0f172a',
                  fontSize: 10,
                  fontWeight: 800,
                  offset: 8
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
