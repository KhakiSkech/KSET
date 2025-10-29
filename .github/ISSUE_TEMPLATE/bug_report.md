---
name: Bug Report
about: Create a report to help us improve
title: "[BUG] "
labels: ["bug", "needs-triage"]
assignees: ""

---

## Bug Description

A clear and concise description of what the bug is.

## Environment

**Please complete the following information:**

- **KSET Version**: (e.g., 1.0.0, 1.1.0-beta)
- **Node.js Version**: (e.g., 16.14.0, 18.17.0)
- **npm/yarn Version**: (e.g., npm 8.19.0, yarn 1.22.19)
- **Operating System**: (e.g., Windows 11, macOS 13.0, Ubuntu 22.04)
- **Provider**: (e.g., kiwoom, korea-investment, all)
- **Environment**: (e.g., development, production, paper trading)

## Reproduction Steps

Detailed steps to reproduce the behavior:

1. Install KSET: `npm install kset`
2. Create instance with this configuration:
   ```typescript
   // Your configuration code
   ```
3. Call this method/function:
   ```typescript
   // Your code that triggers the bug
   ```
4. See error/unexpected behavior

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Error Messages

If applicable, paste the complete error message, including stack trace:

```
Paste error message here
```

## Code Example

Please provide a minimal code example that reproduces the issue:

```typescript
// Minimal reproduction code
import { KSET } from 'kset';

async function reproduceBug() {
  // Your code here
}
```

## Additional Context

Add any other context about the problem here:

- **Provider-specific**: Is this issue specific to a particular provider?
- **Frequency**: How often does this happen? (always, sometimes, rarely)
- **Impact**: How does this affect your usage of KSET?
- **Workaround**: Have you found any workarounds?

## Debug Information

If possible, please run this diagnostic code and include the output:

```typescript
import { KSET } from 'kset';

const kset = new KSET({ logLevel: 'debug' });
console.log('KSET Info:', kset.getVersion());
console.log('Available Providers:', kset.getAvailableBrokers());
```

## Logs

Please provide relevant logs (with sensitive information redacted):

```
Paste logs here
```

## Checklist

- [ ] I have searched existing issues for similar bug reports
- [ ] I have provided a minimal reproduction example
- [ ] I have included all relevant environment information
- [ ] I have redacted any sensitive information (API keys, passwords, etc.)
- [ ] I understand that this is a volunteer-driven project and responses may take time

## Additional Information

Any additional information that might help us resolve the issue (screenshots, network configurations, broker-specific settings, etc.).

---

**Thank you for taking the time to report this bug!** 🙏

Your bug reports help us make KSET better for everyone. We appreciate your contribution to improving the Korea Stock Exchange Trading Library.