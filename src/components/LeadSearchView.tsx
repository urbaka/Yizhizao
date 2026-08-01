import React, { useState, useMemo } from 'react';
import {
  Search,
  Zap,
  Download,
  Bookmark,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sliders,
  Sparkles,
  Loader2,
  Phone,
} from 'lucide-react';
import { CHINA_REGIONS } from '../data/chinaRegions';
import { RegionSelector } from './RegionSelector';
import { PageTitle } from '@/components/ui/page-title';
import { LeadItem, BusinessCategory } from '../types';

interface LeadSearchViewProps {
  leads: LeadItem[];
  onSearchLeads: (params: {
    keywords: string[];
    excludedKeywords: string[];
    province: string;
    city: string;
    district: string;
    radius?: number;
    limit?: number;
  }) => Promise<any>;
  onBatchSave: (ids: string[]) => void;
  onExportCsv: (items: LeadItem[]) => void;
  onExportJson: (items: LeadItem[]) => void;
  isSearching: boolean;
}

const formatRegion = (province?: string, city?: string, district?: string) => {
  const cleanP = (province || '').trim();
  let cleanC = (city || '').replace(/全省范围|全市范围|全域|全国|全区全域/g, '').trim();
  let cleanD = (district || '').replace(/全省全域范围|全省范围|全市范围|全域|全国|全区全域/g, '').trim();

  // If province === city (e.g. 北京市/北京市)
  if (cleanP && cleanC && (cleanP === cleanC || cleanC.includes(cleanP))) {
    cleanC = '';
  }

  // If city === district
  if (cleanC && cleanD && (cleanC === cleanD || cleanD.includes(cleanC))) {
    cleanD = '';
  }

  const parts = [cleanP, cleanC, cleanD].filter(Boolean);
  return parts.length > 0 ? parts.join('/') : '全国全域';
};

export const LeadSearchView: React.FC<LeadSearchViewProps> = ({
  leads,
  onSearchLeads,
  onBatchSave,
  onExportCsv,
  onExportJson,
  isSearching,
}) => {
  // Cascading Region Select State
  const [selectedProvName, setSelectedProvName] = useState('全国');
  const [selectedCityName, setSelectedCityName] = useState('全域');
  const [selectedDistName, setSelectedDistName] = useState('全国全域范围');

  // Search limit state (20, 50, 100)
  const [searchLimit, setSearchLimit] = useState<number>(20);

  // Multi-line keyword states
  const [targetKeywordsText, setTargetKeywordsText] = useState('咖啡店\n奶茶\n轻食');
  const [excludedKeywordsText, setExcludedKeywordsText] = useState('加盟代办\n设备回收');

  // Table filter states
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Sync pageSize with searchLimit when searchLimit changes
  const handleLimitChange = (newLimit: number) => {
    setSearchLimit(newLimit);
    setPageSize(newLimit);
    setCurrentPage(1);
  };

  // Cascading regions logic
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

  // Handle Province change
  const handleProvChange = (pName: string) => {
    setSelectedProvName(pName);
    const provObj = CHINA_REGIONS.find((p) => p.name === pName);
    if (pName === '全国') {
      setSelectedCityName('全域');
      setSelectedDistName('全国全域范围');
      return;
    }
    if (provObj && provObj.children && provObj.children.length > 0) {
      const firstCity = provObj.children[0];
      setSelectedCityName(firstCity.name);
      if (firstCity.children && firstCity.children.length > 0) {
        setSelectedDistName(firstCity.children[0].name);
      } else {
        setSelectedDistName(firstCity.name);
      }
    }
  };

  // Handle City change
  const handleCityChange = (cName: string) => {
    setSelectedCityName(cName);
    const cityObj = cityOptions.find((c) => c.name === cName);
    if (cityObj && cityObj.children && cityObj.children.length > 0) {
      setSelectedDistName(cityObj.children[0].name);
    } else {
      setSelectedDistName(cName);
    }
  };

  const [searchSuccessAlert, setSearchSuccessAlert] = useState<string | null>(null);

  const handleStartSearch = async () => {
    const keywords = targetKeywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);
    const excludedKeywords = excludedKeywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      alert('请至少输入一个包含关键词/经营类目！');
      return;
    }

    setSearchSuccessAlert(null);
    setCurrentPage(1);
    const resPois = await onSearchLeads({
      keywords,
      excludedKeywords,
      province: selectedProvName,
      city: selectedCityName,
      district: selectedDistName,
      limit: searchLimit,
    });
    const regionDisplay = selectedProvName === '全国'
      ? '全国多城市抽样范围'
      : `${selectedProvName} ${selectedCityName} ${selectedDistName.includes('全域') || selectedDistName.includes('范围') ? '' : selectedDistName}`.trim();

    const count = Array.isArray(resPois) ? resPois.length : 0;
    if (count > 0) {
      setSearchSuccessAlert(`成功为您在 ${regionDisplay} 检索并提取出 ${count} 条符合关键词的真实 POI 商业线索！`);
    } else {
      setSearchSuccessAlert(`在该区域（${regionDisplay}）内未检索到与“${keywords.join('、')}”匹配的真实店铺线索。已按真实结果呈现（0条），未生成异地或无关店铺凑数。`);
    }
  };

  // Filter leads in table
  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const matchesSearch =
        !tableSearchQuery ||
        item.name.includes(tableSearchQuery) ||
        item.address.includes(tableSearchQuery) ||
        item.category.includes(tableSearchQuery);

      return matchesSearch;
    });
  }, [leads, tableSearchQuery]);

  // Page slice
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(new Set(paginatedLeads.map((l) => l.id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedLeadIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedLeadIds(next);
  };

  const handleBatchSaveClick = () => {
    if (selectedLeadIds.size === 0) return;
    onBatchSave(Array.from(selectedLeadIds));
    setSelectedLeadIds(new Set());
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 xl:space-y-6 xl:p-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            <PageTitle>招商线索检索</PageTitle>
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartSearch}
            disabled={isSearching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow-md hover:shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>开始检索</span>
          </button>

          <button
            onClick={handleStartSearch}
            disabled={isSearching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow-md hover:shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            <span>一键批量检索</span>
          </button>
        </div>
      </div>

      {searchSuccessAlert && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{searchSuccessAlert}</span>
          </div>
          <button
            onClick={() => setSearchSuccessAlert(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Form Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Target Keywords */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                包含关键词 / 经营类目 (每行一个)
              </label>
            </div>
            {/* Quick preset category tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {['咖啡店', '奶茶', '轻食', '酒吧', '火锅', '健身房', '宠物店', '烘焙'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    const lines = targetKeywordsText.split('\n').map((s) => s.trim()).filter(Boolean);
                    if (!lines.includes(preset)) {
                      setTargetKeywordsText([...lines, preset].join('\n'));
                    }
                  }}
                  className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-blue-100 hover:text-blue-900 border border-slate-200 rounded text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <textarea
              value={targetKeywordsText}
              onChange={(e) => setTargetKeywordsText(e.target.value)}
              rows={4}
              placeholder="咖啡店&#10;奶茶&#10;轻食&#10;任意自定义经营类目"
              className="w-full p-3 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
            />
          </div>

          {/* Excluded Keywords */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              排除关键词 (每行一个)
            </label>
            <textarea
              value={excludedKeywordsText}
              onChange={(e) => setExcludedKeywordsText(e.target.value)}
              rows={4}
              placeholder="加盟代办&#10;设备回收"
              className="w-full p-3 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
            />
          </div>

          {/* Region Selector */}
          <div>
            <RegionSelector
              selectedProvName={selectedProvName}
              selectedCityName={selectedCityName}
              selectedDistName={selectedDistName}
              onRegionChange={(prov, city, dist) => {
                setSelectedProvName(prov);
                setSelectedCityName(city);
                setSelectedDistName(dist);
              }}
              searchLimit={searchLimit}
              onSearchLimitChange={handleLimitChange}
            />
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="过滤结果..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-md">
              线索总量: <strong className="font-mono text-sm">{filteredLeads.length}</strong> 条
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchSaveClick}
              disabled={selectedLeadIds.size === 0}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-800" />
              批量保存 ({selectedLeadIds.size})
            </button>

            <button
              onClick={() => onExportCsv(filteredLeads)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              导出 CSV
            </button>

            <button
              onClick={() => onExportJson(filteredLeads)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              导出 JSON
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedLeads.length > 0 &&
                      paginatedLeads.every((l) => selectedLeadIds.has(l.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-800 focus:ring-blue-800"
                  />
                </th>
                <th className="p-3 font-semibold text-slate-800">商户名称</th>
                <th className="p-3 font-semibold text-slate-800">经营类目</th>
                <th className="p-3 font-semibold text-slate-800">命中关键词</th>
                <th className="p-3 font-semibold text-slate-800">省/市/区县</th>
                <th className="p-3 font-semibold text-slate-800">门牌地址</th>
                <th className="p-3 font-semibold text-slate-800">联系电话</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedLeads.map((item) => {
                const isChecked = selectedLeadIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.isExcludedHit ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleSelectOne(item.id, e.target.checked)
                        }
                        className="rounded border-slate-300 text-blue-800 focus:ring-blue-800"
                      />
                    </td>

                    <td className="p-3 font-bold text-slate-900">
                      {item.name}
                    </td>

                    <td className="p-3 text-slate-600">{item.category}</td>

                    <td className="p-3">
                      {item.isExcludedHit ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                          {item.excludedKeyword || '排除词'} (Excluded)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-900 border border-blue-200">
                          {item.matchedKeyword || item.category || '核心业务'}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-slate-600 font-medium">
                      {formatRegion(item.province, item.city, item.district)}
                    </td>

                    <td className="p-3 text-slate-600 max-w-xs truncate">
                      {item.address}
                    </td>

                    <td className="p-3 font-mono text-xs text-slate-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{item.tel || '暂无'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedLeads.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-slate-400 text-xs"
                  >
                    未找到符合条件的线索记录。请点击“开始检索”获取真实 POI 线索。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div>
              显示第 {filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} 至{' '}
              {Math.min(currentPage * pageSize, filteredLeads.length)} 条 ，共{' '}
              <strong className="text-slate-800 font-mono">
                {filteredLeads.length.toLocaleString()}
              </strong>{' '}
              条结果
            </div>

            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span className="text-slate-500 font-medium text-[11px]">每页显示:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 border border-slate-200 rounded text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-800"
              >
                <option value={20}>20 条</option>
                <option value={50}>50 条</option>
                <option value={100}>100 条</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-blue-900 text-white font-semibold rounded text-xs font-mono">
              {currentPage}
            </span>

            <span className="text-slate-400">/ {totalPages}</span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
