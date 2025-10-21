// Test timezone conversion for real Frigate API data
const testTimestamp = 1760989238.90025; // From the API response

// Convert Unix timestamp to Pakistan time
const date = new Date(testTimestamp * 1000);
const pktTime = date.toLocaleString('en-US', { 
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const pktTime12 = date.toLocaleString('en-US', { 
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

console.log('Unix timestamp:', testTimestamp);
console.log('UTC time:', date.toISOString());
console.log('PKT time (24h):', pktTime);
console.log('PKT time (12h):', pktTime12);
console.log('Current time in PKT:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
