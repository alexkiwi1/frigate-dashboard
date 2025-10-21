import axios, { AxiosInstance } from 'axios';
import {
  ApiResponse,
  WorkHoursResponse,
  BreakTimeResponse,
  AttendanceResponse,
  CameraSummary,
  CameraActivity,
  ViolationsResponse,
  DashboardData,
  TrendData,
  Timezone,
  TimezoneInfo,
  EmployeeActivityPattern,
  ApiParams
} from '../types/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Employee APIs
  async getEmployeeWorkHours(params: ApiParams = {}): Promise<WorkHoursResponse> {
    try {
      // Get timeline events for all cameras
      const cameras = await this.getCameras();
      const allEvents = [];
      
      for (const camera of cameras) {
        const response = await this.api.get('/timeline', {
          params: {
            camera: camera,
            limit: 1000,
            ...params
          }
        });
        if (response.data.events) {
          allEvents.push(...response.data.events);
        }
      }

      // Process events to create employee work hours
      const employees = this.processTimelineEventsToWorkHours(allEvents, params.timezone || 'PKT');
      
      return {
        employees,
        total_employees: employees.length,
        total_work_hours: employees.reduce((sum, emp) => sum + emp.total_work_hours, 0),
        average_work_hours: employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.total_work_hours, 0) / employees.length : 0,
        period: {
          start: this.formatUnixTimestamp(Date.now() / 1000 - 24 * 3600, params.timezone || 'PKT'),
          end: this.formatUnixTimestamp(Date.now() / 1000, params.timezone || 'PKT'),
          duration_hours: 24
        },
        timezone_info: this.getTimezoneInfo(params.timezone || 'PKT')
      };
    } catch (error) {
      console.error('Error fetching employee work hours:', error);
      return {
        employees: [],
        total_employees: 0,
        total_work_hours: 0,
        average_work_hours: 0,
        period: {
          start: this.formatUnixTimestamp(Date.now() / 1000 - 24 * 3600, params.timezone || 'PKT'),
          end: this.formatUnixTimestamp(Date.now() / 1000, params.timezone || 'PKT'),
          duration_hours: 24
        },
        timezone_info: this.getTimezoneInfo(params.timezone || 'PKT')
      };
    }
  }

  async getEmployeeBreakTime(params: ApiParams = {}): Promise<BreakTimeResponse> {
    const response = await this.api.get<ApiResponse<BreakTimeResponse>>('/employees/break-time', {
      params
    });
    return response.data.data;
  }

  async getEmployeeAttendance(params: ApiParams = {}): Promise<AttendanceResponse> {
    const response = await this.api.get<ApiResponse<AttendanceResponse>>('/employees/attendance', {
      params
    });
    return response.data.data;
  }

  async getEmployeeActivityPatterns(params: ApiParams = {}): Promise<EmployeeActivityPattern[]> {
    const response = await this.api.get<ApiResponse<EmployeeActivityPattern[]>>('/employees/activity-patterns', {
      params
    });
    return response.data.data;
  }

  // Camera APIs
  async getCameraSummary(params: ApiParams = {}): Promise<CameraSummary[]> {
    const response = await this.api.get<ApiResponse<{ summaries: CameraSummary[] }>>('/cameras/summary', {
      params
    });
    return response.data.data.summaries;
  }

  async getCameraActivity(params: ApiParams = {}): Promise<CameraActivity[]> {
    const response = await this.api.get<ApiResponse<{ activities: CameraActivity[] }>>('/cameras/activity', {
      params
    });
    return response.data.data.activities;
  }

  async getCameras(): Promise<any[]> {
    const response = await this.api.get<ApiResponse<{ cameras: any[] }>>('/cameras');
    return response.data.data.cameras;
  }

  // Violation APIs
  async getCellPhoneViolations(params: ApiParams = {}): Promise<ViolationsResponse> {
    try {
      const response = await this.api.get<ApiResponse<ViolationsResponse>>('/violations/cell-phones', {
        params
      });
      return response.data.data;
    } catch (error: any) {
      // If violations endpoint doesn't exist, return empty data
      if (error.response?.status === 404) {
        return {
          violations: [],
          total_violations: 0,
          summary: {
            by_employee: {},
            by_camera: {},
            by_severity: {}
          }
        };
      }
      throw error;
    }
  }

  // Analytics APIs
  async getDashboardData(params: ApiParams = {}): Promise<DashboardData> {
    const response = await this.api.get<ApiResponse<DashboardData>>('/analytics/dashboard', {
      params
    });
    return response.data.data;
  }

  async getTrendAnalysis(params: ApiParams = {}): Promise<TrendData> {
    const response = await this.api.get<ApiResponse<TrendData>>('/analytics/trends', {
      params
    });
    return response.data.data;
  }

  // Timezone APIs
  async getAvailableTimezones(): Promise<Timezone[]> {
    const response = await this.api.get<ApiResponse<{ timezones: Timezone[] }>>('/timezone/list');
    return response.data.data.timezones;
  }

  async getTimezoneInfo(timezone: string): Promise<TimezoneInfo> {
    const response = await this.api.get<ApiResponse<TimezoneInfo>>(`/timezone/info/${timezone}`);
    return response.data.data;
  }

  // Mobile APIs
  async getMobileDashboard(params: ApiParams = {}): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/mobile/dashboard', {
      params
    });
    return response.data.data;
  }

  // Health Check
  async getHealthStatus(): Promise<{ success: boolean; message: string; timestamp: string; version: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Utility methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getDefaultParams(): ApiParams {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      start_date: this.formatDate(yesterday),
      end_date: this.formatDate(today),
      timezone: 'PKT',
      limit: 100
    };
  }
}

export default new ApiService();
