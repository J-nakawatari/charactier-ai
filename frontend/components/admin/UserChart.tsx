'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UserStats {
  month: string;
  activeUsers: number;
  newUsers: number;
}

interface UserChartProps {
  data: UserStats[];
}

export default function UserChart({ data }: UserChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">ユーザー推移レポート</h3>
          <p className="text-sm text-gray-500">月次アクティブユーザー数</p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">アクティブユーザー</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">新規ユーザー</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={12}
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
            />
            <Line
              type="monotone"
              dataKey="activeUsers"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, fill: '#8b5cf6' }}
            />
            <Line
              type="monotone"
              dataKey="newUsers"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-center space-x-8 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data[data.length - 1]?.activeUsers.toLocaleString()}
          </div>
          <div className="text-gray-500">今月のアクティブユーザー</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data[data.length - 1]?.newUsers.toLocaleString()}
          </div>
          <div className="text-gray-500">今月の新規ユーザー</div>
        </div>
      </div>
    </div>
  );
}