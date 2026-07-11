module.exports = {
  apps: [
    {
      name:         'gotripv2',
      script:       'src/server.js',
      instances:    'max',          // one process per CPU core
      exec_mode:    'cluster',
      watch:         false,
      max_memory_restart: '500M',

      env_production: {
        NODE_ENV: 'production',
        PORT:      4000,
      },

      // logging
      out_file:  '/var/log/pm2/gotripv2-out.log',
      error_file:'/var/log/pm2/gotripv2-err.log',
      merge_logs:  true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
