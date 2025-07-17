// Script to fix all authentication issues in routes.ts
const fs = require('fs');

const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Replace all occurrences of getCurrentUserId() with getCurrentUserId(req)
let fixedContent = routesContent.replace(/getCurrentUserId\(\)/g, 'getCurrentUserId(req)');

// Add requireAuth middleware to all protected endpoints
const endpointsToProtect = [
  'app.get("/api/memories"',
  'app.post("/api/memories"',
  'app.patch("/api/memories',
  'app.get("/api/insights"',
  'app.get("/api/gratitude"',
  'app.post("/api/gratitude"',
  'app.get("/api/challenges',
  'app.post("/api/challenges',
  'app.patch("/api/challenges',
  'app.post("/api/meme',
  'app.post("/api/wellness'
];

endpointsToProtect.forEach(endpoint => {
  // Add requireAuth middleware if not already present
  const regex = new RegExp(`(${endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,]*), async`, 'g');
  fixedContent = fixedContent.replace(regex, (match) => {
    if (match.includes('requireAuth')) {
      return match;
    }
    return match.replace('), async', '), requireAuth, async');
  });
});

fs.writeFileSync('server/routes.ts', fixedContent);
console.log('Authentication fixes applied');