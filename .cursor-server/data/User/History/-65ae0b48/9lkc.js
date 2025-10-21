// Debug timezone conversion
const sampleTime = "2025-10-20T09:50:31+05:00"; // This should be 09:50 in PKT
const date = new Date(sampleTime);

console.log("Original ISO string:", sampleTime);
console.log("Date object:", date);
console.log("UTC time:", date.toISOString());
console.log("Local time (browser):", date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false 
}));
console.log("PKT time (should be 09:50):", date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Karachi'
}));
console.log("UTC time:", date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC'
}));

// Test with different timezone formats
console.log("\nTesting different timezone formats:");
console.log("Asia/Karachi:", date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Karachi'
}));
console.log("Asia/Kolkata:", date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Kolkata'
}));
console.log("UTC+5:", date.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC+5'
}));
