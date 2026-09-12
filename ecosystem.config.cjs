module.exports = {
  apps: [
    {
      name: "soumbolinho-dev",
      script: "./node_modules/vite/bin/vite.js",
      args: "--host",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "development",
        PORT: 5173
      }
    }
  ]
};
