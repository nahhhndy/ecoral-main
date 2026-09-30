'use client'
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Activity,
  Sparkles,
  BarChart3,
  Database,
  HeartPulse,
  Bell,
  ShieldAlert,
  Radio,
  Map,
  History,
  FileText,
  FolderKanban,
  Play,
  CheckCircle2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { predictApi } from '@/lib/api'
import { PredictionResult } from '@/types'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import dynamic from 'next/dynamic'

const ScenarioSimulator = dynamic(
  () => import('@/components/simulation/ScenarioSimulator'),
  {
    loading: () => (
      <div className="h-64 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex items-center justify-center">
        <span className="text-xs text-[#8FA6B8] animate-pulse">Loading Simulation Engine...</span>
      </div>
    ),
  }
)

const GlobalIntelligenceWidget = dynamic(
  () => import('@/components/intelligence/GlobalIntelligenceWidget'),
  {
    loading: () => (
      <div className="h-64 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex items-center justify-center">
        <span className="text-xs text-[#8FA6B8] animate-pulse">Loading Intelligence Telemetry...</span>
      </div>
    ),
  }
)

const BleachingForecastingWidget = dynamic(
  () => import('@/components/forecasting/BleachingForecastingWidget'),
  {
    loading: () => (
      <div className="h-64 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex items-center justify-center">
        <span className="text-xs text-[#8FA6B8] animate-pulse">Loading Forecasting Widget...</span>
      </div>
    ),
  }
)


const predictSchema = z.object({
  latitude: z.coerce.number().min(-90, 'Min -90').max(90, 'Max 90'),
  longitude: z.coerce.number().min(-180, 'Min -180').max(180, 'Max 180'),
  sea_surface_temperature: z.coerce.number().min(-2, 'Min -2°C').max(40, 'Max 40°C'),
  location_name: z.string().optional(),
})

type PredictForm = z.infer<typeof predictSchema>

// Ocean Health Score Radial Meter
function OceanHealthScoreWidget({ score }: { score: number }) {
  const color = score >= 75 ? '#27D980' : score >= 50 ? '#FFB547' : '#FF5A6E'
  const label = score >= 75 ? 'Optimal Sanctuary Status' : score >= 50 ? 'Moderate Thermal Stress' : 'Critical Ecosystem Strain'

  return (
    <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
      <div className="absolute top-3 right-3 text-[#8FA6B8]/40 group-hover:text-[#18C8FF] transition-colors">
        <HeartPulse className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FA6B8] mb-0.5">Derived Ocean Health Index</span>
      <span className="text-[9px] text-[#8FA6B8]/70 font-mono mb-2">100 - (High Risk % × 0.8)</span>
      <div className="relative w-32 h-32 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-[#122535]"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            strokeWidth="3.5"
            strokeDasharray={`${score}, 100`}
            stroke={color}
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-extrabold text-[#F5FAFC]">{score.toFixed(1)}</span>
          <span className="text-[9px] text-[#8FA6B8] uppercase font-bold tracking-wider">/ 100 Index</span>
        </div>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color }}>
        {label}
      </span>
    </div>
  )
}

// Global Risk Index Gauge Card
function GlobalRiskIndexWidget({ riskPct }: { riskPct: number }) {
  const levelColor = riskPct >= 50 ? '#FF5A6E' : riskPct >= 25 ? '#FFB547' : '#27D980'
  const riskLabel = riskPct >= 50 ? 'HIGH VULNERABILITY PHASE' : riskPct >= 25 ? 'ELEVATED WATCH PHASE' : 'STABLE BASELINE PHASE'

  return (
    <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex flex-col justify-between shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FA6B8]">Global Risk Index</span>
        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ color: levelColor, backgroundColor: `${levelColor}20` }}>
          {riskLabel}
        </span>
      </div>

      <div className="my-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-extrabold text-[#F5FAFC]">{riskPct.toFixed(1)}%</span>
          <span className="text-xs text-[#8FA6B8] font-mono font-medium">Risk Proportion</span>
        </div>
        <div className="w-full bg-[#122535] rounded-full h-2 mt-3 overflow-hidden border border-[#24475F]">
          <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${riskPct}%`, backgroundColor: levelColor }} />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-[#8FA6B8] border-t border-[#24475F]/60 pt-2 font-mono">
        <span>0% Baseline</span>
        <span>50% Threshold</span>
        <span>100% Critical</span>
      </div>
    </div>
  )
}

export default function ExecutiveMonitoringCenterPage() {
  const qc = useQueryClient()
  const predictorRef = useRef<HTMLDivElement>(null)
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [lastPrediction, setLastPrediction] = useState<PredictionResult | null>(null)

  const {
    statsLoading,
    totalPredictions,
    hasPredictions,
    highRiskCount,
    lowRiskCount,
    highRiskPct,
    oceanHealthScore,
    avgConfidenceDisplay,
    rocAucDisplay,
    accuracyDisplay,
    topRiskyLocations,
    thermalAlert,
    recommendations,
    trendData,
  } = useDashboardData()

  const predictMutation = useMutation({
    mutationFn: predictApi.predict,
    onSuccess: (data: PredictionResult) => {
      setLastPrediction(data)
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trends'] })
      qc.invalidateQueries({ queryKey: ['analytics-detailed'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<PredictForm>({
    resolver: zodResolver(predictSchema),
    defaultValues: { latitude: 16.5, longitude: 120.2, sea_surface_temperature: 29.4, location_name: 'South China Sea Reef' }
  })

  const scrollToPredictor = () => {
    predictorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredLocations = topRiskyLocations.filter(r => {
    if (filterPriority === 'high') return r.risk_probability >= 0.5 || r.risk_label === 'High Risk'
    if (filterPriority === 'low') return r.risk_probability < 0.5 || r.risk_label === 'Low Risk'
    return true
  })

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto text-[#F5FAFC]">
      {/* Executive Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#24475F]/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-[#18C8FF] animate-pulse" />
            <h1 className="font-display text-2xl xl:text-3xl font-extrabold text-[#F5FAFC]">Executive Environmental Monitoring Center</h1>
            <span className="px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30">
              Live Global Telemetry Feed
            </span>
          </div>
          <p className="text-xs text-[#8FA6B8] mt-1">High-resolution spatial risk intelligence, thermal anomaly alerts, and automated AI decision support</p>
        </div>

        {/* Primary Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={scrollToPredictor}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-extrabold text-xs hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#18C8FF]/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Prediction
          </button>
          <Link
            href="/map"
            className="px-3.5 py-2.5 rounded-xl bg-[#122535] border border-[#24475F] text-[#F5FAFC] font-semibold text-xs hover:border-[#18C8FF] transition-all flex items-center gap-1.5"
          >
            <Map className="w-3.5 h-3.5 text-[#18C8FF]" /> Explore Map
          </Link>
          <Link
            href="/history"
            className="px-3.5 py-2.5 rounded-xl bg-[#122535] border border-[#24475F] text-[#F5FAFC] font-semibold text-xs hover:border-[#18C8FF] transition-all flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-[#5EEAD4]" /> View History
          </Link>
          <Link
            href="/reports"
            className="px-3.5 py-2.5 rounded-xl bg-[#122535] border border-[#24475F] text-[#F5FAFC] font-semibold text-xs hover:border-[#18C8FF] transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[#FFB547]" /> Reports
          </Link>
          <Link
            href="/workspace"
            className="px-3.5 py-2.5 rounded-xl bg-[#122535] border border-[#24475F] text-[#F5FAFC] font-semibold text-xs hover:border-[#18C8FF] transition-all flex items-center gap-1.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#18C8FF]" /> Research Workspace
          </Link>
        </div>
      </div>

      {/* SECTION 1: Dynamic Environmental Alert Stream */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xl transition-all ${
          thermalAlert.isCritical
            ? 'border-[#FF5A6E]/40 bg-[#FF5A6E]/10'
            : 'border-[#27D980]/40 bg-[#27D980]/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              thermalAlert.isCritical
                ? 'bg-[#FF5A6E]/20 border-[#FF5A6E]/40 text-[#FF5A6E]'
                : 'bg-[#27D980]/20 border-[#27D980]/40 text-[#27D980]'
            }`}
          >
            {thermalAlert.isCritical ? (
              <Bell className="w-5 h-5 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2">
              {thermalAlert.title}
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                  thermalAlert.isCritical
                    ? 'bg-[#FF5A6E] text-[#07131E]'
                    : 'bg-[#27D980] text-[#07131E]'
                }`}
              >
                {thermalAlert.levelText}
              </span>
            </h3>
            <p className="text-xs text-[#8FA6B8] mt-0.5">{thermalAlert.description}</p>
          </div>
        </div>
        <Link
          href="/map"
          className={`px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition-all shrink-0 cursor-pointer shadow-md ${
            thermalAlert.isCritical ? 'bg-[#FF5A6E] text-[#07131E]' : 'bg-[#27D980] text-[#07131E]'
          }`}
        >
          View Telemetry Map
        </Link>
      </div>

      {/* SECTION 2: Global KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlobalRiskIndexWidget riskPct={highRiskPct} />

        <OceanHealthScoreWidget score={oceanHealthScore} />

        <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex flex-col justify-between shadow-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FA6B8]">Total Telemetry Predictions</span>
          <div className="my-2">
            <span className="font-display text-4xl font-extrabold text-[#F5FAFC]">
              {statsLoading ? '...' : totalPredictions}
            </span>
            <span className="text-xs text-[#27D980] block font-medium mt-1">Logged Telemetry Records</span>
          </div>
          <div className="text-[10px] text-[#8FA6B8] border-t border-[#24475F]/60 pt-2 font-mono flex justify-between">
            <span>High Risk: <strong className="text-[#FF5A6E]">{highRiskCount}</strong></span>
            <span>Low Risk: <strong className="text-[#27D980]">{lowRiskCount}</strong></span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] flex flex-col justify-between shadow-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FA6B8]">Model Precision Metrics</span>
          <div className="my-2">
            <span className="font-display text-4xl font-extrabold text-[#5EEAD4]">
              {rocAucDisplay}
            </span>
            <span className="text-xs text-[#5EEAD4] block font-medium mt-1">ROC AUC Metric</span>
          </div>
          <div className="text-[10px] text-[#8FA6B8] border-t border-[#24475F]/60 pt-2 font-mono flex justify-between">
            <span>Accuracy: <strong className="text-[#18C8FF]">{accuracyDisplay}</strong></span>
            <span>Avg Confidence: <strong className="text-[#5EEAD4]">{avgConfidenceDisplay}</strong></span>
          </div>
        </div>
      </div>

      {/* Global Background Intelligence Engine */}
      <GlobalIntelligenceWidget />

      {/* Coral Bleaching Predictive Forecasting Module */}
      <BleachingForecastingWidget />

      {/* SECTION 4: Active High-Risk Regions Leaderboard & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24475F]/60 pb-3">
            <div>
              <h2 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF5A6E]" /> Active High-Risk Ocean Regions
              </h2>
              <p className="text-[11px] text-[#8FA6B8] mt-0.5">Ranked by thermal vulnerability probability</p>
            </div>

            <div className="flex items-center gap-1.5 bg-[#122535] p-1 rounded-lg border border-[#24475F]">
              {['all', 'high', 'low'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPriority(f)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    filterPriority === f
                      ? 'bg-[#18C8FF] text-[#07131E]'
                      : 'text-[#8FA6B8] hover:text-[#F5FAFC]'
                  }`}
                >
                  {f === 'all' ? 'All Sectors' : f === 'high' ? 'High Risk' : 'Low Vulnerability'}
                </button>
              ))}
            </div>
          </div>

          {filteredLocations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredLocations.map((r) => {
                const isHigh = r.risk_probability >= 0.5 || r.risk_label === 'High Risk'
                return (
                  <div
                    key={`${r.location_name}-${r.latitude}-${r.longitude}`}
                    className="p-3.5 rounded-xl border border-[#24475F] bg-[#122535] flex items-center justify-between text-xs space-x-2"
                  >
                    <div className="space-y-1 truncate">
                      <span className="font-bold text-[#F5FAFC] block truncate">{r.location_name}</span>
                      <span className="text-[10px] text-[#8FA6B8] font-mono block">
                        {r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}° · <strong className="text-[#18C8FF]">{r.max_sea_surface_temperature.toFixed(1)}°C</strong>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase block ${
                          isHigh ? 'bg-[#FF5A6E]/15 text-[#FF5A6E]' : 'bg-[#27D980]/15 text-[#27D980]'
                        }`}
                      >
                        {(r.risk_probability * 100).toFixed(1)}% Risk
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-10 text-center border border-dashed border-[#24475F]/60 rounded-xl bg-[#122535]/40 text-[#8FA6B8] p-6 space-y-2">
              <Database className="w-8 h-8 text-[#8FA6B8]/40 mx-auto" />
              <p className="text-xs font-bold text-[#F5FAFC]">No High-Risk Sectors Logged</p>
              <p className="text-[11px] text-[#8FA6B8]">Run your first environmental prediction to populate real regional risk rankings.</p>
              <button
                onClick={scrollToPredictor}
                className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
              >
                Run Prediction Now
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Context-Specific AI Recommendations Card */}
        <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            <h2 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-[#18C8FF]" /> Actionable AI Recommendations
            </h2>
            <p className="text-[11px] text-[#8FA6B8]">Context-specific intervention protocols</p>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            {recommendations.map((rec) => (
              <div
                key={rec.priority}
                className="p-3 rounded-lg border bg-[#122535] space-y-1"
                style={{ borderColor: rec.badgeColor }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: rec.badgeColor }}>
                  {rec.title}
                </span>
                <p className="text-[#F5FAFC]">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: Monthly Analytics Trends */}
      <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#24475F]/60 pb-3">
          <div>
            <h2 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#18C8FF]" /> Monthly Bleaching Vulnerability Analytics (30 Days)
            </h2>
            <p className="text-[11px] text-[#8FA6B8] mt-0.5">30-day temporal tracking of high vs low risk occurrences</p>
          </div>
        </div>

        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="highRiskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF5A6E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF5A6E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
              <Tooltip contentStyle={{ background: '#122535', borderColor: '#24475F', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="high_risk" name="High Risk Count" stroke="#FF5A6E" fill="url(#highRiskGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center border border-dashed border-[#24475F]/60 rounded-lg bg-[#07131E]/40 text-center p-6 space-y-2">
            <Database className="w-8 h-8 text-[#8FA6B8]/50" />
            <p className="text-xs font-bold text-[#F5FAFC]">No Predictions Logged Yet</p>
            <p className="text-[11px] text-[#8FA6B8] max-w-sm">Run your first environmental risk assessment below or from the Ocean Map to populate analytics.</p>
            <button
              onClick={scrollToPredictor}
              className="mt-2 px-4 py-2 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
            >
              Run First Environmental Assessment
            </button>
          </div>
        )}
      </div>

      {/* Climate Scenario Simulator */}
      <ScenarioSimulator />

      {/* Live Telemetry Risk Predictor Form */}
      <div ref={predictorRef} className="p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl">
        <div className="flex items-center justify-between mb-5 border-b border-[#24475F]/60 pb-3">
          <div>
            <h2 className="font-display font-bold text-[#F5FAFC] text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#18C8FF]" /> Live Telemetry Risk Predictor
            </h2>
            <p className="text-xs text-[#8FA6B8] mt-0.5">Instant XGBoost evaluation and SHAP explainability analysis</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => predictMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase tracking-wider">Latitude (°N/S)</label>
              <input
                {...register('latitude')}
                type="text"
                placeholder="16.5"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
              />
              {errors.latitude && <p className="text-[11px] text-[#FF5A6E] mt-1">{errors.latitude.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase tracking-wider">Longitude (°E/W)</label>
              <input
                {...register('longitude')}
                type="text"
                placeholder="120.2"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
              />
              {errors.longitude && <p className="text-[11px] text-[#FF5A6E] mt-1">{errors.longitude.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase tracking-wider">Sea Surface Temp (°C)</label>
              <input
                {...register('sea_surface_temperature')}
                type="text"
                placeholder="29.4"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
              />
              {errors.sea_surface_temperature && <p className="text-[11px] text-[#FF5A6E] mt-1">{errors.sea_surface_temperature.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase tracking-wider">Location Label (Optional)</label>
              <input
                {...register('location_name')}
                type="text"
                placeholder="e.g. Coral Triangle Reef"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={predictMutation.isPending}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md shadow-[#18C8FF]/15 cursor-pointer"
            >
              {predictMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#07131E]/30 border-t-[#07131E] rounded-full animate-spin" />
                  <span>Computing Risk...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Prediction</span>
                </>
              )}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {lastPrediction && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-6 p-5 rounded-xl border bg-[#07131E]/80 backdrop-blur-sm"
              style={{ borderColor: lastPrediction.prediction === 1 ? '#FF5A6E' : '#27D980' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#24475F]/60">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    lastPrediction.prediction === 1
                      ? 'bg-[#FF5A6E]/15 text-[#FF5A6E] border border-[#FF5A6E]/30'
                      : 'bg-[#27D980]/15 text-[#27D980] border border-[#27D980]/30'
                  }`}>
                    {lastPrediction.label}
                  </span>
                  <span className="text-xs text-[#8FA6B8] font-medium">
                    {lastPrediction.location_name || `${lastPrediction.latitude}°N, ${lastPrediction.longitude}°E`}
                  </span>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-[#8FA6B8] block text-[10px] uppercase font-semibold">Bleaching Probability</span>
                    <span className="font-display font-bold text-sm text-[#F5FAFC]">{(lastPrediction.probability * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[#8FA6B8] block text-[10px] uppercase font-semibold">Model Confidence</span>
                    <span className="font-display font-bold text-sm text-[#F5FAFC]">{(lastPrediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[#8FA6B8] block text-[10px] uppercase font-semibold">Input SST</span>
                    <span className="font-display font-bold text-sm text-[#18C8FF]">{lastPrediction.sea_surface_temperature}°C</span>
                  </div>
                </div>
              </div>

              {lastPrediction.explanation && (
                <div className="mt-4 p-4 rounded-lg bg-[#122535]/80 border border-[#24475F]">
                  <h4 className="text-xs font-bold text-[#18C8FF] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Model Explainability (SHAP Analysis)
                  </h4>
                  <p className="text-xs text-[#F5FAFC] leading-relaxed">
                    {lastPrediction.explanation.replace(/\*\*/g, '')}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
