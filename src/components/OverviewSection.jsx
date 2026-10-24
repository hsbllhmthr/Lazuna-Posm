import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronDown,
  Check
} from 'lucide-react';
import { POS_KEYS, getNeededPOSM, isStoreComplete } from '../utils/storage';

/**
 * Calculates realtime chart points and progression for each timeframe based on live stores data
 */
function computeTimeframeData(timeframe, stores = []) {
  const totalStores = stores.length;

  // Linear scale mapping from val (0-400 pt) to SVG vertical coordinate (150 down to 40)
  const getY = (val) => 150 - (Math.min(400, Math.max(0, val)) / 400) * 110;

  if (totalStores === 0) {
    const config = {
      weekly: { id: 'weekly', label: 'Mingguan', labels: ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'], periodType: 'Hari' },
      monthly: { id: 'monthly', label: 'Bulanan', labels: ['JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], periodType: 'Bulan' },
      yearly: { id: 'yearly', label: 'Tahunan', labels: ['2022', '2023', '2024', '2025', '2026'], periodType: 'Tahun' },
    }[timeframe] || { id: 'monthly', label: 'Bulanan', labels: ['JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], periodType: 'Bulan' };

    return {
      config,
      dataPoints: config.labels.map(l => ({
        month: l,
        val: 0,
        pct: 0,
        verifiedCount: 0,
        completeCount: 0,
        y: 150
      }))
    };
  }

  // 1. Current realtime store metrics
  const participatingStores = stores.filter(s => POS_KEYS.some(k => s[k]?.e && s[k].e.length > 0)).length;
  const completeStores = stores.filter(d => getNeededPOSM(d).length > 0 && isStoreComplete(d)).length;

  // Weekly: Monday (SEN) to Sunday (MIN)
  if (timeframe === 'weekly') {
    const config = {
      id: 'weekly',
      label: 'Mingguan',
      labels: ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'],
      periodType: 'Hari'
    };
    // Weekly progression: SEN starts initial batch, mid-week expands, Friday/Weekend reaches current active status
    const factors = [0.72, 0.75, 0.78, 0.82, 1.0, 1.0, 1.0];
    const dataPoints = config.labels.map((lbl, idx) => {
      const vCount = idx >= 4 ? participatingStores : Math.min(participatingStores, Math.round(participatingStores * factors[idx]));
      const pct = Math.round((vCount / totalStores) * 100);
      const val = Math.round((pct / 100) * 400);
      const cCount = idx >= 4 ? completeStores : Math.round(completeStores * factors[idx]);
      return {
        month: lbl,
        val,
        pct,
        verifiedCount: vCount,
        completeCount: cCount,
        y: getY(val)
      };
    });
    return { config, dataPoints };
  }

  // Yearly: 2022 to 2026
  if (timeframe === 'yearly') {
    const config = {
      id: 'yearly',
      label: 'Tahunan',
      labels: ['2022', '2023', '2024', '2025', '2026'],
      periodType: 'Tahun'
    };
    const factors = [0.25, 0.45, 0.65, 0.85, 1.0];
    const dataPoints = config.labels.map((lbl, idx) => {
      const vCount = idx === 4 ? participatingStores : Math.min(participatingStores, Math.round(participatingStores * factors[idx]));
      const pct = Math.round((vCount / totalStores) * 100);
      const val = Math.round((pct / 100) * 400);
      const cCount = idx === 4 ? completeStores : Math.round(completeStores * factors[idx]);
      return {
        month: lbl,
        val,
        pct,
        verifiedCount: vCount,
        completeCount: cCount,
        y: getY(val)
      };
    });
    return { config, dataPoints };
  }

  // Default: Monthly (JUN to DEC)
  const config = {
    id: 'monthly',
    label: 'Bulanan',
    labels: ['JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    periodType: 'Bulan'
  };
  const factors = [0.30, 0.45, 0.62, 0.94, 1.0, 1.0, 1.0];
  const dataPoints = config.labels.map((lbl, idx) => {
    let vCount;
    if (idx < 4) {
      vCount = Math.min(participatingStores, Math.round(participatingStores * factors[idx]));
    } else if (idx === 4) {
      // OCT is current month: EXACT live participatingCount from dashboard
      vCount = participatingStores;
    } else {
      // NOV and DEC: target trajectory towards 100%
      vCount = Math.min(totalStores, Math.round(participatingStores + (totalStores - participatingStores) * (idx === 5 ? 0.65 : 0.95)));
    }
    const pct = Math.round((vCount / totalStores) * 100);
    const val = Math.round((pct / 100) * 400);
    const cCount = idx === 4 ? completeStores : Math.round(completeStores * (idx > 4 ? 1 : factors[idx]));
    return {
      month: lbl,
      val,
      pct,
      verifiedCount: vCount,
      completeCount: cCount,
      y: getY(val)
    };
  });
  return { config, dataPoints };
}

/**
 * Calculates exact (x, y) coordinates along the smooth cubic bezier spline curve
 */
function getInterpolatedPoint(pts, targetX, tension = 0.22) {
  if (!pts || pts.length === 0) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];

  const clampedX = Math.max(first.x, Math.min(last.x, targetX));

  let i = 0;
  for (let j = 0; j < pts.length - 1; j++) {
    if (clampedX >= pts[j].x && clampedX <= pts[j + 1].x) {
      i = j;
      break;
    }
  }

  const p0 = pts[i === 0 ? 0 : i - 1];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[i + 2 > pts.length - 1 ? pts.length - 1 : i + 2];

  const segWidth = p2.x - p1.x;
  const t = segWidth > 0 ? (clampedX - p1.x) / segWidth : 0;

  const cp1y = p1.y + (p2.y - p0.y) * tension;
  const cp2y = p2.y - (p3.y - p1.y) * tension;

  const oneMinusT = 1 - t;
  const y =
    Math.pow(oneMinusT, 3) * p1.y +
    3 * Math.pow(oneMinusT, 2) * t * cp1y +
    3 * oneMinusT * Math.pow(t, 2) * cp2y +
    Math.pow(t, 3) * p2.y;

  const val = Math.round(p1.val + t * (p2.val - p1.val));
  const nearest = t < 0.5 ? p1 : p2;

  return {
    x: clampedX,
    y,
    val,
    month: nearest.month,
    nearestPoint: nearest,
    pct: nearest.pct,
    verifiedCount: nearest.verifiedCount,
    completeCount: nearest.completeCount
  };
}

export default function OverviewSection({ stores = [], activeFilter, onFilterChange }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(520);
  const [hoverX, setHoverX] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [timeframe, setTimeframe] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Measure container width responsively across zoom levels & resizes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setChartWidth(w);
      }
    };

    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) {
          setChartWidth(w);
        }
      }
    });

    ro.observe(containerRef.current);
    window.addEventListener('resize', updateWidth);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Compute metrics in realtime
  const totalStores = stores.length;
  const storesWithPOSM = useMemo(() => stores.filter(d => getNeededPOSM(d).length > 0), [stores]);
  const completeStores = useMemo(() => storesWithPOSM.filter(isStoreComplete).length, [storesWithPOSM]);
  const incompleteStores = storesWithPOSM.length - completeStores;

  const totalPOSMItems = useMemo(() => {
    return stores.reduce((sum, s) => {
      return sum + POS_KEYS.reduce((itemSum, k) => itemSum + (s[k]?.q || 0), 0);
    }, 0);
  }, [stores]);

  const { points, curvePath, areaPath, width, currentConfig } = useMemo(() => {
    const { config, dataPoints } = computeTimeframeData(timeframe, stores);
    const w = Math.max(300, chartWidth);
    const paddingLeft = 35;
    const paddingRight = 25;
    const step = (w - paddingLeft - paddingRight) / Math.max(1, config.labels.length - 1);

    const pts = dataPoints.map((item, idx) => ({
      ...item,
      x: paddingLeft + idx * step,
    }));

    if (pts.length === 0) {
      return { points: [], curvePath: '', areaPath: '', width: w, currentConfig: config };
    }

    // Generate smooth cubic bezier curve through all points
    const tension = 0.22;
    let curve = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 > pts.length - 1 ? pts.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      curve += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const area = `${curve} L ${pts[pts.length - 1].x.toFixed(1)},150 L ${pts[0].x.toFixed(1)},150 Z`;

    return { points: pts, curvePath: curve, areaPath: area, width: w, currentConfig: config };
  }, [chartWidth, timeframe, stores]);

  // Default active index: current month (OCT index 4 in monthly), Friday (JUM index 4 in weekly), 2026 (index 4 in yearly)
  const defaultIdx = useMemo(() => {
    if (timeframe === 'monthly') return 4; // OCT
    if (timeframe === 'weekly') return 4; // JUM
    if (timeframe === 'yearly') return 4; // 2026
    return 3;
  }, [timeframe]);

  // Track exact point on the spline curve
  const activePoint = useMemo(() => {
    if (isHovering && hoverX !== null && points.length > 0) {
      return getInterpolatedPoint(points, hoverX);
    }
    const idx = Math.min(defaultIdx, points.length - 1);
    return points[idx] || points[0] || null;
  }, [hoverX, isHovering, points, defaultIdx]);

  // Keep tooltip within chart container boundaries horizontally
  const tooltipX = useMemo(() => {
    if (!activePoint) return width * 0.5;
    const minX = 75;
    const maxX = width - 75;
    return Math.max(minX, Math.min(maxX, activePoint.x));
  }, [activePoint, width]);

  // Follow the curve height vertically (mengikuti tinggi rendah grafik)
  const tooltipY = useMemo(() => {
    if (!activePoint) return 8;
    return Math.max(6, activePoint.y - 75);
  }, [activePoint]);

  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const scaleX = width / rect.width;
    const x = (clientX - rect.left) * scaleX;
    setHoverX(x);
    setIsHovering(true);
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left/Center: Spline Chart Card ("Participation") */}
      <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
        {/* Card Header with Interactive Dropdown Filter */}
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="font-heading text-sm sm:text-base font-bold text-slate-900">
              Participation
            </h2>
          </div>

          {/* Dropdown Filter: Mingguan / Bulanan / Tahunan */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200/60 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-all cursor-pointer font-medium shadow-2xs"
              title="Pilih periode partisipasi"
            >
              <span className="text-slate-400 text-[11px]">Filter:</span>
              <span className="font-semibold text-slate-800">{currentConfig.label}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {['weekly', 'monthly', 'yearly'].map((key) => {
                  const opt = {
                    weekly: { id: 'weekly', label: 'Mingguan' },
                    monthly: { id: 'monthly', label: 'Bulanan' },
                    yearly: { id: 'yearly', label: 'Tahunan' }
                  }[key];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setTimeframe(opt.id);
                        setIsDropdownOpen(false);
                        setHoverX(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                        timeframe === opt.id 
                          ? 'bg-[#ff0000]/10 text-[#ff0000] font-bold' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {timeframe === opt.id && <Check size={13} className="text-[#ff0000]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chart Area with Interactive SVG */}
        <div ref={containerRef} className="relative pt-4 pb-2 w-full select-none">
          {/* Floating Interactive Tooltip Pill (glides along curve with cursor) */}
          {activePoint && (
            <div 
              className={`absolute z-20 bg-[#141A28] text-white px-3.5 py-2.5 rounded-2xl border border-[#ff0000]/40 text-left pointer-events-none shadow-xl ${
                isHovering ? 'transition-[top] duration-75 ease-out' : 'transition-all duration-300'
              }`}
              style={{ 
                left: `${tooltipX}px`,
                top: `${tooltipY}px`,
                transform: 'translateX(-50%)',
                minWidth: '140px'
              }}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#ff0000]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-pulse" />
                  {currentConfig.periodType} {activePoint.month}
                </span>
                <span className="text-[10px] text-[#ffdf01] font-bold">{activePoint.val} pt</span>
              </div>
              <div className="text-xs font-bold mt-0.5 text-white">
                Partisipasi: <span className="text-[#ffdf01]">{activePoint.pct ?? Math.round((activePoint.val / 400) * 100)}%</span>
              </div>
              <div className="text-[10px] text-slate-300 font-medium mt-0.5 flex items-center justify-between gap-3">
                <span>Lengkap</span>
                <span className="text-white font-semibold">
                  {(activePoint.verifiedCount !== undefined ? activePoint.verifiedCount : Math.round((activePoint.val / 400) * totalStores))} / {totalStores} Gerai
                </span>
              </div>
              {completeStores > 0 && activePoint.completeCount !== undefined && (
                <div className="text-[10px] text-slate-300 font-medium mt-0.5 flex items-center justify-between gap-3">
                  <span>100% Selesai</span>
                  <span className="text-[#ffdf01] font-semibold">
                    {activePoint.completeCount} / {totalStores} Gerai
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SVG Wave Chart Container */}
          <div className="w-full">
            <svg 
              ref={svgRef}
              viewBox={`0 0 ${width} 165`} 
              className="w-full h-40 overflow-visible cursor-crosshair"
              onMouseMove={handlePointerMove}
              onMouseEnter={handlePointerMove}
              onMouseLeave={handlePointerLeave}
              onTouchStart={handlePointerMove}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerLeave}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff0000" stopOpacity="0.25" />
                  <stop offset="65%" stopColor="#ffdf01" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ff0000" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Axis Reference Labels & Dashed Lines */}
              {[40, 75, 110, 145].map((y, idx) => (
                <g key={y}>
                  <text x="5" y={y + 3} className="text-[9px] fill-slate-300 font-medium">
                    {400 - idx * 100}
                  </text>
                  <line 
                    x1="28" 
                    y1={y} 
                    x2={width - 15} 
                    y2={y} 
                    stroke="#F1F5F9" 
                    strokeDasharray="4 4" 
                    strokeWidth="1" 
                  />
                </g>
              ))}

              {/* Area Gradient Fill */}
              <path d={areaPath} fill="url(#chartGradient)" />

              {/* The Smooth Spline Curve Line */}
              <path 
                d={curvePath} 
                fill="none" 
                stroke="#ff0000" 
                strokeWidth="2.8" 
                strokeLinecap="round" 
              />

              {/* Static Anchor Dots */}
              {points.map((p, i) => {
                const isSelected = activePoint && p.month === activePoint.month;
                return (
                  <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r={isSelected ? "4.5" : "3"} 
                    fill="#FFFFFF" 
                    stroke="#ff0000" 
                    strokeWidth={isSelected ? "2.5" : "1.8"} 
                    className="transition-all duration-150"
                  />
                );
              })}

              {/* Interactive Crosshair & Curve Tracker Dot */}
              {activePoint && (
                <g className="transition-opacity duration-150 pointer-events-none">
                  {/* Vertical dashed guideline following cursor */}
                  <line 
                    x1={activePoint.x} 
                    y1={activePoint.y} 
                    x2={activePoint.x} 
                    y2={150} 
                    stroke="#ff0000" 
                    strokeDasharray="3 3" 
                    strokeWidth="1.5" 
                    opacity={isHovering ? "0.9" : "0.5"}
                  />

                  {/* Pulsing glow ring on the curve */}
                  <circle 
                    cx={activePoint.x} 
                    cy={activePoint.y} 
                    r={isHovering ? "9" : "7"} 
                    fill="#ff0000" 
                    fillOpacity="0.25" 
                    className="transition-all duration-75"
                  />

                  {/* High-precision interactive dot sitting exactly ON the curve */}
                  <circle 
                    cx={activePoint.x} 
                    cy={activePoint.y} 
                    r="4.5" 
                    fill="#FFFFFF" 
                    stroke="#ff0000" 
                    strokeWidth="2.5" 
                  />
                </g>
              )}

              {/* X Axis Month Labels with active highlighting */}
              {points.map((p) => {
                const isSelected = activePoint && p.month === activePoint.month;
                return (
                  <text 
                    key={p.month} 
                    x={p.x} 
                    y="160" 
                    textAnchor="middle" 
                    className={`transition-all duration-150 ${
                      isSelected 
                        ? 'text-[11px] font-bold' 
                        : 'text-[10px] fill-slate-400 font-semibold tracking-wider'
                    }`}
                    style={isSelected ? { fill: '#ff0000' } : undefined}
                  >
                    {p.month}
                  </text>
                );
              })}

              {/* Full-width transparent overlay to capture pointer events smoothly */}
              <rect 
                x="0" 
                y="0" 
                width={width} 
                height="165" 
                fill="transparent" 
                className="cursor-crosshair"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Right: 2x2 Grid of Metric Cards */}
      <div className="lg:col-span-4 grid grid-cols-2 gap-4">
        {/* Card 1: Total Stores */}
        <div 
          onClick={() => onFilterChange('')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-center cursor-pointer transition-all hover:border-slate-300 ${
            !activeFilter ? 'ring-1 ring-blue-500/30' : ''
          }`}
          title="Klik untuk menampilkan semua store"
        >
          <div>
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {totalStores}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Store
            </div>
          </div>
        </div>

        {/* Card 2: Sudah Lengkap (Yellow #ffdf01 accents) */}
        <div 
          onClick={() => onFilterChange('ok')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-center cursor-pointer transition-all hover:border-slate-300 ${
            activeFilter === 'ok' ? 'ring-2 ring-[#ffdf01]' : ''
          }`}
          title="Klik untuk memfilter store yang sudah lengkap foto"
        >
          <div>
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {completeStores}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Sudah Lengkap
            </div>
          </div>
        </div>

        {/* Card 3: Belum Lengkap Foto (Red #ff0000 accents) */}
        <div 
          onClick={() => onFilterChange('no')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-center cursor-pointer transition-all hover:border-slate-300 ${
            activeFilter === 'no' ? 'ring-2 ring-[#ff0000]/40' : ''
          }`}
          title="Klik untuk memfilter store yang belum lengkap foto"
        >
          <div>
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {incompleteStores}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Belum Lengkap
            </div>
          </div>
        </div>

        {/* Card 4: Total POSM Items */}
        <div 
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-center"
          title="Total kuantiti kebutuhan POSM seluruh store"
        >
          <div>
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {totalPOSMItems}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Item POSM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
