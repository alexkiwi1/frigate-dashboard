// Test timezone conversion
const testDate = "2025-10-20T07:57:40.289+00:00";
const date = new Date(testDate);

console.log('Input UTC time:', testDate);
console.log('UTC time:', date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC'
}));
console.log('PKT time:', date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Karachi'
}));
