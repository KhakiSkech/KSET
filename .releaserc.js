module.exports = {
  branches: [
    'main',
    {
      name: 'develop',
      prerelease: 'beta'
    }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true
      }
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'dist/**',
            label: 'Distribution files'
          },
          {
            path: 'docs/release-notes/*.md',
            label: 'Release notes'
          }
        ]
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};