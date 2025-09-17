const express = require('express');
const { Content, ContactMessage } = require('../models');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { validateContactForm, sanitizeInputs } = require('../middleware/validation');
const router = express.Router();

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 contact form submissions per windowMs
  message: {
    error: 'Too many contact form submissions, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many contact form submissions, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Apply input sanitization to all API routes
router.use(sanitizeInputs);

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbCheck = await Promise.race([
      Content.findAll().then(() => true),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbCheck ? 'connected' : 'disconnected',
      responseTime: `${duration}ms`,
      version: require('../../package.json').version,
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Health check failed:', {
      error: error.message,
      duration: `${duration}ms`,
      requestId: req.id
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: `${duration}ms`,
      version: require('../../package.json').version,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * GET /api/content/:section
 * Fetch content for a specific section
 */
router.get('/content/:section', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { section } = req.params;
    
    // Validate section parameter
    const validSections = ['interesanti', 'gramatas', 'fragmenti'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: 'Invalid section',
        message: 'Section must be one of: interesanti, gramatas, fragmenti',
        validSections,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Fetch content from database with timeout
    const content = await Promise.race([
      Content.findBySection(section),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      section: section,
      content: content.map(item => item.toJSON()),
      meta: {
        count: content.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Error fetching content:', {
      error: error.message,
      section: req.params.section,
      duration: `${duration}ms`,
      requestId: req.id,
      stack: error.stack
    });
    
    // Handle specific error types
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long to process',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch content',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /api/content/:section/:type
 * Fetch content for a specific section and type
 */
router.get('/content/:section/:type', async (req, res) => {
  try {
    const { section, type } = req.params;
    
    // Validate parameters
    const validSections = ['interesanti', 'gramatas', 'fragmenti'];
    const validTypes = ['text', 'image'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: 'Invalid section. Must be one of: interesanti, gramatas, fragmenti'
      });
    }
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type. Must be one of: text, image'
      });
    }
    
    // Fetch content from database
    const content = await Content.findBySectionAndType(section, type);
    
    res.json({
      success: true,
      section: section,
      type: type,
      content: content.map(item => item.toJSON())
    });
    
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
router.post('/contact', contactLimiter, validateContactForm, async (req, res) => {
  const startTime = Date.now();
  let contactMessage = null;
  
  try {
    const { name, email, message } = req.body;
    
    // Data is already validated and sanitized by middleware
    const sanitizedData = { name, email, message };
    
    // Save contact message to database with timeout
    contactMessage = new ContactMessage({
      name: sanitizedData.name,
      email: sanitizedData.email,
      message: sanitizedData.message,
      status: 'sent' // Will be updated to 'failed' if email sending fails
    });
    
    await Promise.race([
      contactMessage.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database save timeout')), 5000)
      )
    ]);
    
    // Send email with timeout and retry logic
    let emailSent = false;
    let emailError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const transporter = createEmailTransporter();
        
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_USER,
          subject: `New Contact Form Message from ${sanitizedData.name}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${sanitizedData.name}</p>
            <p><strong>Email:</strong> ${sanitizedData.email}</p>
            <p><strong>Message:</strong></p>
            <p>${sanitizedData.message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Sent from the Ilze Skrastiņa website contact form</small></p>
            <p><small>Request ID: ${req.id}</small></p>
          `,
          text: `
            New Contact Form Submission
            
            Name: ${sanitizedData.name}
            Email: ${sanitizedData.email}
            Message: ${sanitizedData.message}
            
            Sent from the Ilze Skrastiņa website contact form
            Request ID: ${req.id}
          `
        };
        
        // Send email with timeout
        await Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email send timeout')), 10000)
          )
        ]);
        
        emailSent = true;
        break;
        
      } catch (error) {
        emailError = error;
        console.error(`Email attempt ${attempt} failed:`, {
          error: error.message,
          attempt,
          requestId: req.id
        });
        
        // Wait before retry (except on last attempt)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    if (emailSent) {
      // Update status to sent
      await contactMessage.updateStatus('sent');
      
      console.log('Contact form success:', {
        name: sanitizedData.name,
        email: sanitizedData.email,
        duration: `${duration}ms`,
        requestId: req.id
      });
      
      res.json({
        success: true,
        message: 'Your message has been sent successfully!',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
      
    } else {
      // Update status to failed
      await contactMessage.updateStatus('failed');
      
      console.error('Contact form email failed after all attempts:', {
        error: emailError?.message,
        name: sanitizedData.name,
        email: sanitizedData.email,
        duration: `${duration}ms`,
        requestId: req.id
      });
      
      res.status(500).json({
        error: 'Failed to send email',
        message: 'We received your message but could not send the email notification. Please try again or contact us directly.',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Contact form error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      duration: `${duration}ms`,
      requestId: req.id
    });
    
    // Try to update message status if it was created
    if (contactMessage) {
      try {
        await contactMessage.updateStatus('failed');
      } catch (updateError) {
        console.error('Failed to update contact message status:', updateError);
      }
    }
    
    // Handle specific error types
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long to process. Please try again.',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong while processing your message. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

module.exports = router;