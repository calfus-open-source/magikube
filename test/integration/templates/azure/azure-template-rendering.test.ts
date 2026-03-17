/**
 * Integration test: Azure template rendering via LiquidJS.
 *
 * Same approach as AWS: renders real Liquid templates from infrastructure-templates
 * with representative config, snapshots the output, and validates YAML/JSON where applicable.
 */

import { Liquid } from 'liquidjs';
import fs from 'fs';
import path from 'path';
import { AZURE_AKS_CONFIG } from '../template-fixtures.js';

const REPO_ROOT = path.resolve(process.cwd());
const DEFAULT_TEMPLATE_REPO = path.resolve(
  REPO_ROOT,
  '..',
  'infrastructure-templates',
);
const TEMPLATE_REPO = process.env.TEMPLATE_REPOS_PATH
  ? path.join(process.env.TEMPLATE_REPOS_PATH, 'infrastructure-templates')
  : DEFAULT_TEMPLATE_REPO;

const engine = new Liquid();

function templateExists(relativePath: string): boolean {
  return fs.existsSync(path.join(TEMPLATE_REPO, relativePath));
}

async function renderTemplate(
  relativePath: string,
  config: Record<string, unknown>,
): Promise<string> {
  const fullPath = path.join(TEMPLATE_REPO, relativePath);
  const template = fs.readFileSync(fullPath, 'utf8');
  return engine.parseAndRender(template, config);
}

const SKIP = !fs.existsSync(TEMPLATE_REPO);
const describeIfTemplates = SKIP ? describe.skip : describe;

// When template repo is missing, tests are automatically skipped via describeIfTemplates.

describeIfTemplates('Azure Template Rendering (integration)', () => {
  jest.setTimeout(30000);

  describe('Azure environment templates', () => {
    const envDir = 'azure/environments/dev';

    test('main.tf.liquid renders without errors and matches snapshot', async () => {
      const output = await renderTemplate(
        `${envDir}/main.tf.liquid`,
        AZURE_AKS_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('backend-config.tfvars.liquid renders', async () => {
      const output = await renderTemplate(
        `${envDir}/backend-config.tfvars.liquid`,
        AZURE_AKS_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('provider.tf.liquid renders', async () => {
      const output = await renderTemplate(
        `${envDir}/provider.tf.liquid`,
        AZURE_AKS_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('terraform.tfvars.liquid renders', async () => {
      const output = await renderTemplate(
        `${envDir}/terraform.tfvars.liquid`,
        AZURE_AKS_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('variables.tf.liquid renders', async () => {
      const output = await renderTemplate(
        `${envDir}/variables.tf.liquid`,
        AZURE_AKS_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('outputs.tf.liquid renders', async () => {
      if (!templateExists(`${envDir}/outputs.tf.liquid`)) return;
      const output = await renderTemplate(
        `${envDir}/outputs.tf.liquid`,
        AZURE_AKS_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });
  });

  describe('Azure module templates', () => {
    const moduleNames = [
      'acr',
      'ai_foundry',
      'application_gateway',
      'bastion',
      'key_vault',
      'security_groups',
      'sql_server',
      'vnet',
      'vpn_gateway',
    ];

    test.each(moduleNames)(
      'modules/%s/main.tf.liquid renders',
      async (moduleName) => {
        const templatePath = `azure/modules/${moduleName}/main.tf.liquid`;
        if (!templateExists(templatePath)) return;

        const output = await renderTemplate(templatePath, AZURE_AKS_CONFIG);
        expect(output).toBeTruthy();
        expect(output).toMatchSnapshot();
      },
    );

    test.each(moduleNames)(
      'modules/%s/variables.tf.liquid renders',
      async (moduleName) => {
        const templatePath = `azure/modules/${moduleName}/variables.tf.liquid`;
        if (!templateExists(templatePath)) return;

        const output = await renderTemplate(templatePath, AZURE_AKS_CONFIG);
        expect(output).toBeTruthy();
        expect(output).toMatchSnapshot();
      },
    );
  });

  describe('Azure Kubernetes templates', () => {
    const k8sModules = ['aks', 'common'];

    test.each(k8sModules)(
      'modules/kubernetes/%s/main.tf.liquid renders',
      async (subModule) => {
        const templatePath = `azure/modules/kubernetes/${subModule}/main.tf.liquid`;
        if (!templateExists(templatePath)) return;

        const output = await renderTemplate(templatePath, AZURE_AKS_CONFIG);
        expect(output).toBeTruthy();
        expect(output).toMatchSnapshot();
      },
    );
  });

  describe('All Azure .liquid files render without throwing', () => {
    test('every Azure liquid template renders without error', async () => {
      const azureTemplateDir = path.join(TEMPLATE_REPO, 'azure');
      if (!fs.existsSync(azureTemplateDir)) return;

      const findLiquidFiles = (dir: string): string[] => {
        const results: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results.push(...findLiquidFiles(fullPath));
          } else if (entry.name.endsWith('.liquid')) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const liquidFiles = findLiquidFiles(azureTemplateDir);
      expect(liquidFiles.length).toBeGreaterThan(0);

      const errors: string[] = [];
      for (const file of liquidFiles) {
        const relativePath = path.relative(TEMPLATE_REPO, file);
        try {
          const content = fs.readFileSync(file, 'utf8');
          await engine.parseAndRender(content, AZURE_AKS_CONFIG);
        } catch (err) {
          errors.push(`${relativePath}: ${(err as Error).message}`);
        }
      }

      if (errors.length > 0) {
        fail(`The following templates failed to render:\n${errors.join('\n')}`);
      }
    });
  });
});
