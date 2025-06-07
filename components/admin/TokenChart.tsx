'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TokenUsage } from '@/mock/adminData';

interface TokenChartProps {
  data: TokenUsage[];
}

export default function TokenChart({ data }: TokenChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">トークン利用状況</h3>
          <p className="text-sm text-gray-500">日次利用量と売上</p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">売上 (¥)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">トークン使用量</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => new Date(value).getDate().toString()}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
              formatter={(value: number, name: string) => [
                name === 'revenue' ? `¥${value.toLocaleString()}` : value.toLocaleString(),
                name === 'revenue' ? '売上' : 'トークン使用量'
              ]}
            />
            <Area
              type="monotone"
              dataKey="tokensUsed"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-center space-x-8 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data.reduce((sum, item) => sum + item.tokensUsed, 0).toLocaleString()}
          </div>
          <div className="text-gray-500">週間トークン使用量</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            ¥{data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
          </div>
          <div className="text-gray-500">週間売上</div>
        </div>
      </div>
    </div>
  );
}