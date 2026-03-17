# CLI Output Fixtures (Contract Test Source of Truth)

These JSON files contain recorded outputs from real CLI tools and APIs.
They serve as the **single source of truth** for both:

1. **Contract tests** (`test/integration/cli-contracts.test.ts`) — validate that
   parsing code handles real output formats correctly.

2. **Unit test mocks** (`test/core/azure/azure-fixtures.ts`, `test/utils/terraformMock-utils.ts`) —
   should derive their mock data from these files to prevent drift.

## When to re-record

- **Azure CLI upgrade**: Re-record `azure-cli.json` outputs
- **Terraform upgrade**: Re-record `terraform-cli.json` patterns
- **GitHub API change**: Re-record `github-api.json` responses

## How to re-record

Run the actual CLI commands listed in each fixture's `command` field,
capture the output, and update the fixture file. Then run:

```bash
npm run test:integration
```

If contract tests fail, the parsing code needs updating.
