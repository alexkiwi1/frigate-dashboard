import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendData, ViolationsResponse } from '../../types/api';

interface ChartsProps {
  trendData: TrendData | null;
  violationsData: ViolationsResponse | null;
  loading: boolean;
}

const Charts: React.FC<ChartsProps> = ({ trendData, violationsData, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-2">
        <div className="card">
          <h3>Productivity Trends</h3>
          <div className="loading">Loading chart data...</div>
        </div>
        <div className="card">
          <h3>Violations by Severity</h3>
          <div className="loading">Loading chart data...</div>
        </div>
      </div>
    );
  }

  // Prepare productivity data
  const productivityData = trendData?.productivity_trends?.daily?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    productivity: item.average,
    employees: item.employees
  })) || [];

  // Prepare hourly productivity data
  const hourlyData = trendData?.productivity_trends?.hourly?.map(item => ({
    hour: `${item.hour}:00`,
    productivity: item.average
  })) || [];

  // Prepare violations data
  const violationsBySeverity = violationsData?.summary?.by_severity ? 
    Object.entries(violationsData.summary.by_severity).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: severity === 'high' ? '#ef4444' : severity === 'medium' ? '#f59e0b' : '#10b981'
    })) : [];

  const violationsByEmployee = violationsData?.summary?.by_employee ? 
    Object.entries(violationsData.summary.by_employee)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([employee, count]) => ({
        name: employee,
        violations: count
      })) : [];

  return (
    <div className="grid grid-2">
      {/* Productivity Trends */}
      <div className="card">
        <h3>Productivity Trends (Daily)</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'productivity' ? `${value}%` : value,
                  name === 'productivity' ? 'Productivity' : 'Employees'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="productivity" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Violations by Severity */}
      <div className="card">
        <h3>Violations by Severity</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={violationsBySeverity}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {violationsBySeverity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} violations`, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Productivity */}
      <div className="card">
        <h3>Hourly Productivity</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Productivity']} />
              <Bar dataKey="productivity" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Violators */}
      <div className="card">
        <h3>Top Violators</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={violationsByEmployee} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => [`${value} violations`, 'Count']} />
              <Bar dataKey="violations" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Charts;
