// PM2 ecosystem configuration for production deployment
module.exports = {
  apps: [{
    name: 'latvian-author-website',
    script: './server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Monitoring
    watch: false, // Set to true for development
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      'tests',
      '.git'
    ],
    
    // Advanced features
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,
    
    // Environment variables
    env_file: '.env'
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/latvian-author-website.git',
      path: '/var/www/latvian-author-website',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};