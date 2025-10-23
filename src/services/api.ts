import axios, { AxiosInstance } from 'axios';
import {
  ApiResponse,
  WorkHoursResponse,
  BreakTimeResponse,
  ViolationsResponse as ViolationsApiResponse,
  DailyViolationsSummaryResponse,
  ApiParams
} from '../types/api';

// Add type alias
type ViolationsResponse = ViolationsApiResponse;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env['REACT_APP_API_BASE_URL'] || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000, // Reduced timeout to 15 seconds
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params);
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
        
        // Transform media URLs in response data
        if (response.data && response.data.data) {
          this.transformResponseMediaUrls(response.data.data);
        }
        
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
          limit: 10, // Reduced limit to prevent overwhelming the frontend
          _t: Date.now(), // Cache-busting timestamp
          ...params
        }
      });

      if (response.data.success && response.data.data) {
        const { employees, summary, timezone_info } = response.data.data;
        
        
        return {
          employees: employees || [],
          total_employees: summary?.total_employees || employees?.length || 0,
          total_work_hours: summary?.total_work_hours || 0,
          average_work_hours: summary?.average_work_hours || 0,
          period: summary?.period || {
            start: params.start_date || '',
            end: params.end_date || '',
            duration_hours: 24
          },
          timezone_info: timezone_info || this.getTimezoneInfo('Asia/Karachi')
        };
      }

      return this.getEmptyWorkHoursResponse();
    } catch (error: any) {
      console.error('Error fetching employee work hours:', error);
      return this.getEmptyWorkHoursResponse();
    }
  }

  // Employee Break Time API
  async getEmployeeBreakTime(params: ApiParams = {}): Promise<BreakTimeResponse> {
    try {
      const response = await this.api.get('/employees/break-time', {
        params: {
          timezone: 'Asia/Karachi',
          limit: 10, // Reduced limit to prevent overwhelming the frontend
          ...params
        }
      });

      if (response.data.success && response.data.data) {
        const { employees, summary, timezone_info } = response.data.data;
        
        return {
          employees: employees || [],
          total_employees: employees?.length || 0,
          total_break_time: summary?.total_break_time || 0,
          average_break_time: summary?.average_break_duration || 0,
          timezone_info: timezone_info || this.getTimezoneInfo('Asia/Karachi')
        };
      }

      return this.getEmptyBreakTimeResponse();
    } catch (error: any) {
      console.error('Error fetching break time data:', error);
      return this.getEmptyBreakTimeResponse();
    }
  }

  // Daily Violations Summary API - Get all violations for all employees in one call
  async getDailyViolationsSummary(params: { start_date?: string; end_date?: string; hours?: number } = {}): Promise<DailyViolationsSummaryResponse> {
    try {
      const response = await this.api.get('/violations/summary', {
        params: {
          timezone: 'Asia/Karachi',
          limit: 100,
          ...params
        }
      });
      
      if (response.data.success && response.data.data) {
        return response.data;
      }
      
      return this.getEmptyDailyViolationsSummaryResponse();
    } catch (error: any) {
      console.error('Error fetching daily violations summary:', error);
      return this.getEmptyDailyViolationsSummaryResponse();
    }
  }

  // Cell Phone Violations API - Get all violations for all employees (deprecated)
  async getCellPhoneViolations(params: ApiParams = {}): Promise<ViolationsResponse> {
    try {
      // Since there's no general violations endpoint, we'll return empty data for now
      // The violations will be fetched per employee when needed
      console.warn('General violations endpoint not available - returning empty data');
      return this.getEmptyViolationsResponse();
    } catch (error: any) {
      console.error('Error fetching cell phone violations:', error);
      return this.getEmptyViolationsResponse();
    }
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

  private getEmptyDailyViolationsSummaryResponse(): DailyViolationsSummaryResponse {
    return {
      success: false,
      message: 'No violations found',
      data: {
        summary: [],
        count: 0,
        filters: {}
      },
      timestamp: new Date().toISOString()
    };
  }

  // Utility methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getDefaultParams(): ApiParams {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      start_date: this.formatDate(yesterday),
      end_date: this.formatDate(yesterday),
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

  // Transform Frigate URLs to proxied URLs
  private transformMediaUrl(url: string): string {
    if (!url) return url;
    
    // Convert direct Frigate URLs to proxied URLs
    // http://10.0.20.6:5000/api/events/... -> /media/api/events/...
    if (url.includes('10.0.20.6:5000')) {
      return url.replace('http://10.0.20.6:5000', '/media');
    }
    
    return url;
  }

  // Transform media URLs in response data recursively
  private transformResponseMediaUrls(data: any): void {
    if (!data) return;
    
    if (typeof data === 'string' && data.includes('10.0.20.6:5000')) {
      // This is a URL string, transform it
      return; // Skip string transformation in this method
    }
    
    if (Array.isArray(data)) {
      data.forEach(item => this.transformResponseMediaUrls(item));
    } else if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        if (key.includes('url') || key.includes('Url')) {
          // Transform URL fields
          data[key] = this.transformMediaUrl(data[key]);
        } else {
          // Recursively transform nested objects
          this.transformResponseMediaUrls(data[key]);
        }
      });
    }
  }

  // Get recording at specific timestamp
  async getRecordingAtTimestamp(camera: string, timestamp: number, window: number = 2): Promise<string | null> {
    try {
      const response = await this.api.get('/recordings/at-time', {
        params: { 
          camera, timestamp, window,
          _t: Date.now() // Cache-busting timestamp
        }
      });
      
      console.log('Recording API response:', response.data);
      
      if (response.data.success && response.data.data) {
        return this.transformMediaUrl(response.data.data.video_url);
      }
      
      console.log('No recording found:', response.data.message);
      return null;
    } catch (error: any) {
      console.error('Error fetching video recording:', error);
      return null;
    }
  }

  // Note: Video URLs are now direct - no API call needed
  // The video_url field in ViolationMedia now contains the direct URL

  // Get violations by employee name
  async getEmployeeViolations(
    employeeName: string, 
    params: { hours?: number; start_date?: string; end_date?: string; limit?: number } = {}
  ): Promise<ViolationsResponse> {
    try {
      const response = await this.api.get(`/violations/employee/${encodeURIComponent(employeeName)}`, {
        params: {
          timezone: 'Asia/Karachi',
          limit: 100,
          ...params
        }
      });
      
      if (response.data.success && response.data.data) {
        return response.data;
      }
      
      return this.getEmptyViolationsResponse();
    } catch (error: any) {
      console.error('Error fetching employee violations:', error);
      return this.getEmptyViolationsResponse();
    }
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new ApiService();
