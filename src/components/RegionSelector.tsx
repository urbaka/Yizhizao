import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Edit3, Check, X, Compass, Globe } from 'lucide-react';
import { CHINA_REGIONS, searchChinaRegions, RegionSearchResult } from '../data/chinaRegions';

interface RegionSelectorProps {
  selectedProvName: string;
  selectedCityName: string;
  selectedDistName: string;
  onRegionChange: (prov: string, city: string, dist: string) => void;
  searchLimit?: number;
  onSearchLimitChange?: (limit: number) => void;
  className?: string;
  compact?: boolean;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  selectedProvName,
  selectedCityName,
  selectedDistName,
  onRegionChange,
  searchLimit = 20,
  onSearchLimitChange,
  className = '',
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute options
  const currentProv = useMemo(
    () => CHINA_REGIONS.find((p) => p.name === selectedProvName) || CHINA_REGIONS[0],
    [selectedProvName]
  );

  const cityOptions = useMemo(() => currentProv.children || [], [currentProv]);

  const currentCity = useMemo(
    () => cityOptions.find((c) => c.name === selectedCityName) || cityOptions[0] || currentProv,
    [cityOptions, selectedCityName, currentProv]
  );

  const districtOptions = useMemo(() => currentCity.children || [], [currentCity]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchChinaRegions(searchQuery);
  }, [searchQuery]);

  const handleProvSelect = (pName: string) => {
    if (pName === '全国') {
      onRegionChange('全国', '全域', '全国全域范围');
      return;
    }
    const provObj = CHINA_REGIONS.find((p) => p.name === pName);
    if (provObj && provObj.children && provObj.children.length > 0) {
      const firstCity = provObj.children[0];
      const firstDist = firstCity.children?.[0]?.name || firstCity.name;
      onRegionChange(pName, firstCity.name, firstDist);
    } else {
      onRegionChange(pName, pName, pName);
    }
  };

  const handleCitySelect = (cName: string) => {
    const cityObj = cityOptions.find((c) => c.name === cName);
    if (cityObj && cityObj.children && cityObj.children.length > 0) {
      onRegionChange(selectedProvName, cName, cityObj.children[0].name);
    } else {
      onRegionChange(selectedProvName, cName, cName);
    }
  };

  const handleDistSelect = (dName: string) => {
    let actualCity = selectedCityName;
    if (currentProv && currentProv.children) {
      for (const cityObj of currentProv.children) {
        if (['全省范围', '全市范围', '全域'].includes(cityObj.name)) continue;
        if (cityObj.children?.some((d) => d.name === dName)) {
          actualCity = cityObj.name;
          break;
        }
      }
    }
    onRegionChange(selectedProvName, actualCity, dName);
  };

  const handleApplySearchResult = (item: RegionSearchResult) => {
    onRegionChange(item.province, item.city, item.district);
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleApplyCustomText = () => {
    if (!customText.trim()) return;
    onRegionChange(
      selectedProvName === '全国' ? '广东省' : selectedProvName,
      selectedCityName === '全域' ? '深圳市' : selectedCityName,
      customText.trim()
    );
    setIsCustomMode(false);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Info Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-700" />
          <span className="text-xs font-bold text-slate-800">目标区域筛选</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Tag */}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {selectedProvName === '全国' ? (
              <>
                <Globe className="w-3 h-3 text-blue-700" />
                <span title="全国结果来自多个代表城市的真实 POI 抽样，并非全国商户全量">
                  全国多城市抽样模式
                </span>
              </>
            ) : (
              <>
                <Compass className="w-3 h-3 text-blue-700" />
                <span>
                  {selectedProvName} · {selectedCityName} · {selectedDistName}
                </span>
              </>
            )}
          </span>

          {/* Search Result Limit Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-600">检索结果数量:</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              {[20, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSearchLimitChange?.(num)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all cursor-pointer ${
                    searchLimit === num
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Region Search Bar */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
            placeholder="快速搜索任意省、市、区县..."
            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearching && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map((item, idx) => (
              <div
                key={`${item.province}-${item.city}-${item.district}-${idx}`}
                onClick={() => handleApplySearchResult(item)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="font-semibold text-slate-800">{item.district}</span>
                  <span className="text-slate-400 text-[11px]">
                    ({item.province} · {item.city})
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 font-medium">应用</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Mode Content */}
      {isCustomMode ? (
        <div className="flex items-center gap-2 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="输入自定义行政区划名称..."
            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
          />
          <button
            onClick={handleApplyCustomText}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>设定</span>
          </button>
        </div>
      ) : (
        /* Standard 3-Level Cascading Selects */
        <div className={`grid grid-cols-3 gap-2 ${compact ? '' : 'sm:gap-3'}`}>
          {/* Province */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">省份/直辖市</label>
            <select
              value={selectedProvName}
              onChange={(e) => handleProvSelect(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 cursor-pointer"
            >
              {CHINA_REGIONS.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">城市/地区</label>
            <select
              value={selectedCityName}
              onChange={(e) => handleCitySelect(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 cursor-pointer"
            >
              {cityOptions.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">区县/全域</label>
            <select
              value={selectedDistName}
              onChange={(e) => handleDistSelect(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 cursor-pointer"
            >
              {districtOptions.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
