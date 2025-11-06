# SAMS Server Optimization Scripts

## Memory Optimization Setup

### 1. Create Database Indexes

Run this script to create optimized indexes for attendance analytics:

```bash
node scripts/createAttendanceIndexes.js
```

This will create the following indexes:

- `attendance_filters_compound`: For common filter combinations
- `attendance_date_compound`: For date-based queries
- `attendance_absence_compound`: For absence analysis
- `attendance_student_compound`: For student-based aggregations
- `attendance_school_compound`: For school-based aggregations
- `attendance_gender_compound`: For gender-based analysis
- `attendance_disability_compound`: For disability-based analysis

### 2. Update Routes (Optional)

To use the optimized controller, update your routes file:

```javascript
// In routes/attendanceAnalytics.js
const {
  getAttendanceAnalyticsOptimized,
  getAttendanceSummary,
} = require("../controller/attendanceAnalyticsOptimized");

// Add new optimized routes
router.get("/optimized", getAttendanceAnalyticsOptimized);
router.get("/summary", getAttendanceSummary);
```

### 3. Environment Variables

Add these to your `.env` file for better performance:

```env
# MongoDB connection with optimizations
MONGO_URI=mongodb://localhost:27017/sams?maxPoolSize=10&retryWrites=true

# API rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # per window

# Cache settings
CACHE_TTL_SECONDS=600  # 10 minutes
```

## Performance Monitoring

### Memory Usage Monitoring

Add this middleware to monitor memory usage:

```javascript
const monitorMemory = (req, res, next) => {
  const used = process.memoryUsage();
  console.log("Memory Usage:", {
    rss: Math.round((used.rss / 1024 / 1024) * 100) / 100 + " MB",
    heapTotal: Math.round((used.heapTotal / 1024 / 1024) * 100) / 100 + " MB",
    heapUsed: Math.round((used.heapUsed / 1024 / 1024) * 100) / 100 + " MB",
    external: Math.round((used.external / 1024 / 1024) * 100) / 100 + " MB",
  });
  next();
};

// Use on analytics routes
app.use("/express/attendance-analytics", monitorMemory);
```

### Query Performance Logging

```javascript
const logQueryPerformance = async (pipeline, options = {}) => {
  const startTime = Date.now();
  const result = await Attendance.aggregate(pipeline, options);
  const endTime = Date.now();

  console.log(`Query executed in ${endTime - startTime}ms`);
  console.log(`Pipeline stages: ${pipeline.length}`);
  console.log(`Results returned: ${result.length}`);

  return result;
};
```

## Troubleshooting

### Common Memory Issues

1. **Error: $push used too much memory**

   - Solution: Use the optimized controller or enable streaming mode
   - Add `?streamMode=true` to the request

2. **Aggregation timeout**

   - Solution: Add more specific filters or increase `maxTimeMS`
   - Use pagination with smaller `limit` values

3. **Slow query performance**
   - Solution: Ensure indexes are created
   - Run `db.attendance.getIndexes()` to verify

### Performance Tuning

1. **For very large datasets (>10M records)**:

   - Use streaming mode: `?streamMode=true`
   - Add specific geographic filters
   - Use summary endpoint for overview data

2. **For frequent queries**:

   - Implement Redis caching
   - Use pagination with reasonable limits (50-100)
   - Cache summary statistics separately

3. **For real-time dashboards**:
   - Use the summary endpoint for overview cards
   - Cache results for 5-10 minutes
   - Implement progressive loading for detailed reports

## Migration Guide

### From Original to Optimized API

1. **Update client code** to handle pagination:

   ```javascript
   // Before
   const response = await fetch("/attendance-analytics?year=2025");

   // After
   const response = await fetch(
     "/attendance-analytics?year=2025&page=1&limit=50"
   );
   ```

2. **Handle streaming responses**:

   ```javascript
   if (largeDataset) {
     const response = await fetch(
       "/attendance-analytics?year=2025&streamMode=true"
     );
     const reader = response.body.getReader();
     // Process streaming data
   }
   ```

3. **Use summary endpoint** for dashboard cards:
   ```javascript
   // For overview statistics only
   const summary = await fetch("/attendance-analytics/summary?year=2025");
   ```
