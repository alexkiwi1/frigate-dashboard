// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Employee Types
export interface Employee {
  employee_name: string;
  total_work_hours: number;
  arrival_time: string;
  departure_time: string;
  total_activity: number;
  productivity_score: number;
  attendance_status: 'present' | 'absent' | 'half_day' | 'partial_day';
  work_efficiency: number;
  cameras: string[];
  zones: string[];
  sessions?: EmployeeSession[];
}

export interface EmployeeSession {
  first_seen: string;
  last_seen: string;
  duration_hours: number;
  cameras: string[];
  zones: string[];
}

export interface BreakSession {
  break_start: string;
  break_end: string;
  duration_hours: number;
  previous_session: {
    camera: string;
    ended_at: string;
  };
  next_session: {
    camera: string;
    started_at: string;
  };
}

export interface EmployeeBreakData {
  employee_name: string;
  work_hours: number;
  total_break_time: number;
  arrival_time: string;
  departure_time: string;
  total_breaks: number;
  average_break_duration: number;
  longest_break: number;
  shortest_break: number;
  break_frequency: number;
  break_efficiency: number;
  break_sessions: BreakSession[];
}

export interface WorkHoursResponse {
  employees: Employee[];
  total_employees: number;
  total_work_hours: number;
  average_work_hours: number;
  period: {
    start: string;
    end: string;
    duration_hours: number;
  };
  timezone_info: {
    timezone: string;
    offset: string;
    abbreviation: string;
  };
}

export interface BreakTimeResponse {
  employees: EmployeeBreakData[];
  total_employees: number;
  total_break_time: number;
  average_break_time: number;
  timezone_info: {
    timezone: string;
    offset: string;
    abbreviation: string;
  };
}

export interface AttendanceResponse {
  employees: Employee[];
  summary: {
    total_employees: number;
    present: number;
    absent: number;
    half_day: number;
    partial_day: number;
    attendance_rate: number;
  };
}

// Camera Types
export interface Camera {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'offline';
  ip: string;
  fps: number;
  resolution: [number, number];
  zones: string[];
}

export interface CameraSummary {
  camera: string;
  total_events: number;
  active_employees: number;
  violations: number;
  last_activity: string;
  status: string;
  zones: string[];
  activity_trend: string;
}

export interface CameraActivity {
  timestamp: string;
  camera: string;
  event_type: string;
  employee_name: string;
  zone: string;
  confidence: number;
  description: string;
}

// Violation Types
export interface Violation {
  id: string;
  timestamp: string;
  camera: string;
  employee_name: string;
  assigned_employee: string;
  confidence: 'high' | 'medium' | 'low';
  zones: string[];
  media_urls: {
    snapshot: string;
    thumbnail: string;
    video: string;
  };
  assignment_confidence: string;
  assignment_method: string;
}

export interface ViolationsResponse {
  violations: Violation[];
  total_violations: number;
  summary: {
    by_employee: Record<string, number>;
    by_camera: Record<string, number>;
    by_severity: Record<string, number>;
  };
}

// Analytics Types
export interface DashboardOverview {
  total_employees: number;
  active_employees: number;
  total_violations: number;
  total_work_hours: number;
  average_productivity: number;
}

export interface Trend {
  violations_trend: 'increasing' | 'decreasing' | 'stable';
  productivity_trend: 'increasing' | 'decreasing' | 'stable';
  attendance_trend: 'increasing' | 'decreasing' | 'stable';
}

export interface TopPerformer {
  employee_name: string;
  productivity_score: number;
  work_hours: number;
  violations: number;
}

export interface Alert {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface DashboardData {
  overview: DashboardOverview;
  trends: Trend;
  top_performers: TopPerformer[];
  alerts: Alert[];
}

export interface TrendData {
  productivity_trends: {
    daily: Array<{
      date: string;
      average: number;
      employees: number;
    }>;
    hourly: Array<{
      hour: number;
      average: number;
    }>;
  };
  violation_trends: {
    daily: Array<{
      date: string;
      count: number;
      severity_breakdown: Record<string, number>;
    }>;
  };
}

// Timezone Types
export interface Timezone {
  abbreviation: string;
  iana: string;
  name: string;
  offset: string;
  currentTime: string;
}

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  offsetMinutes: number;
  isDST: boolean;
  currentTime: string;
  abbreviation: string;
}

// API Parameters
export interface ApiParams {
  start_date?: string;
  end_date?: string;
  timezone?: string;
  employee_name?: string;
  camera?: string;
  hours?: number;
  severity?: string;
  limit?: number;
  metric?: string;
}

// Activity Pattern Types
export interface ActivityPattern {
  peak_hours: Array<{
    hour: number;
    activity_count: number;
  }>;
  most_active_camera: string;
  most_visited_zone: string;
  activity_frequency: 'high' | 'medium' | 'low';
  movement_pattern: 'consistent' | 'variable';
  productivity_trends: 'increasing' | 'decreasing' | 'stable';
}

export interface EmployeeActivityPattern {
  employee_name: string;
  activity_patterns: ActivityPattern;
  work_efficiency: number;
  productivity_score: number;
}
