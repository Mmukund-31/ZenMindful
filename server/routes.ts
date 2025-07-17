import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import session from "express-session";
import { storage } from "./storage";
import { insertMoodEntrySchema, insertMemorySchema, insertChatMessageSchema, insertGratitudeEntrySchema, users, moodEntries, memories, chatMessages, gratitudeEntries, challengeProgress } from "@shared/schema";
import { generateAIResponse, analyzeMoodFromText, generateMoodInsights, generateMemeText, analyzeImageForMemory, generateMemoryGalleryTitle, analyzeImageAndGenerateMeme } from "./lib/openai";
import { db } from "./db";
import { desc, eq, inArray } from "drizzle-orm";
// Authentication middleware
const getCurrentUserId = (req: any): string => {
  // Get user ID from session or JWT token
  const userId = req.session?.userId || req.headers['x-user-id'];
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Store OTP codes temporarily (in production, use Redis or database)
const otpStore = new Map<string, { code: string; expires: number; userId?: string }>();

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mindease-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication middleware - CRITICAL FIX: Only use session for user isolation
  const requireAuth = (req: any, res: any, next: any) => {
    // ONLY use session userId - no headers to prevent data leakage
    const userId = req.session?.userId;
    
    console.log('=== AUTH CHECK ===');
    console.log('Session userId:', userId);
    console.log('Session ID:', req.sessionID);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    
    req.userId = userId;
    next();
  };

  const getCurrentUserId = (req: any): string => {
    // Try session first, then headers, and establish session from headers if needed
    let userId = req.session?.userId;
    
    if (!userId && req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
      // Establish session from header authentication
      req.session.userId = userId;
    }
    
    console.log('=== GET CURRENT USER ===');
    console.log('Session userId:', req.session?.userId);
    console.log('Header userId:', req.headers['x-user-id']);
    console.log('Using userId:', userId);
    
    if (!userId) {
      throw new Error('User ID not found in session or headers - authentication required');
    }
    return userId;
  };

  // User session verification and recovery endpoint
  app.post('/api/user/verify-session', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      console.log('=== VERIFYING USER SESSION ===');
      console.log('User ID:', userId);
      
      if (!userId || userId === 'undefined') {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Check if user exists in database
      const existingUser = await storage.getUser(userId);
      
      if (existingUser) {
        // Restore session for existing user
        req.session.userId = userId;
        console.log('SESSION RESTORED FOR EXISTING USER:', userId);
        res.json({ success: true, userId, userExists: true, user: existingUser });
      } else {
        // Create new user entry to preserve data structure
        const newUser = await storage.upsertUser({
          id: userId,
          firstName: 'New User',
          lastName: ''
        });
        req.session.userId = userId;
        console.log('NEW USER CREATED AND SESSION ESTABLISHED:', userId);
        res.json({ success: true, userId, userExists: false, user: newUser });
      }
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  // Comprehensive user data export endpoint
  app.get('/api/user/export-data', async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== EXPORTING USER DATA ===');
      console.log('Exporting data for userId:', userId);
      
      // Gather all user data
      const [user, moods, memories, chatMessages, gratitudeEntries, challengeProgress] = await Promise.all([
        storage.getUser(userId),
        storage.getMoodEntriesByUser(userId),
        storage.getMemoriesByUser(userId),
        storage.getChatMessagesByUser(userId),
        storage.getGratitudeEntriesByUser(userId),
        storage.getActiveChallengesByUser(userId)
      ]);

      const exportData = {
        user,
        dataSnapshot: {
          exportDate: new Date().toISOString(),
          totalMoodEntries: moods.length,
          totalMemories: memories.length,
          totalChatMessages: chatMessages.length,
          totalGratitudeEntries: gratitudeEntries.length,
          activeChallenges: challengeProgress.length
        },
        moods: moods.map(mood => ({
          ...mood,
          createdAt: mood.createdAt
        })),
        memories: memories.map(memory => ({
          ...memory,
          createdAt: memory.createdAt
        })),
        chatMessages: chatMessages.map(chat => ({
          ...chat,
          timestamp: chat.timestamp
        })),
        gratitudeEntries: gratitudeEntries.map(gratitude => ({
          ...gratitude,
          createdAt: gratitude.createdAt
        })),
        challengeProgress
      };

      console.log('Data export completed:', exportData.dataSnapshot);
      res.json(exportData);
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({ error: 'Failed to export user data' });
    }
  });

  // Data integrity check endpoint
  app.get('/api/user/data-integrity', async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== DATA INTEGRITY CHECK ===');
      console.log('Checking integrity for userId:', userId);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Count all user data
      const [moodCount, memoryCount, chatCount, gratitudeCount] = await Promise.all([
        storage.getMoodEntriesByUser(userId).then(entries => entries.length),
        storage.getMemoriesByUser(userId).then(entries => entries.length),
        storage.getChatMessagesByUser(userId).then(entries => entries.length),
        storage.getGratitudeEntriesByUser(userId).then(entries => entries.length)
      ]);

      const integrityReport = {
        userId,
        userExists: true,
        dataIntegrity: {
          totalMoodEntries: moodCount,
          totalMemories: memoryCount,
          totalChatMessages: chatCount,
          totalGratitudeEntries: gratitudeCount,
          lastUpdated: user.updatedAt,
          accountCreated: user.createdAt
        },
        status: 'healthy'
      };

      console.log('Data integrity check completed:', integrityReport.dataIntegrity);
      res.json(integrityReport);
    } catch (error) {
      console.error('Data integrity check error:', error);
      res.status(500).json({ error: 'Failed to check data integrity' });
    }
  });

  // Onboarding data endpoint
  app.post('/api/onboarding/complete', async (req: any, res) => {
    try {
      const { name, age, wellnessGoals, preferredTime, motivation } = req.body;
      const userId = getCurrentUserId(req);
      
      if (!userId || userId === 'undefined') {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Update existing user with onboarding data, preserving their actual name
      const user = await storage.upsertUser({
        id: userId,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        age,
        wellnessGoals: JSON.stringify(wellnessGoals),
        preferredTime,
        motivation
      });
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('Onboarding completion error:', error);
      res.status(500).json({ error: 'Failed to save onboarding data' });
    }
  });

  // Firebase authentication sync endpoint
  app.post('/api/auth/sync', async (req: any, res) => {
    try {
      const { uid, email, firstName, lastName, profileImageUrl, phoneNumber } = req.body;
      
      if (!uid) {
        return res.status(400).json({ error: 'Firebase UID is required' });
      }
      
      console.log('=== FIREBASE SYNC DEBUG ===');
      console.log('Creating user with name but NO onboarding data:', { uid, firstName, lastName });
      console.log('This creates incomplete users who need onboarding!');
      console.log('===========================');
      
      // Create or update user in our database - NO ONBOARDING DATA YET
      const user = await storage.upsertUser({
        id: uid,
        firstName,
        lastName,
        profileImageUrl,
        phoneNumber
        // Note: No email, age, wellnessGoals, motivation, preferredTime
        // User will be incomplete until they complete onboarding
      });
      
      // Set session
      req.session.userId = uid;
      
      res.json({ success: true, user, needsOnboarding: true });
    } catch (error) {
      console.error('Firebase sync error:', error);
      res.status(500).json({ error: 'Failed to sync user data' });
    }
  });

  // Legacy authentication routes (keeping for backward compatibility)
  app.post('/api/auth/email-login', async (req: any, res) => {
    try {
      const { email, password, isSignUp } = req.body;
      
      if (isSignUp) {
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          // User already exists, just log them in
          req.session.userId = existingUser.id;
          res.json({ 
            success: true, 
            user: existingUser,
            message: `Welcome back ${existingUser.firstName}!`
          });
          return;
        }
        
        // Create new personalized user
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate personalized user details
        const userNames = [
          { first: 'Alex', last: 'Johnson' },
          { first: 'Sam', last: 'Chen' },
          { first: 'Jordan', last: 'Smith' },
          { first: 'Casey', last: 'Davis' },
          { first: 'Taylor', last: 'Wilson' },
          { first: 'Morgan', last: 'Brown' },
          { first: 'Riley', last: 'Garcia' },
          { first: 'Avery', last: 'Miller' }
        ];
        
        const randomName = userNames[Math.floor(Math.random() * userNames.length)];
        
        const user = await storage.upsertUser({
          id: userId,
          email,
          firstName: randomName.first,
          lastName: randomName.last,
          profileImageUrl: null
        });
        req.session.userId = userId;
        res.json({ 
          success: true, 
          user,
          message: `Welcome ${randomName.first}! Your wellness journey begins now.`
        });
      } else {
        // Find existing user by email
        const existingUser = await storage.getUserByEmail(email);
        if (!existingUser) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.userId = existingUser.id;
        res.json({ success: true, user: existingUser });
      }
    } catch (error) {
      console.error('Email auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post('/api/auth/phone-send-otp', async (req: any, res) => {
    try {
      const { phoneNumber } = req.body;
      const otp = generateOTP();
      const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      otpStore.set(phoneNumber, { code: otp, expires });
      
      // In production, send actual SMS here
      console.log(`OTP for ${phoneNumber}: ${otp}`);
      
      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      console.error('OTP send error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  app.post('/api/auth/phone-verify-otp', async (req: any, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      const stored = otpStore.get(phoneNumber);
      
      if (!stored || stored.expires < Date.now()) {
        return res.status(401).json({ error: 'OTP expired or invalid' });
      }
      
      if (stored.code !== otp) {
        return res.status(401).json({ error: 'Invalid OTP' });
      }
      
      // Create or find user
      let user = await storage.getUserByPhone(phoneNumber);
      if (!user) {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create minimal user profile - actual name will be set during onboarding
        user = await storage.upsertUser({
          id: userId,
          phoneNumber,
          firstName: 'New User',
          lastName: '',
          profileImageUrl: null
        });
      }
      
      req.session.userId = user.id;
      otpStore.delete(phoneNumber);
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('OTP verify error:', error);
      res.status(500).json({ error: 'OTP verification failed' });
    }
  });

  app.post('/api/auth/google-login', async (req: any, res) => {
    try {
      const { googleToken, profile } = req.body;
      
      // In production, verify the Google token here
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = await storage.upsertUser({
        id: userId,
        email: profile.email,
        firstName: profile.given_name,
        lastName: profile.family_name,
        profileImageUrl: profile.picture,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      req.session.userId = userId;
      res.json({ success: true, user });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Google authentication failed' });
    }
  });

  // Establish stable session endpoint for comprehensive data persistence
  app.post('/api/auth/establish-session', async (req: any, res) => {
    try {
      const { deviceId, fingerprint } = req.body;
      
      console.log('=== SESSION ESTABLISHMENT ===');
      console.log('Device ID:', deviceId);
      console.log('Fingerprint:', fingerprint);
      
      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }
      
      // Check if user exists with this device ID
      let user = await storage.getUser(deviceId);
      
      if (user) {
        // Restore existing user session
        req.session.userId = deviceId;
        console.log('EXISTING USER RESTORED:', deviceId);
        res.json({ 
          success: true, 
          user,
          isReturning: true,
          message: `Welcome back ${user.firstName}! Your data is ready.`
        });
      } else {
        // Create new stable user
        user = await storage.upsertUser({
          id: deviceId,
          email: null,
          firstName: 'New User',
          lastName: '',
          profileImageUrl: null
        });
        
        req.session.userId = deviceId;
        console.log('NEW STABLE USER CREATED:', deviceId);
        res.json({ 
          success: true, 
          user,
          isReturning: false,
          message: 'Welcome! Your personalized wellness journey begins.'
        });
      }
    } catch (error) {
      console.error('Session establishment error:', error);
      res.status(500).json({ error: 'Failed to establish session' });
    }
  });

  // Session verification endpoint for persistent user identification
  app.post('/api/user/verify-session', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log('=== VERIFYING USER SESSION ===');
      console.log('User ID:', userId);
      
      // Check if user exists in database
      const existingUser = await storage.getUser(userId);
      
      if (existingUser) {
        // Restore session for existing user
        req.session.userId = userId;
        console.log('SESSION RESTORED FOR EXISTING USER:', userId);
        res.json({ 
          success: true, 
          userId,
          user: existingUser,
          isReturning: true 
        });
      } else {
        // User doesn't exist, create new one
        const user = await storage.upsertUser({
          id: userId,
          email: null,
          firstName: 'New User',
          lastName: '',
          profileImageUrl: null
        });
        
        req.session.userId = userId;
        console.log('NEW USER CREATED WITH EXISTING ID:', userId);
        res.json({ 
          success: true, 
          userId,
          user,
          isReturning: false 
        });
      }
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  // Simplified user management endpoints - REBUILT FROM SCRATCH
  app.post('/api/user/create', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log('=== CREATING NEW USER ===');
      console.log('User ID:', userId);
      
      // Create new user in database
      const user = await storage.upsertUser({
        id: userId,
        firstName: 'New User',
        lastName: '',
        email: null,
        profileImageUrl: null
      });
      
      // Set session for authentication
      req.session.userId = userId;
      
      console.log('USER CREATED AND SESSION SET:', userId);
      res.json({ success: true, userId, user });
    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.post('/api/user/verify-session', async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log('=== VERIFYING USER SESSION ===');
      console.log('User ID:', userId);
      
      // Check if user exists
      const user = await storage.getUser(userId);
      
      if (user) {
        // Set session for existing user
        req.session.userId = userId;
        console.log('USER SESSION VERIFIED:', userId);
        res.json({ success: true, userId, user });
      } else {
        console.log('USER NOT FOUND, CREATING NEW ONE');
        // User doesn't exist, create new one
        const newUser = await storage.upsertUser({
          id: userId,
          firstName: 'New User',
          lastName: '',
          email: null,
          profileImageUrl: null
        });
        
        req.session.userId = userId;
        res.json({ success: true, userId, user: newUser });
      }
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Create completely unique user endpoint for data isolation
  app.post('/api/auth/create-unique-user', async (req: any, res) => {
    try {
      const { uniqueDeviceId } = req.body;
      
      if (!uniqueDeviceId) {
        return res.status(400).json({ error: 'Unique device ID is required' });
      }
      
      // Create a completely new user with the unique device ID (no email for real users)
      const user = await storage.upsertUser({
        id: uniqueDeviceId,
        email: null, // No email to classify as real user
        firstName: 'New User',
        lastName: '',
        profileImageUrl: null
      });
      
      req.session.userId = uniqueDeviceId;
      res.json({ 
        success: true, 
        user,
        message: `Welcome! Your completely isolated wellness journey begins now.`
      });
    } catch (error) {
      console.error('Create unique user error:', error);
      res.status(500).json({ error: 'Failed to create unique user' });
    }
  });

  // Restore existing user endpoint for data persistence
  app.post('/api/auth/restore-user', async (req: any, res) => {
    try {
      const { uniqueDeviceId } = req.body;
      
      console.log('=== USER RESTORATION DEBUG ===');
      console.log('Received deviceId:', uniqueDeviceId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      if (!uniqueDeviceId) {
        console.log('ERROR: No device ID provided');
        return res.status(400).json({ error: 'Unique device ID is required' });
      }
      
      // Look for exact user match with this unique device ID
      const user = await storage.getUser(uniqueDeviceId);
      console.log('Found existing user:', user ? 'YES' : 'NO');
      if (user) {
        console.log('User details:', { id: user.id, firstName: user.firstName, hasOnboarding: !!user.age });
      }
      
      if (user) {
        req.session.userId = uniqueDeviceId;
        res.json({ 
          success: true, 
          user,
          message: `Welcome back! Your personal data has been restored.`
        });
      } else {
        console.log('Creating new user with deviceId:', uniqueDeviceId);
        // If user doesn't exist, create new one (no email for real users)
        const newUser = await storage.upsertUser({
          id: uniqueDeviceId,
          firstName: 'New User',
          lastName: '',
          profileImageUrl: null
        });
        
        console.log('New user created:', { id: newUser.id, firstName: newUser.firstName });
        
        req.session.userId = uniqueDeviceId;
        res.json({ 
          success: true, 
          user: newUser,
          message: `Welcome! Your isolated wellness journey begins now.`
        });
      }
      console.log('=== END RESTORATION DEBUG ===');
    } catch (error) {
      console.error('Restore user error:', error);
      res.status(500).json({ error: 'Failed to restore user' });
    }
  });

  // Update user profile with onboarding data endpoint
  app.post('/api/auth/update-user-profile', async (req: any, res) => {
    try {
      // Get userId from deviceId in request body (primary) or session (fallback)
      let userId = req.body.deviceId || req.session.userId;
      
      console.log('=== ONBOARDING PROFILE UPDATE ===');
      console.log('Request deviceId:', req.body.deviceId);
      console.log('Session userId:', req.session.userId);
      console.log('Final userId:', userId);
      
      if (!userId) {
        console.log('ERROR: No user ID found');
        return res.status(401).json({ error: 'No device ID or user ID provided. Please refresh and try again.' });
      }
      
      // Always set session for consistency
      req.session.userId = userId;
      
      const { name, age, wellnessGoals, preferredTime, motivation } = req.body;
      
      console.log('=== ONBOARDING DEBUG ===');
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      console.log('Extracted data:', { userId, name, age, wellnessGoals, preferredTime, motivation });
      console.log('========================');
      
      // Update user with complete onboarding information
      const updatedUser = await storage.upsertUser({
        id: userId,
        firstName: name?.split(' ')[0] || name || 'User',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        age: age || null,
        wellnessGoals: Array.isArray(wellnessGoals) ? JSON.stringify(wellnessGoals) : wellnessGoals || null,
        preferredTime: preferredTime || null,
        motivation: motivation || null,
        name: name || null, // Store in name field for backward compatibility
        profileImageUrl: null
      });
      
      console.log('User profile updated successfully:', updatedUser);
      
      res.json({ 
        success: true, 
        user: updatedUser,
        message: 'User profile updated successfully'
      });
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // Reset user data endpoint - completely wipes all user data
  app.post('/api/auth/reset-user', async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'No active session' });
      }
      
      // Delete all user data from all tables
      await db.delete(moodEntries).where(eq(moodEntries.userId, userId));
      await db.delete(memories).where(eq(memories.userId, userId));
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
      await db.delete(gratitudeEntries).where(eq(gratitudeEntries.userId, userId));
      await db.delete(challengeProgress).where(eq(challengeProgress.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      
      // Clear session
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
      });
      
      res.json({ 
        success: true, 
        message: 'All user data has been completely reset. You can start fresh now.'
      });
    } catch (error) {
      console.error('Reset user error:', error);
      res.status(500).json({ error: 'Failed to reset user data' });
    }
  });

  // Personalized Quick Start endpoint for unique user experiences
  app.post('/api/auth/quick-start', async (req: any, res) => {
    try {
      const { deviceId } = req.body;
      
      // Create unique user ID based on device and timestamp
      const userId = `user_${deviceId}_${Date.now()}`;
      
      // Create minimal user profile - actual name will be set during onboarding
      const user = await storage.upsertUser({
        id: userId,
        firstName: 'New User',
        lastName: '',
        profileImageUrl: null
      });
      
      // Create session for this personalized user
      req.session.userId = userId;
      
      res.json({ 
        success: true, 
        user,
        deviceId,
        message: `Welcome! Your personalized wellness journey begins now.`
      });
    } catch (error) {
      console.error('Quick start error:', error);
      res.status(500).json({ error: 'Failed to create personalized session' });
    }
  });

  // Initialize session for new users
  app.post('/api/auth/init', async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      
      // Priority order: provided sessionId > existing session > create new
      let userId: string;
      
      if (sessionId && sessionId !== 'undefined') {
        // Use provided sessionId and update session
        userId = sessionId;
        req.session.userId = userId;
      } else if (req.session.userId && req.session.userId !== 'undefined') {
        // Use existing session
        userId = req.session.userId;
      } else {
        // Create new session only as last resort
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        userId = `user_${timestamp}_${randomId}`;
        req.session.userId = userId;
      }
      
      // Check if user exists in database
      let user = await storage.getUser(userId);
      if (!user && userId !== 'undefined') {
        // Create minimal user profile - NO EMAIL AT ALL
        user = await storage.upsertUser({
          id: userId,
          firstName: 'New User',
          lastName: '',
          profileImageUrl: null
        });
      } else if (!user) {
        // Handle undefined case by creating a new valid user
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const newUserId = `user_${timestamp}_${randomId}`;
        req.session.userId = newUserId;
        
        user = await storage.upsertUser({
          id: newUserId,
          firstName: 'New User',
          lastName: '',
          profileImageUrl: null
        });
        
        userId = newUserId;
      }
      
      res.json({ success: true, user, sessionId: userId });
    } catch (error) {
      console.error('Session init error:', error);
      res.status(500).json({ error: 'Failed to initialize session' });
    }
  });

  // Check authentication status
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user has valid session
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Mood tracking endpoints - CRITICAL FIX: Consistent authentication
  app.post("/api/mood", async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== MOOD CREATE ===');
      console.log('Creating mood for userId:', userId);
      console.log('Mood data:', req.body);
      
      const moodData = insertMoodEntrySchema.parse({ ...req.body, userId });
      const moodEntry = await storage.createMoodEntry(moodData);
      
      console.log('Mood entry created:', moodEntry.id);
      res.json(moodEntry);
    } catch (error: any) {
      console.error("Mood creation error:", error);
      if (error?.message?.includes('User ID not found')) {
        return res.status(401).json({ error: "Authentication required. Please complete onboarding." });
      }
      res.status(400).json({ error: "Invalid mood data" });
    }
  });

  app.get("/api/mood", async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== MOOD FETCH ===');
      console.log('Fetching moods for userId:', userId);
      
      const entries = await storage.getMoodEntriesByUser(userId);
      
      console.log('Found mood entries:', entries.length);
      res.json(entries);
    } catch (error: any) {
      console.error("Mood fetch error:", error);
      if (error?.message?.includes('User ID not found')) {
        return res.status(401).json({ error: "Authentication required. Please complete onboarding." });
      }
      res.status(500).json({ error: "Failed to fetch mood entries" });
    }
  });

  app.get("/api/mood/recent", async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== RECENT MOOD FETCH ===');
      console.log('Fetching recent mood for userId:', userId);
      
      const entry = await storage.getRecentMoodEntry(userId);
      
      console.log('Recent mood entry found:', entry ? 'yes' : 'no');
      res.json(entry || null);
    } catch (error: any) {
      console.error("Recent mood fetch error:", error);
      if (error?.message?.includes('User ID not found')) {
        return res.status(401).json({ error: "Authentication required. Please complete onboarding." });
      }
      res.status(500).json({ error: "Failed to fetch recent mood" });
    }
  });

  // Enhanced multilingual chat endpoints with automatic language detection
  app.post("/api/chat", async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== MULTILINGUAL CHAT POST ===');
      console.log('Creating chat for userId:', userId);
      
      const { message, preferredLanguage } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Save user message
      await storage.createChatMessage({
        userId,
        message,
        isFromUser: true
      });

      // Get current mood for context
      const currentMood = await storage.getRecentMoodEntry(userId);
      
      // Get user profile for language preferences
      const user = await storage.getUser(userId);
      const userLanguagePreference = preferredLanguage || user?.preferredLanguage;
      
      // Generate multilingual AI response
      const aiResponse = await generateAIResponse(message, currentMood?.mood, userLanguagePreference);
      
      // Save AI response
      const aiMessage = await storage.createChatMessage({
        userId,
        message: aiResponse,
        isFromUser: false
      });

      console.log('Multilingual chat messages saved for user:', userId);
      res.json({ 
        response: aiResponse, 
        messageId: aiMessage.id,
        detectedLanguage: 'auto-detected',
        supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Hindi', 'Chinese', 'Japanese', 'Korean', 'Arabic']
      });
    } catch (error: any) {
      console.error("Multilingual chat error:", error);
      if (error?.message?.includes('User ID not found')) {
        return res.status(401).json({ error: "Authentication required. Please complete onboarding." });
      }
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/chat", async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      console.log('=== CHAT FETCH ===');
      console.log('Fetching chats for userId:', userId);
      
      const messages = await storage.getChatMessagesByUser(userId);
      
      console.log('Found chat messages:', messages.length);
      res.json(messages);
    } catch (error) {
      console.error("Chat fetch error:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Memory endpoints - FIXED: Proper session-based authentication
  app.post("/api/memories", upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required. Please complete onboarding." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const { title, description, category } = req.body;
      
      // Convert image to base64 for storage
      const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const memoryData = insertMemorySchema.parse({
        userId,
        title: title || 'Untitled Memory',
        description: description || '',
        imageUrl,
        category: category || 'other',
        isFavorite: false
      });

      const memory = await storage.createMemory(memoryData);
      res.json(memory);
    } catch (error) {
      console.error("Memory creation error:", error);
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  app.get("/api/memories", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required. Please complete onboarding." });
      }

      const { category } = req.query;
      let memories;
      
      if (category && typeof category === 'string') {
        memories = await storage.getMemoriesByCategory(userId, category);
      } else {
        memories = await storage.getMemoriesByUser(userId);
      }
      
      res.json(memories);
    } catch (error) {
      console.error("Memory fetch error:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  app.patch("/api/memories/:id/favorite", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;
      
      const memory = await storage.updateMemoryFavorite(parseInt(id), isFavorite);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  // AI-powered meme generator endpoint
  app.post("/api/meme/analyze-and-generate", upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const { style = 'funny' } = req.body;
      
      // Analyze image and generate funny meme text using AI
      const memeData = await analyzeImageAndGenerateMeme(req.file.buffer, style);
      
      res.json(memeData);
    } catch (error) {
      console.error("Meme generation error:", error);
      res.status(500).json({ error: "Failed to generate meme. Please try again." });
    }
  });

  // Get all user data endpoint for comprehensive dashboard
  app.get("/api/user/dashboard", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      // Get all user data in real-time
      const [
        user,
        moodEntries,
        recentMood,
        memories,
        chatMessages,
        gratitudeEntries,
        activeChallenges,
        completedChallenges
      ] = await Promise.all([
        storage.getUser(userId),
        storage.getMoodEntriesByUser(userId),
        storage.getRecentMoodEntry(userId),
        storage.getMemoriesByUser(userId),
        storage.getChatMessagesByUser(userId),
        storage.getGratitudeEntriesByUser(userId),
        storage.getActiveChallengesByUser(userId),
        storage.getCompletedChallengesByUser(userId)
      ]);

      // Calculate statistics
      const stats = {
        totalMoods: moodEntries.length,
        totalMemories: memories.length,
        totalGratitude: gratitudeEntries.length,
        activeChallengesCount: activeChallenges.length,
        completedChallengesCount: completedChallenges.length,
        recentActivity: moodEntries.slice(0, 10), // Last 10 mood entries
        favoriteMemories: memories.filter(m => m.isFavorite)
      };

      res.json({
        user,
        moodEntries: moodEntries.slice(0, 100), // Latest 100 entries
        recentMood,
        memories: memories.slice(0, 50), // Latest 50 memories
        chatMessages: chatMessages.slice(-20), // Last 20 messages
        gratitudeEntries: gratitudeEntries.slice(0, 30), // Latest 30 entries
        activeChallenges,
        completedChallenges,
        stats
      });
    } catch (error) {
      console.error("Dashboard data error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.post("/api/memories/analyze-image", async (req: any, res) => {
    try {
      const { base64Image } = req.body;
      
      if (!base64Image) {
        return res.status(400).json({ error: "Base64 image is required" });
      }

      const analysis = await analyzeImageForMemory(base64Image);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  app.post("/api/memories/gallery-title", async (req: any, res) => {
    try {
      const { memories } = req.body;
      
      if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "Memories array is required" });
      }

      const title = await generateMemoryGalleryTitle(memories);
      res.json({ title });
    } catch (error) {
      console.error("Error generating gallery title:", error);
      res.status(500).json({ error: "Failed to generate gallery title" });
    }
  });

  // Insights endpoint
  app.get("/api/insights", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      
      // Get all user data for personalized insights
      const [moodEntries, memories, chatMessages, gratitudeEntries, userProfile] = await Promise.all([
        storage.getMoodEntriesByUser(userId),
        storage.getMemoriesByUser(userId),
        storage.getChatMessagesByUser(userId),
        storage.getGratitudeEntriesByUser(userId),
        storage.getUser(userId)
      ]);

      // Generate personalized insights based on user profile and activity
      const { generatePersonalizedInsights } = await import("./lib/openai");
      const personalizedInsights = await generatePersonalizedInsights({
        moodEntries,
        memories,
        chatMessages,
        gratitudeEntries,
        userProfile
      });
      
      // Calculate mood distribution
      const moodCounts = moodEntries.reduce((acc: Record<string, number>, entry: any) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = moodEntries.length || 1;
      const moodDistribution = Object.entries(moodCounts).map(([mood, count]) => ({
        mood,
        percentage: Math.round((count as number / total) * 100)
      }));

      // Group mood entries by day and get the most recent mood for each day
      const dailyMoods = new Map<string, any>();
      moodEntries.forEach((entry: any) => {
        const dateKey = new Date(entry.timestamp).toDateString();
        if (!dailyMoods.has(dateKey) || new Date(entry.timestamp) > new Date(dailyMoods.get(dateKey).timestamp)) {
          dailyMoods.set(dateKey, entry);
        }
      });

      const weeklyData = Array.from(dailyMoods.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-7);

      res.json({
        insights: personalizedInsights,
        moodDistribution,
        totalEntries: moodEntries.length,
        dailyEntries: dailyMoods.size,
        weeklyData
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Analyze mood from text
  app.post("/api/mood/analyze", async (req: any, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      const analysis = await analyzeMoodFromText(text);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze mood" });
    }
  });

  // Generate meme text
  app.post("/api/meme/generate-text", async (req: any, res) => {
    try {
      const { memoryTitle, memoryCategory, style } = req.body;
      
      const memeText = await generateMemeText(memoryTitle, memoryCategory, style);
      res.json(memeText);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate meme text" });
    }
  });

  // Generate daily wellness tip
  app.post("/api/wellness/daily-tip", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const [user, recentMoods] = await Promise.all([
        storage.getUser(userId),
        storage.getMoodEntriesByUser(userId)
      ]);

      const { generateDailyWellnessTip } = await import("./lib/openai");
      
      // Provide context for personalized tips
      const userContext = {
        wellnessGoals: user?.wellnessGoals || [],
        preferredTime: user?.preferredTime,
        recentMoods: recentMoods.slice(-3).map(m => ({ mood: m.mood, rating: m.rating }))
      };
      
      const tip = await generateDailyWellnessTip(userContext);
      res.json({ tip });
    } catch (error) {
      console.error("Daily tip generation error:", error);
      res.status(500).json({ error: "Failed to generate daily tip" });
    }
  });

  // Gratitude entries routes
  app.post("/api/gratitude", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const { content, date } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Content is required" });
      }

      const gratitudeData = insertGratitudeEntrySchema.parse({
        userId,
        content: content.trim(),
        date: date ? new Date(date) : new Date()
      });

      const gratitudeEntry = await storage.createGratitudeEntry(gratitudeData);
      res.json(gratitudeEntry);
    } catch (error) {
      console.error("Gratitude entry creation error:", error);
      res.status(500).json({ error: "Failed to create gratitude entry" });
    }
  });

  app.get("/api/gratitude", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const gratitudeEntries = await storage.getGratitudeEntriesByUser(userId);
      res.json(gratitudeEntries);
    } catch (error) {
      console.error("Gratitude entries fetch error:", error);
      res.status(500).json({ error: "Failed to fetch gratitude entries" });
    }
  });

  app.get("/api/gratitude/insights", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const gratitudeEntries = await storage.getGratitudeEntriesByUser(userId);
      
      if (gratitudeEntries.length === 0) {
        return res.json({ patterns: [] });
      }

      // Simple insights without AI for now
      const insights = {
        patterns: [
          `You've recorded ${gratitudeEntries.length} gratitude entries`,
          "Keep tracking your gratitude to discover patterns in what brings you joy"
        ]
      };
      
      res.json(insights);
    } catch (error) {
      console.error("Gratitude insights error:", error);
      res.status(500).json({ error: "Failed to generate gratitude insights" });
    }
  });

  // Challenges routes
  app.get("/api/challenges/active", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const activeChallenges = await storage.getActiveChallengesByUser(userId);
      res.json(activeChallenges);
    } catch (error) {
      console.error("Active challenges fetch error:", error);
      res.status(500).json({ error: "Failed to fetch active challenges" });
    }
  });

  app.get("/api/challenges/available", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const [user, completedChallenges, recentMoods] = await Promise.all([
        storage.getUser(userId),
        storage.getCompletedChallengesByUser(userId),
        storage.getMoodEntriesByUser(userId)
      ]);
      
      const completedIds = completedChallenges.map(c => c.challengeId);
      
      // Get standard challenges
      const standardChallenges = await storage.getAvailableChallenges(userId);
      
      // Generate AI-powered personalized challenges based on user profile and mood patterns
      let personalizedChallenges = [];
      if (user) {
        try {
          const { generatePersonalizedChallenges } = await import("./lib/openai");
          
          // Enhanced user profile with mood context for better personalization
          const enhancedProfile = {
            ...user,
            recentMoodPatterns: recentMoods.slice(-7).map(m => ({ mood: m.mood, rating: m.rating })),
            moodTrend: recentMoods.length > 0 ? 
              recentMoods.slice(-3).reduce((sum, m) => sum + m.rating, 0) / Math.min(3, recentMoods.length) : 3
          };
          
          personalizedChallenges = await generatePersonalizedChallenges(enhancedProfile, completedIds);
        } catch (error) {
          console.error("Error generating personalized challenges:", error);
        }
      }
      
      res.json([...standardChallenges, ...personalizedChallenges]);
    } catch (error) {
      console.error("Available challenges fetch error:", error);
      res.status(500).json({ error: "Failed to fetch available challenges" });
    }
  });

  app.get("/api/challenges/completed", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const completedChallenges = await storage.getCompletedChallengesByUser(userId);
      res.json(completedChallenges);
    } catch (error) {
      console.error("Completed challenges fetch error:", error);
      res.status(500).json({ error: "Failed to fetch completed challenges" });
    }
  });

  app.post("/api/challenges/join", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const { challengeId } = req.body;
      
      if (!challengeId) {
        return res.status(400).json({ error: "Challenge ID is required" });
      }

      const challenge = await storage.joinChallenge(userId, challengeId);
      res.json(challenge);
    } catch (error) {
      console.error("Challenge join error:", error);
      res.status(500).json({ error: "Failed to join challenge" });
    }
  });

  app.post("/api/challenges/progress", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const { challengeId, completed, date } = req.body;
      
      if (!challengeId || typeof completed !== 'boolean') {
        return res.status(400).json({ error: "Challenge ID and completed status are required" });
      }

      const progress = await storage.updateChallengeProgress(userId, challengeId, completed, date);
      res.json(progress);
    } catch (error) {
      console.error("Challenge progress error:", error);
      res.status(500).json({ error: "Failed to update challenge progress" });
    }
  });

  // Clean admin database endpoint - onboarding data only
  app.get("/api/admin/database", async (req: any, res) => {
    try {
      // Get only users for onboarding analysis
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

      // Simple onboarding completion check
      const isOnboardingComplete = (user: any) => {
        return !!(user.age && user.wellnessGoals && user.motivation && user.preferredTime);
      };

      // Clean user reports focusing only on onboarding data
      const onboardingReports = allUsers.map(user => ({
        id: user.id,
        firstName: user.firstName || 'Unnamed',
        lastName: user.lastName || '',
        email: user.email || 'No email',
        isComplete: isOnboardingComplete(user),
        onboardingData: {
          age: user.age || 'Not provided',
          wellnessGoals: user.wellnessGoals || 'Not provided',
          motivation: user.motivation || 'Not provided',
          preferredTime: user.preferredTime || 'Not provided'
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      // Count completion status
      const completeUsers = onboardingReports.filter(u => u.isComplete);
      const incompleteUsers = onboardingReports.filter(u => !u.isComplete);

      console.log(`Clean Admin: ${allUsers.length} total users (Complete: ${completeUsers.length}, Incomplete: ${incompleteUsers.length})`);

      res.json({
        totalUsers: allUsers.length,
        completedOnboarding: completeUsers.length,
        incompleteOnboarding: incompleteUsers.length,
        completionRate: allUsers.length ? Math.round((completeUsers.length / allUsers.length) * 100) : 0,
        users: onboardingReports.sort((a, b) => {
          // Sort by completion status first, then by creation date
          if (a.isComplete !== b.isComplete) {
            return a.isComplete ? -1 : 1;
          }
          const dateA = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
          return dateB - dateA;
        })
      });
    } catch (error) {
      console.error("Admin database error:", error);
      res.status(500).json({ error: "Failed to fetch onboarding data" });
    }
  });

  // Database cleanup endpoint - remove last N users
  app.delete("/api/admin/cleanup-users/:count", async (req: any, res) => {
    try {
      const count = parseInt(req.params.count);
      
      if (!count || count <= 0 || count > 50) {
        return res.status(400).json({ error: "Count must be between 1 and 50" });
      }

      // Get the last N users ordered by creation date
      const usersToDelete = await db
        .select({ id: users.id })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(count);

      if (usersToDelete.length === 0) {
        return res.json({ message: "No users found to delete", deletedCount: 0 });
      }

      const userIds = usersToDelete.map(user => user.id);

      // Delete related data first (foreign key constraints)
      await Promise.all([
        db.delete(moodEntries).where(inArray(moodEntries.userId, userIds)),
        db.delete(memories).where(inArray(memories.userId, userIds)),
        db.delete(chatMessages).where(inArray(chatMessages.userId, userIds)),
        db.delete(gratitudeEntries).where(inArray(gratitudeEntries.userId, userIds)),
        db.delete(challengeProgress).where(inArray(challengeProgress.userId, userIds))
      ]);

      // Delete the users
      await db.delete(users).where(inArray(users.id, userIds));

      res.json({ 
        message: `Successfully deleted ${userIds.length} users and their associated data`,
        deletedCount: userIds.length,
        deletedUserIds: userIds
      });
    } catch (error) {
      console.error("Database cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup database" });
    }
  });

  // AI-powered thought interruption techniques
  app.get("/api/wellness/thought-interruption", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const user = await storage.getUser(userId);
      const recentMoods = await storage.getMoodEntriesByUser(userId);
      
      const { generatePersonalizedThoughtInterruption } = await import("./lib/openai");
      const techniques = await generatePersonalizedThoughtInterruption(user, recentMoods.slice(-5));
      res.json({ techniques });
    } catch (error) {
      console.error("Thought interruption techniques error:", error);
      res.status(500).json({ error: "Failed to generate techniques" });
    }
  });

  // AI-powered personalized insights
  app.get("/api/insights/personalized", requireAuth, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const user = await storage.getUser(userId);
      const moodEntries = await storage.getMoodEntriesByUser(userId);
      const memories = await storage.getMemoriesByUser(userId);
      const chatMessages = await storage.getChatMessagesByUser(userId);
      const gratitudeEntries = await storage.getGratitudeEntriesByUser(userId);

      const { generatePersonalizedInsights } = await import("./lib/openai");
      const insights = await generatePersonalizedInsights({
        moodEntries,
        memories,
        chatMessages,
        gratitudeEntries,
        userProfile: user
      });
      
      res.json({ insights });
    } catch (error) {
      console.error("Personalized insights error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
