import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AmapPOI } from '../types';
import { PieChart, BarChart2, ChevronDown, ChevronUp, Sparkles, Filter } from 'lucide-react';

interface D3IndustryDistributionChartProps {
  pois: AmapPOI[];
  selectedCategories?: string[];
  onToggleCategory?: (category: string) => void;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

const PALETTE = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#64748b', // Slate
];

export const D3IndustryDistributionChart: React.FC<D3IndustryDistributionChartProps> = ({
  pois,
  selectedCategories = [],
  onToggleCategory,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<'pie' | 'bar'>('pie');
  const [isMinimized, setIsMinimized] = useState(false);
  const [hoveredData, setHoveredData] = useState<CategoryStat | null>(null);

  // Calculate industry statistics
  const stats: CategoryStat[] = React.useMemo(() => {
    if (!pois || pois.length === 0) return [];

    const counts: Record<string, number> = {};
    pois.forEach((poi) => {
      const cat = poi.categoryType || poi.category || '其他';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = pois.length;
    const sorted = Object.entries(counts)
      .map(([category, count], idx) => ({
        category,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
        color: PALETTE[idx % PALETTE.length],
      }))
      .sort((a, b) => b.count - a.count);

    return sorted;
  }, [pois]);

  // Render D3 Visualizations
  useEffect(() => {
    if (isMinimized || !svgRef.current || stats.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawings

    const width = 240;
    const height = 180;
    const radius = Math.min(width, height) / 2 - 10;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    if (activeTab === 'pie') {
      // 1. D3 Donut Chart
      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      const pie = d3
        .pie<CategoryStat>()
        .value((d) => d.count)
        .sort(null);

      const arc = d3
        .arc<d3.PieArcDatum<CategoryStat>>()
        .innerRadius(radius * 0.52)
        .outerRadius(radius * 0.88)
        .cornerRadius(4);

      const arcHover = d3
        .arc<d3.PieArcDatum<CategoryStat>>()
        .innerRadius(radius * 0.5)
        .outerRadius(radius * 0.95)
        .cornerRadius(4);

      const arcs = g
        .selectAll('.arc')
        .data(pie(stats))
        .enter()
        .append('g')
        .attr('class', 'arc');

      // Draw slices with transition
      arcs
        .append('path')
        .attr('fill', (d) => d.data.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .transition()
        .duration(600)
        .attrTween('d', function (d) {
          const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return function (t) {
            return arc(i(t)) || '';
          };
        });

      // Mouse events
      arcs
        .selectAll('path')
        .on('mouseover', function (event, d) {
          const sliceData = d as unknown as d3.PieArcDatum<CategoryStat>;
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arcHover as any);
          setHoveredData(sliceData.data);
        })
        .on('mouseout', function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arc as any);
          setHoveredData(null);
        })
        .on('click', function (event, d) {
          const sliceData = d as unknown as d3.PieArcDatum<CategoryStat>;
          if (onToggleCategory) {
            onToggleCategory(sliceData.data.category);
          }
        });

      // Center text
      const centerText = g
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#1e293b');

      centerText.text(`${pois.length}家`);

      const centerSub = g
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .style('font-size', '9px')
        .style('fill', '#64748b');

      centerSub.text('商户总数');
    } else {
      // 2. D3 Horizontal Bar Chart
      const margin = { top: 10, right: 35, bottom: 10, left: 60 };
      const barWidth = width - margin.left - margin.right;
      const barHeight = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const topStats = stats.slice(0, 6);

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(topStats, (d) => d.percentage) || 100])
        .range([0, barWidth]);

      const y = d3
        .scaleBand()
        .domain(topStats.map((d) => d.category))
        .range([0, barHeight])
        .padding(0.3);

      // Bars
      g.selectAll('.bar')
        .data(topStats)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', (d) => y(d.category) || 0)
        .attr('height', y.bandwidth())
        .attr('rx', 3)
        .attr('fill', (d) => d.color)
        .style('cursor', 'pointer')
        .attr('width', 0)
        .transition()
        .duration(600)
        .attr('width', (d) => x(d.percentage));

      // Category labels
      g.selectAll('.label')
        .data(topStats)
        .enter()
        .append('text')
        .attr('x', -6)
        .attr('y', (d) => (y(d.category) || 0) + y.bandwidth() / 2 + 3)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .style('fill', '#475569')
        .text((d) => d.category);

      // Percentage labels
      g.selectAll('.val-label')
        .data(topStats)
        .enter()
        .append('text')
        .attr('x', (d) => x(d.percentage) + 4)
        .attr('y', (d) => (y(d.category) || 0) + y.bandwidth() / 2 + 3)
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('fill', '#1e293b')
        .text((d) => `${d.percentage}%`);
    }
  }, [stats, activeTab, isMinimized, pois.length]);

  if (!pois || pois.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-lg text-xs text-slate-500 w-80">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>区域行业占比 (D3)</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">当前搜索范围内暂无检索到商户数据</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xl overflow-hidden transition-all duration-300 w-80 z-20"
    >
      {/* Panel Header */}
      <div className="bg-slate-50/90 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="p-1 bg-blue-100 text-blue-700 rounded-md">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="font-extrabold text-xs text-slate-800">
            区域商户行业分布 (D3)
          </span>
          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
            {pois.length} 家
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!isMinimized && (
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded text-[10px] font-semibold">
              <button
                onClick={() => setActiveTab('pie')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === 'pie'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
                title="环形占比图"
              >
                <PieChart className="w-3 h-3" />
              </button>
              <button
                onClick={() => setActiveTab('bar')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === 'bar'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
                title="条形百分比图"
              >
                <BarChart2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3 space-y-3">
          {/* D3 SVG Canvas */}
          <div className="flex justify-center items-center relative bg-slate-50/50 rounded-lg p-1 border border-slate-100">
            <svg ref={svgRef} className="w-full h-44 overflow-visible" />

            {/* Hover Tooltip Overlay */}
            {hoveredData && activeTab === 'pie' && (
              <div className="absolute top-2 right-2 bg-slate-900/90 text-white px-2 py-1 rounded text-[10px] shadow-md border border-slate-700 pointer-events-none">
                <div className="font-bold">{hoveredData.category}</div>
                <div>
                  {hoveredData.count} 家 ({hoveredData.percentage}%)
                </div>
              </div>
            )}
          </div>

          {/* Detailed Percentage Legend List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {stats.map((stat) => {
              const isSelected = selectedCategories.includes(stat.category);

              return (
                <div
                  key={stat.category}
                  onClick={() => onToggleCategory && onToggleCategory(stat.category)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold'
                      : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="truncate text-[11px]">{stat.category}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono shrink-0 text-[11px]">
                    <span className="text-slate-500">{stat.count}家</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                      {stat.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
