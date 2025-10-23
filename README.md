# 🚀 Frigate Employee Dashboard

A modern React TypeScript dashboard for monitoring employee activity, work hours, and violations using the Frigate middleware API.

## Features

- 📊 **Real-time Overview**: Live employee count, work hours, violations, and productivity metrics
- 👥 **Employee Management**: Detailed work hours, attendance status, and activity tracking
- 🚨 **Violations Monitoring**: Cell phone violations with media evidence and confidence levels
- 📈 **Analytics & Charts**: Productivity trends, violation patterns, and performance insights
- 🌍 **Timezone Support**: Multiple timezone support with automatic time conversion
- 📱 **Responsive Design**: Mobile-friendly interface that works on all devices
- 🔄 **Auto-refresh**: Automatic data updates every 30 seconds

## Quick Start

### Using Docker (Recommended)

1. **Build and run the dashboard:**
   ```bash
   docker-compose up --build
   ```

2. **Access the dashboard:**
   Open your browser and navigate to `http://localhost:3000`

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export REACT_APP_API_BASE_URL=http://10.0.20.8:5002/v1
   export REACT_APP_API_KEY=frigate-api-key-2024
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

## API Configuration

The dashboard connects to the Frigate middleware API at `http://10.0.20.8:5002/v1` with the following endpoints:

- **Employee APIs**: Work hours, break time, attendance, activity patterns
- **Camera APIs**: Camera summary, activity monitoring
- **Violation APIs**: Cell phone violations with media evidence
- **Analytics APIs**: Dashboard data, trend analysis
- **Timezone APIs**: Timezone information and conversion

## Dashboard Components

### Overview Cards
- Total employees count
- Active employees (currently working)
- Total violations detected
- Total work hours across all employees
- Average productivity percentage

### Employee Table
- Employee name and status
- Work hours and arrival/departure times
- Productivity scores and activity counts
- Zones visited during work

### Violations Table
- Timestamp and employee information
- Camera and zone details
- Confidence levels (high/medium/low)
- Direct links to snapshots and videos

### Analytics Charts
- Daily productivity trends
- Violations by severity (pie chart)
- Hourly productivity patterns
- Top violators ranking

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_BASE_URL` | API base URL | `/api` |
| `REACT_APP_API_KEY` | API authentication key | `frigate-api-key-2024` |

### Docker Configuration

The application uses a multi-stage Docker build:
1. **Build stage**: Compiles the React application
2. **Production stage**: Serves the app using nginx

### Nginx Configuration

The nginx configuration includes:
- Static file serving for the React app
- API proxy to the backend service
- Health check endpoint proxy
- CORS headers for API requests

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Dashboard header with controls
│   ├── OverviewCards.tsx # Overview metrics cards
│   ├── EmployeeTable.tsx # Employee data table
│   ├── ViolationsTable.tsx # Violations table
│   └── Charts.tsx      # Analytics charts
├── services/           # API service layer
│   └── api.ts         # API client with authentication
├── types/             # TypeScript type definitions
│   └── api.ts         # API response types
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
└── index.css          # Global styles
```

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## API Integration

The dashboard integrates with the following Frigate middleware API endpoints:

### Employee Endpoints
- `GET /api/employees/work-hours` - Employee work hours data
- `GET /api/employees/break-time` - Break time analysis
- `GET /api/employees/attendance` - Attendance records
- `GET /api/employees/activity-patterns` - Activity pattern analysis

### Camera Endpoints
- `GET /api/cameras/summary` - Camera status and activity
- `GET /api/cameras/activity` - Real-time camera activity
- `GET /api/cameras` - List all cameras

### Violation Endpoints
- `GET /api/violations/cell-phones` - Cell phone violations

### Analytics Endpoints
- `GET /api/analytics/dashboard` - Dashboard overview data
- `GET /api/analytics/trends` - Trend analysis data

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check if the Frigate middleware API is running
   - Verify the API URL and authentication key
   - Check network connectivity

2. **No Data Displayed**
   - Ensure the API is returning data for the selected date range
   - Check browser console for error messages
   - Verify timezone settings

3. **Docker Build Issues**
   - Ensure Docker is running
   - Check if port 3000 is available
   - Verify Docker Compose configuration

### Debug Mode

Enable debug logging by opening browser developer tools and checking the console for API request/response logs.

## License

This project is part of the Frigate employee monitoring system.

## Support

For technical support or feature requests, please contact the development team.
