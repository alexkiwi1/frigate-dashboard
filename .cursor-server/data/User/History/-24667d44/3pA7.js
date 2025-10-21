// Test timezone conversion functionality
const getTimezoneFromAbbreviation = (abbreviation) => {
  const timezoneMap = {
    'PKT': 'Asia/Karachi',
    'EST': 'America/New_York',
    'UTC': 'UTC',
    'CET': 'Europe/Paris',
    'JST': 'Asia/Tokyo'
  };
  return timezoneMap[abbreviation] || 'Asia/Karachi';
};

// Test the timezone conversion
const testTimezoneConversion = () => {
  console.log('Testing timezone conversion...');
  
  // Test PKT conversion
  const pktTimezone = getTimezoneFromAbbreviation('PKT');
  console.log('PKT ->', pktTimezone);
  
  // Test with a sample time
  const sampleTime = '2025-01-21T12:00:00+05:00'; // 12:00 PM PKT
  const date = new Date(sampleTime);
  
  console.log('\nOriginal time (ISO):', sampleTime);
  console.log('Browser local time:', date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }));
  console.log('PKT time (should be 12:00):', date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: pktTimezone
  }));
  console.log('EST time (should be 02:00):', date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York'
  }));
};

testTimezoneConversion();
