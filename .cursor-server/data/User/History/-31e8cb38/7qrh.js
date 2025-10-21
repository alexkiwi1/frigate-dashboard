const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Real Frigate API base URL
const FRIGATE_API_BASE = 'http://10.0.20.6:5001/api';

// Proxy endpoint for employee work hours
app.get('/api/employees/work-hours', async (req, res) => {
  try {
    console.log('Fetching employee work hours from real Frigate API...');
    
    // Get all cameras
    const camerasResponse = await axios.get(`${FRIGATE_API_BASE}/cameras`);
    const cameras = camerasResponse.data.cameras;
    
    if (!cameras || !Array.isArray(cameras)) {
      throw new Error('No cameras found');
    }

    const allEvents = [];
    
    // Get timeline events for each camera
    for (const camera of cameras) {
      try {
        const response = await axios.get(`${FRIGATE_API_BASE}/timeline`, {
          params: {
            camera: camera,
            limit: 1000
          }
        });
        
        if (response.data.events) {
          allEvents.push(...response.data.events);
        }
      } catch (error) {
        console.warn(`Failed to fetch data for camera ${camera}:`, error.message);
      }
    }

    // Process events to create employee work hours
    const employees = processTimelineEventsToWorkHours(allEvents, req.query.timezone || 'PKT');
    
    const response = {
      success: true,
      data: {
        employees,
        total_employees: employees.length,
        total_work_hours: employees.reduce((sum, emp) => sum + emp.total_work_hours, 0),
        average_work_hours: employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.total_work_hours, 0) / employees.length : 0,
        period: {
          start: formatUnixTimestamp(Date.now() / 1000 - 24 * 3600, req.query.timezone || 'PKT'),
          end: formatUnixTimestamp(Date.now() / 1000, req.query.timezone || 'PKT'),
          duration_hours: 24
        },
        timezone_info: getTimezoneInfo(req.query.timezone || 'PKT')
      }
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching employee work hours:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Convert Unix timestamp to timezone-aware ISO string
function formatUnixTimestamp(unixTimestamp, timezone) {
  const date = new Date(unixTimestamp * 1000);
  const timezoneMap = {
    'PKT': 'Asia/Karachi',
    'EST': 'America/New_York',
    'UTC': 'UTC',
    'CET': 'Europe/Paris',
    'JST': 'Asia/Tokyo'
  };
  
  const ianaTimezone = timezoneMap[timezone] || 'Asia/Karachi';
  const offset = getTimezoneOffset(ianaTimezone);
  
  return date.toISOString().replace('Z', offset);
}

// Get timezone offset string
function getTimezoneOffset(timezone) {
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
function getTimezoneInfo(timezone) {
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
function processTimelineEventsToWorkHours(events, timezone) {
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
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const workDuration = (lastEvent.timestamp - firstEvent.timestamp) / 3600;
    
    const cameras = [...new Set(events.map(e => e.camera))];
    const zones = [...new Set(events.flatMap(e => e.zones))];
    
    employees.push({
      employee_name: `Employee ${personId.slice(-4)}`,
      total_work_hours: Math.max(0, workDuration),
      arrival_time: formatUnixTimestamp(firstEvent.timestamp, timezone),
      departure_time: formatUnixTimestamp(lastEvent.timestamp, timezone),
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

// Break time endpoint (empty for now)
app.get('/api/employees/break-time', (req, res) => {
  res.json({
    success: true,
    data: {
      employees: [],
      total_employees: 0,
      total_break_time: 0,
      average_break_time: 0,
      timezone_info: getTimezoneInfo(req.query.timezone || 'PKT')
    }
  });
});

// Violations endpoint (empty for now)
app.get('/api/employees/violations', (req, res) => {
  res.json({
    success: true,
    data: {
      violations: [],
      total_violations: 0,
      timezone_info: getTimezoneInfo(req.query.timezone || 'PKT')
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Proxy server running on port ${PORT}`);
  console.log(`Proxying to Frigate API at ${FRIGATE_API_BASE}`);
});
