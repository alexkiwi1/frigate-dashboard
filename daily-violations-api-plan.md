# Create Daily Violations API Endpoint

## Overview

Create a new middleware API endpoint that returns all employee violations for a specified date in a single API call, reducing multiple per-employee requests to one combined request. This will group violations by employee name and significantly improve frontend performance.

## Backend Implementation (Middleware)

### 1. Create New Endpoint: `/api/violations/daily`

**File to create**: Similar structure to existing violation endpoints

**Request Parameters**:
- `start_date` (required): YYYY-MM-DD format
- `end_date` (required): YYYY-MM-DD format  
- `timezone` (optional): Default 'Asia/Karachi'
- `limit` (optional): Max violations per employee, default 100

**Response Structure**:
```python
{
  "success": true,
  "message": "Daily violations retrieved successfully",
  "data": {
    "employees": {
      "John Doe": {
        "count": 5,
        "violations": [...]  # ViolationData objects
      },
      "Jane Smith": {
        "count": 2,
        "violations": [...]
      }
    },
    "total_violations": 7,
    "total_employees_with_violations": 2,
    "period": {
      "start": "2025-10-20",
      "end": "2025-10-20"
    }
  },
  "timestamp": "2025-10-21T08:50:00Z"
}
```

**Implementation Details**:
1. Query violations table for date range
2. Filter by `assignedEmployee` field
3. Group results by employee name
4. Include violation count per employee
5. Return all employees with violations in single response
6. Follow same structure as `/api/violations/employee/{name}` for individual violations
7. Use same timezone handling as work-hours endpoint
8. Include proper error handling and validation

## Frontend Integration

### 2. Update TypeScript Types (`src/types/api.ts`)

Add new interface:
```typescript
export interface DailyViolationsData {
  employees: {
    [employeeName: string]: {
      count: number;
      violations: ViolationData[];
    };
  };
  total_violations: number;
  total_employees_with_violations: number;
  period: {
    start: string;
    end: string;
  };
}

export interface DailyViolationsResponse {
  success: boolean;
  message: string;
  data: DailyViolationsData;
  timestamp: string;
}
```

### 3. Update API Service (`src/services/api.ts`)

Replace `getCellPhoneViolations` method:
```typescript
async getDailyViolations(params: { start_date: string; end_date: string }): Promise<DailyViolationsResponse> {
  try {
    const response = await this.api.get('/violations/daily', {
      params: {
        timezone: 'Asia/Karachi',
        limit: 100,
        ...params
      }
    });
    
    if (response.data.success && response.data.data) {
      return response.data;
    }
    
    return this.getEmptyDailyViolationsResponse();
  } catch (error: any) {
    console.error('Error fetching daily violations:', error);
    return this.getEmptyDailyViolationsResponse();
  }
}

private getEmptyDailyViolationsResponse(): DailyViolationsResponse {
  return {
    success: false,
    message: 'No violations found',
    data: {
      employees: {},
      total_violations: 0,
      total_employees_with_violations: 0,
      period: { start: '', end: '' }
    },
    timestamp: new Date().toISOString()
  };
}
```

### 4. Update Dashboard Component (`src/components/TimeActivityReport.tsx`)

**Changes**:
1. Remove individual `fetchViolationCount` per employee
2. Fetch all violations once when date changes
3. Store in single state object
4. Update `getPhoneTimeWithCount` to read from state object

**Implementation**:
```typescript
// Replace existing violation states with:
const [dailyViolations, setDailyViolations] = useState<DailyViolationsData | null>(null);
const [violationsLoading, setViolationsLoading] = useState(false);

// Single fetch on mount/date change
useEffect(() => {
  if (workHoursData?.period?.start && workHoursData?.period?.end) {
    fetchDailyViolations();
  }
}, [workHoursData?.period?.start, workHoursData?.period?.end]);

const fetchDailyViolations = async () => {
  setViolationsLoading(true);
  try {
    const response = await apiService.getDailyViolations({
      start_date: workHoursData.period.start,
      end_date: workHoursData.period.end
    });
    if (response.success) {
      setDailyViolations(response.data);
    }
  } catch (error) {
    console.error('Error fetching daily violations:', error);
  } finally {
    setViolationsLoading(false);
  }
};

// Simplified helper function
const getPhoneTimeWithCount = (employeeName: string): string => {
  if (violationsLoading) return 'Loading...';
  const employeeData = dailyViolations?.employees?.[employeeName];
  const count = employeeData?.count || 0;
  return count === 0 ? '' : `${count} violations`;
};

// Update violations modal to use cached data
const handleViolationsClick = (employee: Employee) => {
  const employeeData = dailyViolations?.employees?.[employee.employee_name];
  if (employeeData && employeeData.count > 0) {
    setViolationsModal({
      isOpen: true,
      violations: employeeData.violations,
      employeeName: employee.employee_name
    });
  }
};
```

**States to Remove**:
- `violationCounts`
- `loadingViolations`
- `violationsLoaded`
- `violationCountsRef`
- `violationsLoadedRef`
- `prevPeriodRef`
- `fetchViolationCount` function

## Benefits

1. **Performance**: 1 API call instead of N calls (where N = number of employees)
2. **Faster Loading**: All violation counts load simultaneously
3. **Reduced Server Load**: Single query instead of multiple database queries
4. **Simpler State Management**: One state object instead of multiple tracking objects
5. **Better UX**: No progressive loading, instant display after initial fetch
6. **Reduced Code Complexity**: Remove refs, multiple states, and complex loading logic
7. **No Race Conditions**: Single atomic fetch eliminates timing issues

## Testing

1. Test with multiple employees with varying violation counts
2. Verify date range filtering works correctly
3. Confirm timezone handling matches existing endpoints
4. Test error handling when API is unavailable
5. Verify modal displays correct violations for each employee
6. Confirm performance improvement with network throttling


