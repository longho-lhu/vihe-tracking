module.exports = {
    apps: [
        {
            name: 'vihe-tracking',
            cwd: __dirname,
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3021',
            env: {
                NODE_ENV: 'production',
            }
        }
    ]
};