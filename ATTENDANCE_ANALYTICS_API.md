# SAMS Attendance Analytics API Documentation

## Overview

The Attendance Analytics API provides comprehensive attendance insights with dynamic geographic grouping. It automatically adapts the analysis level based on the filters provided and returns multiple reports in a single response for optimal performance.

## Base URL

```
/express/attendance-analytics
```

## Dynamic Grouping Logic

The API automatically determines the appropriate grouping level based on the filters provided:

| Filters Provided                | Groups Results By | Key Used |
| ------------------------------- | ----------------- | -------- |
| `year` only                     | State             | `state`  |
| `year` + `state10`              | County            | `county` |
| `year` + `state10` + `county28` | Payam             | `payam`  |
| `year` + `code`                 | School            | `school` |

## Main Endpoints

### 1. Comprehensive Attendance Analytics

**GET** `/attendance-analytics`

Returns all attendance reports in a single response with dynamic geographic grouping.

**Required Parameters:**

- `year` (required): Year to analyze (e.g., 2025)

**Optional Parameters:**

- `state10`: Filter by state code
- `county28`: Filter by county name
- `payam28`: Filter by payam name
- `code`: Filter by school code

**Response Structure:**

```json
{
  "success": true,
  "filtersUsed": {
    "year": 2025,
    "state10": "NBG",
    "county28": "Aweil East"
  },
  "groupedBy": "payam28",
  "summary": {
    "totalRecords": 15420,
    "totalAbsent": 1234,
    "totalPresent": 14186,
    "uniqueStudents": 3456,
    "uniqueSchools": 45,
    "overallAttendanceRate": 92.0,
    "minDate": "2025-01-15T00:00:00.000Z",
    "maxDate": "2025-03-20T00:00:00.000Z"
  },
  "attendanceRateReport": [
    {
      "payam": "Baac",
      "attendanceRate": 92.1
    },
    {
      "payam": "Majok",
      "attendanceRate": 89.4
    }
  ],
  "absenteeismReport": [
    {
      "payam": "Baac",
      "absentCount": 140
    },
    {
      "payam": "Majok",
      "absentCount": 95
    }
  ],
  "genderReport": [
    {
      "payam": "Baac",
      "gender": "M",
      "attendanceRate": 93.3
    },
    {
      "payam": "Baac",
      "gender": "F",
      "attendanceRate": 90.2
    }
  ],
  "disabilityReport": [
    {
      "payam": "Baac",
      "label": "With Disability",
      "attendanceRate": 84.3
    },
    {
      "payam": "Baac",
      "label": "Without Disability",
      "attendanceRate": 91.7
    }
  ]
}
```

### 2. Attendance Trends Over Time

**GET** `/attendance-analytics/trends`

Shows attendance trends grouped by time periods.

**Parameters:**

- `year` (required): Year to analyze
- `state10`, `county28`, `payam28`, `code` (optional): Geographic filters
- `groupBy` (optional): Time grouping - "day", "week", or "month" (default: "month")

**Response:**

```json
{
  "success": true,
  "filtersUsed": {
    "year": 2025,
    "state10": "NBG"
  },
  "groupBy": "month",
  "trends": [
    {
      "period": {
        "year": 2025,
        "month": 1
      },
      "totalRecords": 5420,
      "absentCount": 432,
      "presentCount": 4988,
      "attendanceRate": 92.03
    },
    {
      "period": {
        "year": 2025,
        "month": 2
      },
      "totalRecords": 5890,
      "absentCount": 501,
      "presentCount": 5389,
      "attendanceRate": 91.49
    }
  ]
}
```

### 3. Top Absence Reasons

**GET** `/attendance-analytics/absence-reasons`

Shows the most common reasons for student absences.

**Parameters:**

- `year` (required): Year to analyze
- `state10`, `county28`, `payam28`, `code` (optional): Geographic filters
- `limit` (optional): Number of top reasons to return (default: 10)

**Response:**

```json
{
  "success": true,
  "filtersUsed": {
    "year": 2025,
    "state10": "NBG"
  },
  "absenceReasons": [
    {
      "reason": "Illness",
      "count": 1245,
      "affectedStudents": 456
    },
    {
      "reason": "Family Emergency",
      "count": 678,
      "affectedStudents": 234
    },
    {
      "reason": "Weather Conditions",
      "count": 432,
      "affectedStudents": 189
    }
  ]
}
```

## Report Details

### 1. Attendance Rate Report

- **Purpose**: Shows overall attendance percentage per geographic region
- **Formula**: `attendanceRate = (1 - (absentCount / totalRecords)) * 100`
- **Sorting**: Ordered by attendance rate (highest first)

### 2. Absenteeism Report

- **Purpose**: Shows total absence counts by geographic region
- **Includes**: Only records where `absent = true`
- **Sorting**: Ordered by absent count (highest first)

### 3. Gender-Based Attendance Report

- **Purpose**: Compares attendance rates between male and female students
- **Breakdown**: Shows attendance rate by gender for each geographic region
- **Sorting**: Ordered by region, then gender

### 4. Disability-Based Attendance Report

- **Purpose**: Compares attendance rates for students with and without disabilities
- **Categories**: "With Disability" vs "Without Disability"
- **Sorting**: Ordered by region, then disability status

### 5. Summary Statistics

- **Total Records**: All attendance records matching filters
- **Unique Students**: Count of distinct students
- **Unique Schools**: Count of distinct schools
- **Date Range**: Earliest and latest attendance dates
- **Overall Rate**: System-wide attendance percentage

## Example Usage

### Get state-level attendance for 2025

```bash
curl "http://localhost:9000/express/attendance-analytics?year=2025"
```

### Get county-level attendance for NBG state

```bash
curl "http://localhost:9000/express/attendance-analytics?year=2025&state10=NBG"
```

### Get payam-level attendance for specific county

```bash
curl "http://localhost:9000/express/attendance-analytics?year=2025&state10=NBG&county28=Aweil%20East"
```

### Get school-specific attendance

```bash
curl "http://localhost:9000/express/attendance-analytics?year=2025&code=STV"
```

### Get monthly attendance trends

```bash
curl "http://localhost:9000/express/attendance-analytics/trends?year=2025&state10=NBG&groupBy=month"
```

### Get top absence reasons

```bash
curl "http://localhost:9000/express/attendance-analytics/absence-reasons?year=2025&state10=NBG&limit=5"
```

### Memory-Optimized Examples (NEW)

#### Get paginated results

```bash
curl "http://localhost:9000/express/attendance-analytics?year=2025&page=1&limit=25"
```

#### Enable streaming for large datasets

```bash
curl "http://localhost:9000/express/attendance-analytics?year=2025&streamMode=true"
```

#### Get summary only (minimal memory usage)

```bash
curl "http://localhost:9000/express/attendance-analytics/summary?year=2025&state10=NBG"
```

## Performance Features

### Memory Optimizations (NEW)

**Problem Solved**: The original API was hitting MongoDB's 100MB aggregation memory limit with large datasets.

**Solutions Implemented**:

- **Eliminated $push operations**: Removed memory-intensive array building operations
- **Separated unique counts**: Split unique student/school counting into separate pipeline
- **Added pagination**: Default 50 results per page, configurable up to 1000
- **Enabled allowDiskUse**: Allows MongoDB to use disk for large aggregations
- **Streaming mode**: For datasets too large for standard processing
- **Database indexes**: Optimized compound indexes for common query patterns

**New Parameters**:

- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Results per page (default: 50, max: 1000)
- `streamMode` (optional): Enable streaming for very large datasets (true/false)

**Memory Limits**:

- Standard mode: Efficiently handles up to ~1M attendance records
- Streaming mode: No memory limits, can process any dataset size
- Automatic fallback: API suggests optimizations when memory limits are hit

### Caching Strategy

- **Main Analytics**: 10 minutes (600s)
- **Trends**: 15 minutes (900s)
- **Absence Reasons**: 20 minutes (1200s)

### Database Optimization

- **Single Pipeline**: Uses MongoDB `$facet` to compute all reports in one query
- **Compound Indexes**: Leverages indexes on `{ year, state10, county28, payam28, code }`
- **Efficient Grouping**: Dynamic grouping based on filter hierarchy
- **Memory Management**: Optimized aggregation stages to prevent memory overflow
- **Disk Usage**: `allowDiskUse: true` for large dataset processing

### Response Optimization

- **Consolidated Data**: All reports returned in single response
- **Calculated Fields**: Attendance rates computed in database
- **Sorted Results**: Pre-sorted for immediate frontend consumption

## Error Handling

### Common Errors

```json
{
  "success": false,
  "message": "Year parameter is required"
}
```

```json
{
  "success": false,
  "message": "Error fetching attendance analytics",
  "error": "Detailed error message"
}
```

## Data Model Requirements

The API expects the Attendance collection to have these fields:

- `year`: Number (required)
- `student`: ObjectId reference
- `date`: Date (required)
- `absent`: Boolean (required)
- `absenceReason`: String (optional)
- `state10`, `county28`, `payam28`: Geographic identifiers
- `school`, `code`: School identifiers
- `gender`: String ("M" or "F")
- `isWithDisability`: Boolean

## Integration Notes

### Frontend Integration

- Use the dynamic grouping to build hierarchical drill-down interfaces
- Cache responses on frontend for 5-10 minutes
- Display summary statistics prominently
- Use attendance rate reports for geographic comparisons

### Dashboard Widgets

- **Overview Cards**: Use summary statistics
- **Geographic Maps**: Use attendance rate report data
- **Trend Charts**: Use trends endpoint with appropriate groupBy
- **Comparison Charts**: Use gender and disability reports
