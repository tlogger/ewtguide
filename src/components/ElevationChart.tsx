import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrailPoint } from '../types';

interface ElevationChartProps {
  points: TrailPoint[];
  onHoverPoint?: (point: TrailPoint | null) => void;
  gain: number;
  loss: number;
  minEle: number;
  maxEle: number;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  points,
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

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>⛰️</span> 고도 프로필
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
            ▲ 획득 +{gain}m
          </span>
          <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-semibold">
            ▼ 하강 -{loss}m
          </span>
          <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            최고 {maxEle}m / 최저 {minEle}m
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onMouseMove={(e) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const pt = e.activePayload[0].payload as TrailPoint;
                onHoverPoint?.(pt);
              }
            }}
            onMouseLeave={() => onHoverPoint?.(null)}
          >
            <defs>
              <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dist"
              unit="km"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              unit="m"
              domain={[Math.max(0, minEle - 20), maxEle + 30]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as TrailPoint;
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
                      <div className="font-bold text-emerald-400">{pt.dist} km 지점</div>
                      <div>해발 고도: {pt.ele} m</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="ele"
              stroke="#059669"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#elevationGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-right">
        * 그래프 위를 터치/마우스 이동하면 지도 상의 위치가 연동 표시됩니다.
      </p>
    </div>
  );
};
