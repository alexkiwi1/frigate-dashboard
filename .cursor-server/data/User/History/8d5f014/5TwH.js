const express = require('express');
const cors = require('cors');
const app = express();
const port = 5002;

app.use(cors());
app.use(express.json());

// Mock data
const mockEmployees = [
  {
    employee_name: "Arbaz",
    total_work_hours: 7.71,
    arrival_time: "2025-10-20T09:50:31+05:00",
    departure_time: "2025-10-20T22:01:26+05:00",
    total_activity: 506,
    productivity_score: 98,
    attendance_status: "half_day",
    work_efficiency: 79,
    cameras: ["employees_05", "employees_06"],
    zones: ["desk_42", "desk_38", "desk_43"]
  },
  {
    employee_name: "Ali Habib",
    total_work_hours: 8.5,
    arrival_time: "2025-10-20T09:00:00+05:00",
    departure_time: "2025-10-20T17:30:00+05:00",
    total_activity: 450,
    productivity_score: 85,
    attendance_status: "present",
    work_efficiency: 82,
    cameras: ["employees_01", "employees_02"],
    zones: ["desk_01", "desk_02"]
  }
];

const mockViolations = [
  {
    id: "violation_123",
    timestamp: "2025-10-20T14:30:15+05:00",
    camera: "employees_01",
    employee_name: "Arbaz",
    assigned_employee: "Arbaz",
    confidence: "high",
    zones: ["desk_42"],
    media_urls: {
      snapshot: "http://10.100.6.2:5002/media/snapshots/employees_01/2025-10-20/14:30:15.jpg",
      thumbnail: "http://10.100.6.2:5002/media/thumbnails/employees_01/2025-10-20/14:30:15.jpg",
      video: "http://10.100.6.2:5002/media/recordings/2025-10-20/14/employees_01/30.15.mp4"
    },
    assignment_confidence: "high",
    assignment_method: "face_recognition"
  }
];

// Health check
app.get('/v1/health', (req, res) => {
  res.json({
    success: true,
    message: "Mock API is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Employee work hours
app.get('/v1/api/employees/work-hours', (req, res) => {
  res.json({
    success: true,
    data: {
      employees: mockEmployees,
      total_employees: mockEmployees.length,
      total_work_hours: mockEmployees.reduce((sum, emp) => sum + emp.total_work_hours, 0),
      average_work_hours: mockEmployees.reduce((sum, emp) => sum + emp.total_work_hours, 0) / mockEmployees.length,
      period: {
        start: "2025-10-20T00:00:00+05:00",
        end: "2025-10-20T23:59:59+05:00",
        duration_hours: 24
      },
      timezone_info: {
        timezone: "Asia/Karachi",
        offset: "+05:00",
        abbreviation: "PKT"
      }
    }
  });
});

// Employee break time
app.get('/v1/api/employees/break-time', (req, res) => {
  res.json({
    success: true,
    data: {
      employees: mockEmployees.map(emp => ({
        ...emp,
        work_hours: emp.total_work_hours,
        total_break_time: 1.5,
        total_breaks: 3,
        average_break_duration: 0.5,
        longest_break: 0.75,
        shortest_break: 0.25,
        break_frequency: 0.4,
        break_efficiency: 80.5,
        break_sessions: []
      })),
      total_employees: mockEmployees.length,
      total_break_time: 3.0,
      average_break_time: 1.5,
      timezone_info: {
        timezone: "Asia/Karachi",
        offset: "+05:00",
        abbreviation: "PKT"
      }
    }
  });
});

// Employee attendance
app.get('/v1/api/employees/attendance', (req, res) => {
  res.json({
    success: true,
    data: {
      employees: mockEmployees,
      summary: {
        total_employees: mockEmployees.length,
        present: mockEmployees.filter(emp => emp.attendance_status === 'present').length,
        absent: 0,
        half_day: mockEmployees.filter(emp => emp.attendance_status === 'half_day').length,
        partial_day: 0,
        attendance_rate: 100
      }
    }
  });
});

// Employee activity patterns
app.get('/v1/api/employees/activity-patterns', (req, res) => {
  res.json({
    success: true,
    data: mockEmployees.map(emp => ({
      employee_name: emp.employee_name,
      activity_patterns: {
        peak_hours: [
          { hour: 9, activity_count: 45 },
          { hour: 14, activity_count: 38 },
          { hour: 16, activity_count: 42 }
        ],
        most_active_camera: emp.cameras[0],
        most_visited_zone: emp.zones[0],
        activity_frequency: "high",
        movement_pattern: "consistent",
        productivity_trends: "increasing"
      },
      work_efficiency: emp.work_efficiency,
      productivity_score: emp.productivity_score
    }))
  });
});

// Camera summary
app.get('/v1/api/cameras/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      summaries: [
        {
          camera: "employees_01",
          total_events: 1250,
          active_employees: 12,
          violations: 5,
          last_activity: "2025-10-20T21:45:30+05:00",
          status: "active",
          zones: ["desk_01", "desk_02", "desk_03"],
          activity_trend: "stable"
        }
      ],
      total_cameras: 12,
      active_cameras: 11,
      offline_cameras: 1
    }
  });
});

// Camera activity
app.get('/v1/api/cameras/activity', (req, res) => {
  res.json({
    success: true,
    data: {
      activities: [
        {
          timestamp: "2025-10-20T21:45:30+05:00",
          camera: "employees_01",
          event_type: "person_detection",
          employee_name: "Arbaz",
          zone: "desk_42",
          confidence: 0.95,
          description: "Employee detected at desk"
        }
      ],
      total_activities: 1250,
      time_range: {
        start: "2025-10-20T00:00:00+05:00",
        end: "2025-10-20T23:59:59+05:00"
      }
    }
  });
});

// Cell phone violations
app.get('/v1/api/violations/cell-phones', (req, res) => {
  res.json({
    success: true,
    data: {
      violations: mockViolations,
      total_violations: mockViolations.length,
      summary: {
        by_employee: {
          "Arbaz": 1
        },
        by_camera: {
          "employees_01": 1
        },
        by_severity: {
          "high": 1
        }
      }
    }
  });
});

// Dashboard data
app.get('/v1/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        total_employees: mockEmployees.length,
        active_employees: mockEmployees.length,
        total_violations: mockViolations.length,
        total_work_hours: mockEmployees.reduce((sum, emp) => sum + emp.total_work_hours, 0),
        average_productivity: mockEmployees.reduce((sum, emp) => sum + emp.productivity_score, 0) / mockEmployees.length
      },
      trends: {
        violations_trend: "decreasing",
        productivity_trend: "increasing",
        attendance_trend: "stable"
      },
      top_performers: mockEmployees.map(emp => ({
        employee_name: emp.employee_name,
        productivity_score: emp.productivity_score,
        work_hours: emp.total_work_hours,
        violations: 0
      })),
      alerts: []
    }
  });
});

// Trend analysis
app.get('/v1/api/analytics/trends', (req, res) => {
  res.json({
    success: true,
    data: {
      productivity_trends: {
        daily: [
          { date: "2025-10-20", average: 91.5, employees: mockEmployees.length },
          { date: "2025-10-19", average: 88.2, employees: mockEmployees.length }
        ],
        hourly: [
          { hour: 9, average: 75.2 },
          { hour: 14, average: 82.1 }
        ]
      },
      violation_trends: {
        daily: [
          { date: "2025-10-20", count: mockViolations.length, severity_breakdown: { high: 1, medium: 0, low: 0 } }
        ]
      }
    }
  });
});

// Cameras list
app.get('/v1/api/cameras', (req, res) => {
  res.json({
    success: true,
    data: {
      cameras: [
        {
          id: "employees_01",
          name: "Employees Area 1",
          status: "active",
          ip: "172.16.5.242",
          fps: 8,
          resolution: [3840, 2160],
          zones: ["desk_01", "desk_02", "desk_03"]
        }
      ],
      total_cameras: 1
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Mock API server running at http://0.0.0.0:${port}`);
});
