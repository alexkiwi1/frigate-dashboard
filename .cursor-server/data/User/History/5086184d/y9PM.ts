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
    try {
      // For now, return empty break data since we're focusing on work hours
      // In a real implementation, you would analyze timeline events for break patterns
      return {
        employees: [],
        total_employees: 0,
        total_break_time: 0,
        average_break_time: 0,
        timezone_info: this.getTimezoneInfo(params.timezone || 'PKT')
      };
    } catch (error) {
      console.error('Error fetching break time data:', error);
      return {
        employees: [],
        total_employees: 0,
        total_break_time: 0,
        average_break_time: 0,
        timezone_info: this.getTimezoneInfo(params.timezone || 'PKT')
      };
    }
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

  // Convert Unix timestamp to timezone-aware ISO string
  formatUnixTimestamp(unixTimestamp: number, timezone: string): string {
    const date = new Date(unixTimestamp * 1000);
    const timezoneMap = {
      'PKT': 'Asia/Karachi',
      'EST': 'America/New_York',
      'UTC': 'UTC',
      'CET': 'Europe/Paris',
      'JST': 'Asia/Tokyo'
    };
    
    const ianaTimezone = timezoneMap[timezone] || 'Asia/Karachi';
    const offset = this.getTimezoneOffset(ianaTimezone);
    
    return date.toISOString().replace('Z', offset);
  }

  // Get timezone offset string
  getTimezoneOffset(timezone: string): string {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const local = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
    const offset = (local.getTime() - utc.getTime()) / 3600000;
    
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.abs(Math.floor(offset));
    const minutes = Math.abs((offset % 1) * 60);
    
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Get timezone info
  getTimezoneInfo(timezone: string) {
    const timezoneMap = {
      'PKT': { timezone: 'Asia/Karachi', offset: '+05:00', abbreviation: 'PKT' },
      'EST': { timezone: 'America/New_York', offset: '-05:00', abbreviation: 'EST' },
      'UTC': { timezone: 'UTC', offset: '+00:00', abbreviation: 'UTC' },
      'CET': { timezone: 'Europe/Paris', offset: '+01:00', abbreviation: 'CET' },
      'JST': { timezone: 'Asia/Tokyo', offset: '+09:00', abbreviation: 'JST' }
    };
    
    return timezoneMap[timezone] || timezoneMap['PKT'];
  }

  // Process timeline events to create employee work hours
  processTimelineEventsToWorkHours(events: any[], timezone: string): any[] {
    // Group events by person (using source_id as person identifier)
    const personEvents = new Map();
    
    events.forEach(event => {
      if (event.label === 'person') {
        const personId = event.source_id;
        if (!personEvents.has(personId)) {
          personEvents.set(personId, []);
        }
        personEvents.get(personId).push(event);
      }
    });

    const employees = [];
    
    personEvents.forEach((events, personId) => {
      // Sort events by timestamp
      events.sort((a, b) => a.timestamp - b.timestamp);
      
      // Find first and last events for arrival/departure
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      
      // Calculate work hours (simplified - time between first and last event)
      const workDuration = (lastEvent.timestamp - firstEvent.timestamp) / 3600; // Convert to hours
      
      // Get unique cameras and zones
      const cameras = [...new Set(events.map(e => e.camera))];
      const zones = [...new Set(events.flatMap(e => e.zones))];
      
      employees.push({
        employee_name: `Employee ${personId.slice(-4)}`, // Use last 4 chars of source_id as name
        total_work_hours: Math.max(0, workDuration),
        arrival_time: this.formatUnixTimestamp(firstEvent.timestamp, timezone),
        departure_time: this.formatUnixTimestamp(lastEvent.timestamp, timezone),
        total_activity: events.length,
        productivity_score: Math.min(100, Math.max(0, 100 - (events.length * 0.1))),
        attendance_status: workDuration > 6 ? 'present' : workDuration > 3 ? 'half_day' : 'partial_day',
        work_efficiency: Math.min(100, Math.max(0, workDuration * 10)),
        cameras,
        zones: zones.filter(z => z && z !== 'employee_area')
      });
    });

    return employees;
  }
}

export default new ApiService();
