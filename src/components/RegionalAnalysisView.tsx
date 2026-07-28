import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Play,
  Layers,
  Circle,
  Hexagon,
  Crosshair,
  Flame,
  X,
  MapPin,
  Check,
  Plus,
  Search,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import L from 'leaflet';
import { CHINA_REGIONS, getRegionCenter } from '../data/chinaRegions';
import { RegionSelector } from './RegionSelector';
import { PageTitle } from '@/components/ui/page-title';
import { BusinessCategory, AmapPOI } from '../types';
import { D3IndustryDistributionChart } from './D3IndustryDistributionChart';

interface RegionalAnalysisViewProps {
  pois: AmapPOI[];
  amapConnected: boolean;
  isSearching?: boolean;
  onExecuteAnalysis: (params: {
    province: string;
    city: string;
    district: string;
    radius: number;
    categories: BusinessCategory[];
    center?: [number, number];
    limit?: number;
  }) => Promise<AmapPOI[]> | void;
}

type RegionSelection = {
  province: string;
  city: string;
  district: string;
};

const getRegionZoom = ({ province, city, district }: RegionSelection) => {
  if (province === '全国') return 4;
  if (city.includes('全')) return 6;
  if (district.includes('全')) return 10;
  return 13;
};

const DEFAULT_PRESET_CATEGORIES: BusinessCategory[] = [
  '餐饮',
  '咖啡馆',
  '酒吧',
  '文创',
  '书店',
  '手作',
  '健身房',
  '宠物店',
  '美发沙龙',
  '烘焙甜品',
  '快捷酒店',
  '服饰鞋帽',
];

export const RegionalAnalysisView: React.FC<RegionalAnalysisViewProps> = ({
  pois,
  amapConnected,
  isSearching = false,
  onExecuteAnalysis,
}) => {
  // Cascading dropdowns
  const [selectedProvName, setSelectedProvName] = useState('全国');
  const [selectedCityName, setSelectedCityName] = useState('全域');
  const [selectedDistName, setSelectedDistName] = useState('全国全域范围');

  const [radiusKm, setRadiusKm] = useState(1.5);
  const [searchLimit, setSearchLimit] = useState(20);
  const [selectedCats, setSelectedCats] = useState<BusinessCategory[]>([
    '餐饮',
    '咖啡馆',
  ]);

  // Category free search & custom add state
  const [availableCategories, setAvailableCategories] = useState<BusinessCategory[]>(
    DEFAULT_PRESET_CATEGORIES
  );
  const [categorySearchInput, setCategorySearchInput] = useState('');

  // Map state
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [drawTool, setDrawTool] = useState<'none' | 'circle' | 'polygon'>('circle');
  
  // Nationwide center [lat, lng]
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.8617, 104.1954]);
  const [analysisCenter, setAnalysisCenter] = useState<[number, number]>([35.8617, 104.1954]);
  const [isCustomCenter, setIsCustomCenter] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(4);

  // Analysis Execution Feedback State
  const [internalAnalyzing, setInternalAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const regionFocusFrameRef = useRef<number | null>(null);

  // Region change handler
  const handleRegionChange = (prov: string, city: string, dist: string) => {
    const nextRegion: RegionSelection = {
      province: prov,
      city,
      district: dist,
    };

    setSelectedProvName(prov);
    setSelectedCityName(city);
    setSelectedDistName(dist);
    setIsCustomCenter(false);

    const centerLngLat = getRegionCenter(prov, city, dist);
    const targetLat = centerLngLat[1];
    const targetLng = centerLngLat[0];

    const targetZoom = getRegionZoom(nextRegion);
    const targetCenter: [number, number] = [targetLat, targetLng];

    setMapCenter(targetCenter);
    setAnalysisCenter(targetCenter);
    setZoomLevel(targetZoom);

    if (regionFocusFrameRef.current !== null) {
      cancelAnimationFrame(regionFocusFrameRef.current);
    }

    // Wait until the controlled selects have committed, then move the existing
    // Leaflet instance. setView is deliberate here: unlike a queued flyTo it
    // cannot be cancelled by a previous map animation or a simultaneous resize.
    regionFocusFrameRef.current = requestAnimationFrame(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      map.stop();
      map.invalidateSize({ pan: false });
      map.setView(targetCenter, targetZoom, { animate: true });
      regionFocusFrameRef.current = null;
    });

    // Auto-align analysis with the new region center
    void handleRunAnalysis(targetLat, targetLng, nextRegion);
  };

  const toggleCategory = (cat: BusinessCategory) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter((c) => c !== cat));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const handleAddCustomCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = categorySearchInput.trim();
    if (!trimmed) return;

    if (!availableCategories.includes(trimmed)) {
      setAvailableCategories([trimmed, ...availableCategories]);
    }
    if (!selectedCats.includes(trimmed)) {
      setSelectedCats([...selectedCats, trimmed]);
    }
    setCategorySearchInput('');
  };

  const handleDeleteCategory = (catToDelete: BusinessCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvailableCategories((prev) => prev.filter((c) => c !== catToDelete));
    setSelectedCats((prev) => prev.filter((c) => c !== catToDelete));
  };

  const handleReset = () => {
    setSelectedProvName('全国');
    setSelectedCityName('全域');
    setSelectedDistName('全国全域范围');
    setRadiusKm(1.5);
    setSelectedCats(['餐饮', '咖啡馆']);
    setAvailableCategories(DEFAULT_PRESET_CATEGORIES);
    setCategorySearchInput('');
    setDrawTool('circle');
    setMapCenter([35.8617, 104.1954]);
    setAnalysisCenter([35.8617, 104.1954]);
    setIsCustomCenter(false);
    setZoomLevel(4);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([35.8617, 104.1954], 4, { duration: 1.0 });
    }
  };

  // Execution of regional analysis with optional explicit center override
  const handleRunAnalysis = async (
    customLat?: number | unknown,
    customLng?: number,
    regionOverride?: RegionSelection
  ) => {
    if (!amapConnected) {
      setToastMessage('请接入高德地图 API 后再进行检索。');
      setTimeout(() => setToastMessage(null), 4000);
      return [];
    }

    setInternalAnalyzing(true);

    const activeRegion = regionOverride ?? {
      province: selectedProvName,
      city: selectedCityName,
      district: selectedDistName,
    };

    const latNum = typeof customLat === 'number' && !isNaN(customLat) ? customLat : undefined;
    const lngNum = typeof customLng === 'number' && !isNaN(customLng) ? customLng : undefined;

    let targetLat = latNum ?? (typeof analysisCenter[0] === 'number' && !isNaN(analysisCenter[0]) ? analysisCenter[0] : 35.8617);
    let targetLng = lngNum ?? (typeof analysisCenter[1] === 'number' && !isNaN(analysisCenter[1]) ? analysisCenter[1] : 104.1954);

    if (latNum === undefined && !isCustomCenter) {
      const centerLngLat = getRegionCenter(
        activeRegion.province,
        activeRegion.city,
        activeRegion.district
      );
      if (Array.isArray(centerLngLat) && centerLngLat.length >= 2) {
        targetLng = centerLngLat[0];
        targetLat = centerLngLat[1];
      }
    }

    if (typeof targetLat !== 'number' || isNaN(targetLat)) targetLat = 35.8617;
    if (typeof targetLng !== 'number' || isNaN(targetLng)) targetLng = 104.1954;

    const targetCenter: [number, number] = [targetLat, targetLng];
    setAnalysisCenter(targetCenter);
    setMapCenter(targetCenter);

    // Dynamic zoom according to radius
    let targetZoom = 14;
    if (radiusKm <= 0.8) targetZoom = 16;
    else if (radiusKm <= 1.5) targetZoom = 15;
    else if (radiusKm <= 3.0) targetZoom = 14;
    else targetZoom = 13;

    if (activeRegion.province === '全国' && !isCustomCenter && latNum === undefined) targetZoom = 4;

    setZoomLevel(targetZoom);

    // Smooth map fly
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.flyTo(targetCenter, targetZoom, {
          duration: 1.0,
        });
      } catch (e) {
        console.warn('Map flyTo warning:', e);
      }
    }

    try {
      const resPois = await onExecuteAnalysis({
        province: activeRegion.province,
        city: activeRegion.city,
        district: activeRegion.district,
        radius: Math.round(radiusKm * 1000),
        categories: selectedCats,
        center: [targetLng, targetLat],
        limit: searchLimit,
      });

      const count = Array.isArray(resPois) ? resPois.length : pois.length;
      const centerLabel = latNum !== undefined || isCustomCenter
        ? `[${targetLng.toFixed(3)}°E, ${targetLat.toFixed(3)}°N]`
        : activeRegion.province === '全国'
        ? '全国多城市抽样范围内'
        : `${activeRegion.province}${
            activeRegion.city.includes('全') ? '' : activeRegion.city
          }${activeRegion.district.includes('全') ? '' : activeRegion.district}`;

      setToastMessage(
        `区域对齐搜索完成！中心点【${centerLabel}】，按 ${radiusKm}km 半径检索定位到 ${count} 家商户。`
      );

      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Regional analysis error:', err);
    } finally {
      setInternalAnalyzing(false);
    }
  };

  const handleRunAnalysisRef = useRef(handleRunAnalysis);
  useEffect(() => {
    handleRunAnalysisRef.current = handleRunAnalysis;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: mapCenter,
        zoom: zoomLevel,
        zoomControl: false,
      });

      // CartoDB Voyager tiles for clear modern aesthetics
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; 高德地图 / OpenStreetMap',
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('moveend', () => {
        const center = map.getCenter();
        setMapCenter([center.lat, center.lng]);
        setZoomLevel(map.getZoom());
      });

      // Listen to map click to manually set search radius center & trigger re-analysis
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLat = Number(e.latlng.lat.toFixed(5));
        const newLng = Number(e.latlng.lng.toFixed(5));

        setAnalysisCenter([newLat, newLng]);
        setIsCustomCenter(true);

        if (handleRunAnalysisRef.current) {
          handleRunAnalysisRef.current(newLat, newLng);
        }
      });

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }
  }, []);

  // Handle container resize or tab visibility toggle
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => {
      observer.disconnect();
      if (regionFocusFrameRef.current !== null) {
        cancelAnimationFrame(regionFocusFrameRef.current);
        regionFocusFrameRef.current = null;
      }
    };
  }, []);

  const radiusMeters = Math.round(radiusKm * 1000);

  // Filter POIs matching selected categories AND search radius
  const activePois = React.useMemo(() => {
    return pois.filter((p) => {
      // 1. Category & Keyword Match
      const matchesCat =
        selectedCats.length === 0 ||
        selectedCats.includes(p.categoryType) ||
        selectedCats.includes(p.matchedKeyword) ||
        selectedCats.some((cat) => p.category && p.category.includes(cat)) ||
        selectedCats.some((cat) => p.name.includes(cat)) ||
        selectedCats.some((cat) => cat.includes(p.categoryType));

      if (!matchesCat) return false;

      // 2. Distance check from analysis center
      // Nationwide searches use Amap's nationwide text results, so applying a
      // 1.5 km circle around China's geographic center would discard every
      // valid merchant. Only constrain by radius for a selected region or a
      // center explicitly picked on the map.
      if (selectedProvName !== '全国' || isCustomCenter) {
        const poiLatLng = L.latLng(p.location[1], p.location[0]);
        const centerLatLng = L.latLng(analysisCenter[0], analysisCenter[1]);
        const dist = centerLatLng.distanceTo(poiLatLng);

        // Strict radius distance filter ensures POIs fall within search radius
        return dist <= radiusMeters;
      }
      return true;
    });
  }, [
    pois,
    selectedCats,
    analysisCenter,
    selectedProvName,
    isCustomCenter,
    radiusMeters,
  ]);

  // Update map markers, heatmap circles, and drawing overlays when parameters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Heatmap circles if enabled
    if (heatmapEnabled) {
      activePois.forEach((poi) => {
        const heatCircle = L.circle([poi.location[1], poi.location[0]], {
          radius: 120,
          color: '#ef4444',
          fillColor: '#f97316',
          fillOpacity: 0.35,
          weight: 0,
          className: 'heat-circle',
        });
        layerGroup.addLayer(heatCircle);
      });
    }

    // 2. POI Markers with popup info
    activePois.forEach((poi) => {
      const customIcon = L.divIcon({
        className: 'custom-poi-marker',
        html: `<div style="background-color: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([poi.location[1], poi.location[0]], {
        icon: customIcon,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #1e3a8a; font-size: 13px;">${poi.name}</strong>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">类别: ${poi.categoryType || poi.category}</div>
          <div style="font-size: 11px; color: #334155; margin-top: 2px;">地址: ${poi.address}</div>
          <div style="font-size: 11px; color: #2563eb; margin-top: 2px; font-weight: 600;">电话: ${poi.tel || '无'}</div>
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    // 3. Circle Tool Overlay around analysis center
    if (drawTool === 'circle') {
      const circleRadiusMeters = Math.round(radiusKm * 1000);
      const circle = L.circle(analysisCenter, {
        radius: circleRadiusMeters,
        color: '#2563eb',
        dashArray: '6, 6',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 2,
      });

      layerGroup.addLayer(circle);

      // Center Point Marker with Red Pin & Pill Badge
      const countInside = activePois.length;

      const centerPinIcon = L.divIcon({
        className: 'center-point-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
            <div style="background-color: #dc2626; color: white; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap; font-family: sans-serif; margin-bottom: 2px;">
              中心点 (${countInside}家)
            </div>
            <div style="width: 18px; height: 18px; background-color: #ef4444; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #dc2626, 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        iconSize: [120, 44],
        iconAnchor: [60, 38],
      });

      const centerMarker = L.marker(analysisCenter, {
        icon: centerPinIcon,
        zIndexOffset: 1000,
      });

      centerMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; text-align: center;">
          <strong style="color: #dc2626; font-size: 13px;">🎯 搜索半径中心点</strong>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">坐标: [${analysisCenter[1].toFixed(5)}°E, ${analysisCenter[0].toFixed(5)}°N]</div>
          <div style="font-size: 11px; color: #2563eb; margin-top: 4px; font-weight: bold;">${radiusKm}km 范围精准对齐 ${countInside} 家定位商户</div>
        </div>
      `);

      layerGroup.addLayer(centerMarker);
    } else if (drawTool === 'polygon') {
      // Polygon bounds around analysis center
      const offset = 0.01;
      const polyCoords: [number, number][] = [
        [analysisCenter[0] + offset, analysisCenter[1] - offset * 1.2],
        [analysisCenter[0] + offset * 1.2, analysisCenter[1] + offset * 1.2],
        [analysisCenter[0] - offset, analysisCenter[1] + offset * 1.5],
        [analysisCenter[0] - offset * 1.2, analysisCenter[1] - offset],
      ];

      const polygon = L.polygon(polyCoords, {
        color: '#2563eb',
        dashArray: '5, 5',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
      });

      layerGroup.addLayer(polygon);
    }
  }, [analysisCenter, heatmapEnabled, drawTool, radiusKm, activePois]);

  const isLoading = isSearching || internalAnalyzing;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Settings Panel */}
      <div className="w-80 bg-white/85 backdrop-blur-xl border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0 overflow-y-auto z-20">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center justify-between">
            <PageTitle>分析维度设置</PageTitle>
            {amapConnected && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                高德 API 在线
              </span>
            )}
          </h3>

          {/* Region Selection */}
          <RegionSelector
            selectedProvName={selectedProvName}
            selectedCityName={selectedCityName}
            selectedDistName={selectedDistName}
            compact={true}
            searchLimit={searchLimit}
            onSearchLimitChange={setSearchLimit}
            onRegionChange={handleRegionChange}
          />

          {/* Search Radius Slider & Center Point Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">搜索半径</span>
              <span className="text-blue-900 font-mono font-bold">
                当前 : {radiusKm}km ({Math.round(radiusKm * 1000)}m)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>500m</span>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                className="w-full accent-blue-800 cursor-pointer"
              />
              <span>5km</span>
            </div>

            {/* Center Point Location Info & Reset */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>半径中心点:</span>
                </span>
                {isCustomCenter ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold border border-blue-200">
                    地图手动拾取
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 text-[10px] font-medium">
                    行政区默认中心
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-0.5">
                <span>
                  {analysisCenter[1].toFixed(4)}°E, {analysisCenter[0].toFixed(4)}°N
                </span>
                {isCustomCenter && (
                  <button
                    type="button"
                    onClick={() => {
                      const centerLngLat = getRegionCenter(
                        selectedProvName,
                        selectedCityName,
                        selectedDistName
                      );
                      setAnalysisCenter([centerLngLat[1], centerLngLat[0]]);
                      setMapCenter([centerLngLat[1], centerLngLat[0]]);
                      setIsCustomCenter(false);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo(
                          [centerLngLat[1], centerLngLat[0]],
                          zoomLevel
                        );
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-sans"
                  >
                    重置为行政区中心
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
                💡 提示: 随时点击右侧地图上的任意位置，即可手动重新定位半径中心。
              </p>
            </div>
          </div>

          {/* Business Categories Chip Selector & Custom Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                经营类目 (可搜索/添加/删除)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-blue-900 font-mono">
                  已选 {selectedCats.length} 项
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCats([])}
                  disabled={selectedCats.length === 0}
                  className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:bg-slate-100 disabled:text-slate-400 border border-rose-200 disabled:border-slate-200 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  title="一键清空所有已选类目"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>一键清空</span>
                </button>
              </div>
            </div>

            {/* Free Search & Add Input Box */}
            <form onSubmit={handleAddCustomCategory} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={categorySearchInput}
                  onChange={(e) => setCategorySearchInput(e.target.value)}
                  placeholder="搜索或输入自定义类目(按回车)"
                  className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <button
                type="submit"
                disabled={!categorySearchInput.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer shrink-0 active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </form>

            {/* Category Chips List */}
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200/80 rounded-lg">
              {availableCategories
                .filter((cat) =>
                  !categorySearchInput ||
                  cat.toLowerCase().includes(categorySearchInput.toLowerCase().trim())
                )
                .map((cat) => {
                  const isSelected = selectedCats.includes(cat);
                  return (
                    <div
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`group px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCategory(cat, e)}
                        className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                          isSelected
                            ? 'hover:bg-blue-700 text-blue-100 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-400 hover:text-rose-600'
                        }`}
                        title={`删除 "${cat}" 类目`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-6 border-t border-slate-100">
          <button
            onClick={() => handleRunAnalysis()}
            disabled={isLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow-md hover:shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>定位检索与分析中...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>执行分析</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-medium text-xs rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            重置条件
          </button>
        </div>
      </div>

      {/* Right Map Canvas Container */}
      <div className="flex-1 flex flex-col relative bg-slate-100 h-full overflow-hidden">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center gap-2 font-medium animate-in fade-in slide-in-from-top duration-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Map Top Floating Toolbar */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-lg border border-slate-200/80 shadow-md">
          {/* Circle Tool */}
          <button
            onClick={() => setDrawTool(drawTool === 'circle' ? 'none' : 'circle')}
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              drawTool === 'circle'
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="画圈范围检索"
          >
            <Circle className="w-4 h-4" />
          </button>

          {/* Polygon Tool */}
          <button
            onClick={() => setDrawTool(drawTool === 'polygon' ? 'none' : 'polygon')}
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              drawTool === 'polygon'
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="多边形范围检索"
          >
            <Hexagon className="w-4 h-4" />
          </button>

          {/* Manual Pick Center Button Indicator */}
          <button
            onClick={() => {
              setToastMessage('💡 选点指南：在右侧地图上直接点击任意位置，即可指定新的检索半径中心点');
              setTimeout(() => setToastMessage(null), 3500);
            }}
            className={`p-1.5 px-2 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs ${
              isCustomCenter
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
            title="点击地图任意位置手动指定检索中心点"
          >
            <MapPin className="w-4 h-4 text-current" />
            <span className="hidden sm:inline">
              {isCustomCenter ? '已自定义中心' : '点击地图选点'}
            </span>
          </button>

          {/* Center Locator */}
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo(analysisCenter, 14, { duration: 1.0 });
              }
            }}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="平移定位到分析区域中心"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-1" />

          {/* Heatmap Toggle */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> 热力图
            </span>
            <button
              onClick={() => setHeatmapEnabled(!heatmapEnabled)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                heatmapEnabled ? 'bg-blue-800 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Leaflet Map DOM Element */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating D3 Industry Distribution Percentage Overlay Card */}
        <div className="absolute bottom-12 left-4 z-20 pointer-events-auto">
          <D3IndustryDistributionChart
            pois={activePois}
            selectedCategories={selectedCats}
            onToggleCategory={toggleCategory}
          />
        </div>

        {/* Map Bottom Status Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600 font-mono z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">当前视角中心:</span>
            <span>
              {mapCenter[1].toFixed(4)}°E, {mapCenter[0].toFixed(4)}°N
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-700">搜索半径:</span>
            <span className="text-blue-900 font-bold">{radiusKm} km</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-700">区域:</span>
            <span>
              {selectedProvName} {selectedCityName} {selectedDistName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-blue-900 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              共对齐 {activePois.length} 家商户数据
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
