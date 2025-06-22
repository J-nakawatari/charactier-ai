'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface QuickStatsProps {
  financial?: {
    totalRevenue?: number;
    availableBalance?: number;
    creditLimit?: number;
    outstandingDebt?: number;
    projectedBalance14Days?: number;
  };
  evaluation?: {
    overallScore?: number;
    breakdown?: {
      excellent?: number;
      good?: number;
      needsImprovement?: number;
    };
  };
}

export default function QuickStats({ financial, evaluation }: QuickStatsProps = {}) {
  // デフォルト値
  const defaultFinancial = {
    availableBalance: 1768,
    creditLimit: 3000,
    outstandingDebt: -1232,
    projectedBalance14Days: 1543
  };

  const defaultEvaluation = {
    overallScore: 85,
    breakdown: {
      excellent: 65,
      good: 25,
      needsImprovement: 10
    }
  };

  const actualFinancial = { ...defaultFinancial, ...financial };
  const actualEvaluation = { ...defaultEvaluation, ...evaluation };

  const evaluationData = [
    { name: '優秀', value: actualEvaluation.breakdown.excellent || 0, color: '#10b981' },
    { name: '良好', value: actualEvaluation.breakdown.good || 0, color: '#f59e0b' },
    { name: '要改善', value: actualEvaluation.breakdown.needsImprovement || 0, color: '#ef4444' }
  ];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">評価スコア</h3>
        <p className="text-sm text-gray-500">システム全体の健全性</p>
      </div>

      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={evaluationData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {evaluationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`${value}%`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-gray-900">{actualEvaluation.overallScore}%</div>
        <div className="text-sm text-gray-500">総合スコア</div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">利用可能</span>
          <span className="font-semibold">¥{actualFinancial.availableBalance.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">制限</span>
          <span className="font-semibold">¥{actualFinancial.creditLimit.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">負債</span>
          <span className="font-semibold text-red-600">¥{actualFinancial.outstandingDebt.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        今後14日間で¥{actualFinancial.projectedBalance14Days.toLocaleString()}の残高があります
        <button className="block text-purple-600 hover:text-purple-700 mt-1">
          詳細を表示 →
        </button>
      </div>
    </div>
  );
}