module.exports = {
  apps: [
    {
      name: 'synapse-admin-dev',
      script: '/home/bdren/.bun/bin/bun',
      args: 'server.ts',
      cwd: '/opt/synapse-admin-dev/current',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        HOST: '172.19.0.1',
        PORT: '3001',
      },
    },
  ],
};
