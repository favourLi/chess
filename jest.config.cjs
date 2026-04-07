/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/server/**/*.test.js', '**/src/**/*.test.js'],
  transform: {
    '\\.js$': [
      'babel-jest',
      {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { node: 'current' }
            }
          ]
        ]
      }
    ]
  },
  collectCoverageFrom: [
    'server/lib/xiangqiEngine.js',
    'src/net/watchInput.js',
    'src/replay/replayState.js'
  ],
  coveragePathIgnorePatterns: ['/node_modules/']
};
