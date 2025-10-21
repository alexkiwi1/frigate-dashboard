import axios, { AxiosInstance } from 'axios';
import {
  ApiResponse,
  WorkHoursResponse,
  BreakTimeResponse,
  ViolationsResponse,
  ApiParams
} from '../types/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env['REACT_APP_API_BASE_URL'] || '/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.params);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling and v1 API format
    this.api.interceptors.response.use(
      (response) => {
        // V1 API returns {success, data, message, timestamp}
        console.log('API Response:', response.data);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Employee Work Hours API
  async getEmployeeWorkHours(params: ApiParams = {}): Promise<WorkHoursResponse> {
    try {
      const response = await this.api.get('/employees/work-hours', {
        params: {
          timezone: 'Asia/Karachi',
          ...params
        }
      });

      // V1 API response structure: {success, message, data: {employees, summary, timezone_info}}
      if (response.data.success && response.data.data) {
        const { employees, summary, timezone_info } = response.data.data;
        
        return {
          employees: employees || [],
          total_employees: summary?.total_employees || 0,
          total_work_hours: summary?.total_work_hours || 0,
          average_work_hours: summary?.average_work_hours || 0,
          period: {
            start: params.start_date || '',
            end: params.end_date || '',
            duration_hours: 24
          },
          timezone_info: timezone_info || this.getTimezoneInfo('Asia/Karachi')
        };
      }

      // Fallback if response format is unexpected
      return this.getEmptyWorkHoursResponse();
    } catch (error: any) {
      console.error('Error fetching employee work hours:', error);
      if (error.response?.status === 404) {
        console.warn('Work hours endpoint not found - returning empty data');
      }
      return this.getEmptyWorkHoursResponse();
    }
  }

  // Employee Break Time API
  async getEmployeeBreakTime(params: ApiParams = {}): Promise<BreakTimeResponse> {
    try {
      const response = await this.api.get('/employees/break-time', {
        params: {
          timezone: 'Asia/Karachi',
          ...params
        }
      });

      if (response.data.success && response.data.data) {
        const { break_sessions, summary, timezone_info } = response.data.data;
        
        // Map v1 break sessions to our format
        const employees = this.mapBreakSessionsToEmployees(break_sessions || []);
        
        return {
          employees,
          total_employees: employees.length,
          total_break_time: summary?.total_break_time || 0,
          average_break_time: summary?.average_break_duration || 0,
          timezone_info: timezone_info || this.getTimezoneInfo('Asia/Karachi')
        };
      }

      return this.getEmptyBreakTimeResponse();
    } catch (error: any) {
      console.error('Error fetching break time data:', error);
      if (error.response?.status === 404) {
        console.warn('Break time endpoint not found - returning empty data');
      }
      return this.getEmptyBreakTimeResponse();
    }
  }

  // Cell Phone Violations API
  async getCellPhoneViolations(params: ApiParams = {}): Promise<ViolationsResponse> {
    try {
      const response = await this.api.get('/violations/cell-phones', {
        params: {
          timezone: 'Asia/Karachi',
          ...params
        }
      });

      if (response.data.success && response.data.data) {
        const { violations, summary } = response.data.data;
        
        return {
          violations: violations || [],
          total_violations: summary?.total_violations || violations?.length || 0,
          summary: {
            by_employee: summary?.by_employee || {},
            by_camera: summary?.by_camera || {},
            by_severity: summary?.by_severity || {}
          }
        };
      }

      return this.getEmptyViolationsResponse();
    } catch (error: any) {
      console.error('Error fetching cell phone violations:', error);
      if (error.response?.status === 404) {
        console.warn('Violations endpoint not found - returning empty data');
      }
      return this.getEmptyViolationsResponse();
    }
  }

  // Helper: Map break sessions to employee format
  private mapBreakSessionsToEmployees(breakSessions: any[]): any[] {
    const employeeMap = new Map<string, any>();

    breakSessions.forEach((session: any) => {
      const name = session.employee_name;
      
      if (!employeeMap.has(name)) {
        employeeMap.set(name, {
          employee_name: name,
          work_hours: 0,
          total_break_time: 0,
          arrival_time: session.break_start,
          departure_time: session.break_end,
          breaks: []
        });
      }

      const employee = employeeMap.get(name);
      employee.total_break_time += session.duration_minutes || 0;
      employee.breaks.push({
        break_start: session.break_start,
        break_end: session.break_end,
        duration_hours: (session.duration_minutes || 0) / 60,
        previous_session: session.previous_session,
        next_session: session.next_session
      });
    });

    return Array.from(employeeMap.values());
  }

  // Empty response helpers
  private getEmptyWorkHoursResponse(): WorkHoursResponse {
    return {
      employees: [],
      total_employees: 0,
      total_work_hours: 0,
      average_work_hours: 0,
      period: {
        start: '',
        end: '',
        duration_hours: 0
      },
      timezone_info: this.getTimezoneInfo('Asia/Karachi')
    };
  }

  private getEmptyBreakTimeResponse(): BreakTimeResponse {
    return {
      employees: [],
      total_employees: 0,
      total_break_time: 0,
      average_break_time: 0,
      timezone_info: this.getTimezoneInfo('Asia/Karachi')
    };
  }

  private getEmptyViolationsResponse(): ViolationsResponse {
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
      timezone: 'Asia/Karachi',
      limit: 100
    };
  }

  // Get timezone info
  getTimezoneInfo(timezone: string): any {
    const timezoneMap: Record<string, any> = {
      'Asia/Karachi': { 
        timezone: 'Asia/Karachi', 
        offset: '+05:00', 
        offsetMinutes: 300,
        isDST: false,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
        abbreviation: 'PKT' 
      },
      'America/New_York': { 
        timezone: 'America/New_York', 
        offset: '-05:00', 
        offsetMinutes: -300,
        isDST: false,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
        abbreviation: 'EST' 
      },
      'UTC': { 
        timezone: 'UTC', 
        offset: '+00:00', 
        offsetMinutes: 0,
        isDST: false,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'UTC' }),
        abbreviation: 'UTC' 
      },
      'Europe/Paris': { 
        timezone: 'Europe/Paris', 
        offset: '+01:00', 
        offsetMinutes: 60,
        isDST: false,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }),
        abbreviation: 'CET' 
      },
      'Asia/Tokyo': { 
        timezone: 'Asia/Tokyo', 
        offset: '+09:00', 
        offsetMinutes: 540,
        isDST: false,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }),
        abbreviation: 'JST' 
      },
      // Support old PKT abbreviation for backward compatibility
      'PKT': { 
        timezone: 'Asia/Karachi', 
        offset: '+05:00', 
        offsetMinutes: 300,
        isDST: false,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
        abbreviation: 'PKT' 
      }
    };
    
    return timezoneMap[timezone] || timezoneMap['Asia/Karachi'];
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new ApiService();
