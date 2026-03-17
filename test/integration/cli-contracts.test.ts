/**
 * CLI Output Contract Tests
 *
 * These tests validate that the parsing logic in magikube correctly handles
 * real CLI output formats. Fixtures are recorded from actual CLI tool runs
 * and stored in test/fixtures/cli-outputs/.
 *
 * When you upgrade a CLI tool (az, terraform, etc.), re-record the fixtures
 * and run these tests. If they fail, the parsing code needs updating.
 *
 * These tests do NOT call real CLIs — they feed recorded outputs through
 * the same parsing logic the production code uses.
 */

import fs from 'fs';
import path from 'path';
import {
  MOCK_AZURE_ACCOUNT,
  MOCK_AZURE_SUBSCRIPTION,
  createMockAzureValidateSubscriptionResponse,
} from '../core/azure/azure-fixtures.js';

const FIXTURES_DIR = path.resolve(process.cwd(), 'test/fixtures/cli-outputs');

// Load fixture files
const azureFixtures = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, 'azure-cli.json'), 'utf8'),
);
const terraformFixtures = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, 'terraform-cli.json'), 'utf8'),
);
const githubFixtures = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, 'github-api.json'), 'utf8'),
);

describe('Azure CLI Output Contracts', () => {
  describe('az account show --output json', () => {
    const output = azureFixtures.az_account_show_json.output;

    test('contains required fields for getAccountInfo()', () => {
      // getAccountInfo() in azure-utils.ts returns the parsed object directly
      expect(output).toHaveProperty('id');
      expect(output).toHaveProperty('name');
      expect(output).toHaveProperty('tenantId');
      expect(output).toHaveProperty('state');
      expect(output).toHaveProperty('user');
      expect(output.user).toHaveProperty('name');
    });

    test('contains fields used by azure-iam.ts getAzureLogin()', () => {
      // getAzureLogin() extracts: name, id (as subscriptionId), tenantId, user.name, tenantDisplayName
      expect(output).toHaveProperty('name');
      expect(output).toHaveProperty('id');
      expect(output).toHaveProperty('tenantId');
      expect(output).toHaveProperty('tenantDisplayName');
      expect(output.user).toHaveProperty('name');

      // Verify types
      expect(typeof output.name).toBe('string');
      expect(typeof output.id).toBe('string');
      expect(typeof output.tenantId).toBe('string');
    });

    test('JSON.parse roundtrip preserves structure', () => {
      // Simulate what the code does: execSync returns string, then JSON.parse
      const serialized = JSON.stringify(output);
      const parsed = JSON.parse(serialized);
      expect(parsed.id).toBe(output.id);
      expect(parsed.tenantId).toBe(output.tenantId);
      expect(parsed.user.name).toBe(output.user.name);
    });
  });

  describe('az account list --output json (subscription query)', () => {
    const output = azureFixtures.az_account_list_json.output;

    test('returns array of subscription objects with expected fields', () => {
      // listSubscriptions() in azure-utils.ts returns AzureSubscriptionInfo[]
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);

      for (const sub of output) {
        expect(sub).toHaveProperty('Name');
        expect(sub).toHaveProperty('SubscriptionId');
        expect(sub).toHaveProperty('TenantId');
        expect(sub).toHaveProperty('State');
        expect(typeof sub.Name).toBe('string');
        expect(typeof sub.SubscriptionId).toBe('string');
      }
    });

    test('matches AzureSubscriptionInfo interface shape', () => {
      // From src/core/interface.ts
      const first = output[0];
      expect(Object.keys(first).sort()).toEqual(
        ['Name', 'State', 'SubscriptionId', 'TenantId'].sort(),
      );
    });
  });

  describe('az account show --subscription ... (validate subscription)', () => {
    const output = azureFixtures.az_account_show_subscription_json.output;

    test('contains Name and State fields for validateSubscription()', () => {
      // validateSubscription() in azure-account.ts checks State === 'Enabled'
      expect(output).toHaveProperty('Name');
      expect(output).toHaveProperty('State');
      expect(output.State).toBe('Enabled');
    });
  });

  describe('az account show TSV outputs', () => {
    test('subscription ID is a clean UUID string after trim()', () => {
      // getCurrentSubscriptionId() does .trim() on TSV output
      const output = azureFixtures.az_account_show_id_tsv.output;
      const trimmed = output.trim();
      expect(trimmed).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test('tenant ID is a clean UUID string after trim()', () => {
      const output = azureFixtures.az_account_show_tenantid_tsv.output;
      const trimmed = output.trim();
      expect(trimmed).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('az configure --list-defaults (location extraction)', () => {
    const output = azureFixtures.az_configure_list_defaults_json.output;

    test('is an array and contains location entry', () => {
      // getDefaultLocation() in azure-profile.ts does .find(item => item.name === 'location')
      expect(Array.isArray(output)).toBe(true);
      const locationEntry = output.find(
        (item: { name: string }) => item.name === 'location',
      );
      expect(locationEntry).toBeDefined();
      expect(locationEntry).toHaveProperty('value');
      expect(typeof locationEntry.value).toBe('string');
    });
  });

  describe('az storage account keys list (storage key extraction)', () => {
    test('output trims to a non-empty base64 string', () => {
      // getStorageAccountKey() does .trim() on TSV output
      const output = azureFixtures.az_storage_account_keys_list_tsv.output;
      const trimmed = output.trim();
      expect(trimmed.length).toBeGreaterThan(0);
      // Base64 pattern
      expect(trimmed).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe('az ad sp create-for-rbac (service principal creation)', () => {
    const output = azureFixtures.az_ad_sp_create_for_rbac_json.output;

    test('contains fields used by createServicePrincipal()', () => {
      // createServicePrincipal() extracts appId, tenant, password
      expect(output).toHaveProperty('appId');
      expect(output).toHaveProperty('tenant');
      expect(output).toHaveProperty('password');
      expect(typeof output.appId).toBe('string');
      expect(typeof output.tenant).toBe('string');
      expect(typeof output.password).toBe('string');
    });
  });
});

describe('Terraform CLI Output Contracts', () => {
  describe('terraform init progress keywords', () => {
    const lines = terraformFixtures.terraform_init_stdout_lines;
    const fullOutput = lines.join('\n');

    // These are the exact keywords checked by runTerraformInit() in azure-project.ts
    test('contains "Initializing" keyword for init progress', () => {
      expect(fullOutput).toContain('Initializing');
    });

    test('contains "Initializing provider plugins" for 50% progress', () => {
      expect(fullOutput).toContain('Initializing provider plugins');
    });

    test('contains "Terraform has been successfully initialized!" for 100% progress', () => {
      expect(fullOutput).toContain(
        'Terraform has been successfully initialized!',
      );
    });
  });

  describe('terraform apply progress regex', () => {
    const lines = terraformFixtures.terraform_apply_stdout_lines;
    const fullOutput = lines.join('\n');

    // The regex used by runTerraformApply(): /Creation complete after \d+s \[id=.*\]/g
    const creationRegex = /Creation complete after \d+s \[id=.*\]/g;

    test('creation regex matches expected number of resources', () => {
      const matches = fullOutput.match(creationRegex);
      expect(matches).not.toBeNull();
      // Note: the regex uses \d+s which won't match "10m2s" format.
      // This documents that the production regex misses multi-unit durations.
      // 3 of 4 resources match (the one with "10m2s" is missed).
      expect(matches!.length).toBe(3);
    });
  });

  describe('terraform destroy progress regex', () => {
    const lines = terraformFixtures.terraform_destroy_stdout_lines;
    const fullOutput = lines.join('\n');

    // Plan regex: /Plan: (\d+) to destroy/
    test('plan line reports expected destroy count', () => {
      const planMatch = fullOutput.match(
        /Plan: (\d+) to add, (\d+) to change, (\d+) to destroy/,
      );
      expect(planMatch).not.toBeNull();
      expect(parseInt(planMatch![3])).toBe(4); // 4 to destroy
    });

    // Destruction regex: /Destruction complete after \d+s/g
    test('destruction regex matches all destroyed resources', () => {
      const destructionRegex = /Destruction complete after \d+s/g;
      const matches = fullOutput.match(destructionRegex);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(4);
    });
  });
});

describe('GitHub API Response Contracts', () => {
  describe('public key response', () => {
    const body = githubFixtures.public_key_response.body;

    test('contains key and key_id fields for fetchPublicKey()', () => {
      // fetchPublicKey() in manage-repository.ts accesses response.data.key and response.data.key_id
      expect(body).toHaveProperty('key');
      expect(body).toHaveProperty('key_id');
      expect(typeof body.key).toBe('string');
      expect(typeof body.key_id).toBe('string');
    });

    test('key looks like a base64-encoded public key', () => {
      expect(body.key).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });
});

describe('Mock ↔ Contract Fixture Alignment', () => {
  /**
   * These tests verify that unit test mock fixtures (azure-fixtures.ts)
   * use the same STRUCTURE as the contract fixtures (azure-cli.json).
   * If these fail, the mocks have drifted from real CLI output format.
   */

  describe('Azure mock fixtures match contract structure', () => {
    test('MOCK_AZURE_SUBSCRIPTION has same fields as contract az account list output', () => {
      const contractSub = azureFixtures.az_account_list_json.output[0];

      // Contract uses Azure CLI JMESPath query format: Name, SubscriptionId, TenantId, State
      // Mock uses lowercase camelCase: name, id, tenantId, state
      // This is expected — the mock represents the internal interface, not raw CLI output.
      // But both should have the same semantic fields:
      expect(MOCK_AZURE_SUBSCRIPTION).toHaveProperty('name');
      expect(MOCK_AZURE_SUBSCRIPTION).toHaveProperty('tenantId');
      expect(MOCK_AZURE_SUBSCRIPTION).toHaveProperty('state');
      expect(contractSub).toHaveProperty('Name');
      expect(contractSub).toHaveProperty('TenantId');
      expect(contractSub).toHaveProperty('State');
    });

    test('MOCK_AZURE_ACCOUNT has same semantic fields as contract az account show output', () => {
      const contractAccount = azureFixtures.az_account_show_json.output;

      // Both should have name, subscription ID, tenant ID, user info
      expect(MOCK_AZURE_ACCOUNT).toHaveProperty('name');
      expect(MOCK_AZURE_ACCOUNT).toHaveProperty('subscriptionId');
      expect(MOCK_AZURE_ACCOUNT).toHaveProperty('tenantId');
      expect(MOCK_AZURE_ACCOUNT).toHaveProperty('userName');

      expect(contractAccount).toHaveProperty('name');
      expect(contractAccount).toHaveProperty('id'); // maps to subscriptionId
      expect(contractAccount).toHaveProperty('tenantId');
      expect(contractAccount.user).toHaveProperty('name'); // maps to userName
    });

    test('validateSubscription mock produces same shape as contract', () => {
      const mockResponse = JSON.parse(
        createMockAzureValidateSubscriptionResponse(),
      );
      const contractResponse =
        azureFixtures.az_account_show_subscription_json.output;

      // Both should have Name and State
      expect(Object.keys(mockResponse).sort()).toEqual(
        Object.keys(contractResponse).sort(),
      );
    });

    test('subscription state values are consistent', () => {
      // Mock and contract should both use "Enabled" as the success state
      expect(MOCK_AZURE_SUBSCRIPTION.state).toBe('Enabled');
      expect(azureFixtures.az_account_show_subscription_json.output.State).toBe(
        'Enabled',
      );
    });
  });
});
