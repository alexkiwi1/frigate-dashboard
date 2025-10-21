// Debug timezone conversion
const testDate = "2025-10-20T07:57:40.289+00:00";
const date = new Date(testDate);

console.log('=== Timezone Debug ===');
console.log('Input date:', testDate);
console.log('Date object:', date);
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

// Test different timezone formats
console.log('\n=== Different Timezone Formats ===');
console.log('Asia/Karachi:', date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Karachi'
}));
console.log('Asia/Kolkata:', date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Kolkata'
}));

// Test if the issue is with the timezone string
const timezoneMap = {
  'PKT': 'Asia/Karachi',
  'EST': 'America/New_York',
  'UTC': 'UTC',
  'CET': 'Europe/Paris',
  'JST': 'Asia/Tokyo'
};

console.log('\n=== Timezone Mapping Test ===');
console.log('PKT maps to:', timezoneMap['PKT']);
console.log('Using mapped timezone:', date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: timezoneMap['PKT']
}));
