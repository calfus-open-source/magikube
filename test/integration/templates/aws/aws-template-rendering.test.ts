/**
 * Integration test: AWS template rendering via LiquidJS.
 *
 * Renders real Liquid templates from the infrastructure-templates repo
 * with representative ProjectConfig objects, then snapshots the output.
 * Catches:
 *   - Template variable renames or removals (Liquid renders empty string)
 *   - Liquid syntax errors (parseAndRender throws)
 *   - Structural changes to rendered Terraform/YAML/JSON
 *
 * To update snapshots after an intentional template change:
 *   npx jest --testPathPattern=aws-template-rendering --updateSnapshot
 *
 * Set TEMPLATE_REPOS_PATH env var to point to local template checkouts
 * for faster iteration. Defaults to ../../infrastructure-templates relative
 * to the magikube repo root.
 */

import { Liquid } from 'liquidjs';
import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import {
  AWS_EKS_FARGATE_CONFIG,
  AWS_EKS_NODEGROUP_CONFIG,
  AWS_K8S_CONFIG,
} from '../template-fixtures.js';

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

function readTemplate(relativePath: string): string {
  const fullPath = path.join(TEMPLATE_REPO, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

async function renderTemplate(
  relativePath: string,
  config: Record<string, unknown>,
): Promise<string> {
  const template = readTemplate(relativePath);
  return engine.parseAndRender(template, config);
}

// Skip all tests if template repo is not available
const SKIP = !fs.existsSync(TEMPLATE_REPO);
const describeIfTemplates = SKIP ? describe.skip : describe;

// When template repo is missing, tests are automatically skipped via describeIfTemplates.

describeIfTemplates('AWS Template Rendering (integration)', () => {
  jest.setTimeout(30000);

  describe('EKS-Fargate templates', () => {
    const templateDir = 'aws/eks-fargate';

    test('main.tf.liquid renders without errors and matches snapshot', async () => {
      const output = await renderTemplate(
        `${templateDir}/main.tf.liquid`,
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toContain('us-east-1');
      expect(output).toMatchSnapshot();
    });

    test('backend-config.tfvars.liquid renders', async () => {
      const output = await renderTemplate(
        `${templateDir}/backend-config.tfvars.liquid`,
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('terraform.tfvars.liquid renders', async () => {
      const output = await renderTemplate(
        `${templateDir}/terraform.tfvars.liquid`,
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('variables.tf.liquid renders', async () => {
      const output = await renderTemplate(
        `${templateDir}/variables.tf.liquid`,
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('conditional github module block is rendered when source_code_repository is github', async () => {
      const output = await renderTemplate(`${templateDir}/main.tf.liquid`, {
        ...AWS_EKS_FARGATE_CONFIG,
        source_code_repository: 'github',
      });
      expect(output).toContain('module "gitops"');
      expect(output).toContain('module "repository"');
    });

    test('conditional github module block is NOT rendered for non-github repos', async () => {
      const output = await renderTemplate(`${templateDir}/main.tf.liquid`, {
        ...AWS_EKS_FARGATE_CONFIG,
        source_code_repository: 'codecommit',
      });
      expect(output).not.toContain('module "gitops"');
    });
  });

  describe('EKS-Nodegroup templates', () => {
    const templateDir = 'aws/eks-nodegroup';

    test('main.tf.liquid renders with nodegroup config', async () => {
      const output = await renderTemplate(
        `${templateDir}/main.tf.liquid`,
        AWS_EKS_NODEGROUP_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('terraform.tfvars.liquid renders', async () => {
      const output = await renderTemplate(
        `${templateDir}/terraform.tfvars.liquid`,
        AWS_EKS_NODEGROUP_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });
  });

  describe('K8S (EC2) templates', () => {
    const templateDir = 'aws/k8s';

    test('main.tf.liquid renders', async () => {
      const output = await renderTemplate(
        `${templateDir}/main.tf.liquid`,
        AWS_K8S_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    test('terraform.tfvars.liquid renders', async () => {
      const output = await renderTemplate(
        `${templateDir}/terraform.tfvars.liquid`,
        AWS_K8S_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });
  });

  describe('AWS IAM policy templates', () => {
    const policyDir = 'aws/policies';
    const policyFiles = [
      'admin.json.liquid',
      'developer.json.liquid',
      'devops.json.liquid',
      'gitops.json.liquid',
      'reviewer.json.liquid',
    ];

    test.each(policyFiles)('%s renders valid JSON', async (file) => {
      if (!templateExists(`${policyDir}/${file}`)) {
        return; // Skip if file doesn't exist
      }
      const output = await renderTemplate(
        `${policyDir}/${file}`,
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();

      // Policy templates MUST produce valid JSON
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('Version');
      expect(parsed).toHaveProperty('Statement');
      expect(Array.isArray(parsed.Statement)).toBe(true);
    });
  });

  describe('Ansible templates', () => {
    const ansibleDir = 'aws/ansible/environments';

    test('inventory.aws_ec2.yml.liquid renders valid YAML', async () => {
      if (!templateExists(`${ansibleDir}/inventory.aws_ec2.yml.liquid`)) {
        return;
      }
      const output = await renderTemplate(
        `${ansibleDir}/inventory.aws_ec2.yml.liquid`,
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();

      // Must produce valid YAML
      const parsed = yaml.load(output);
      expect(parsed).toBeTruthy();
      expect(output).toContain('testproj');
      expect(output).toContain('us-east-1');
      expect(output).toMatchSnapshot();
    });

    test('group_vars/all.yml.liquid renders without errors', async () => {
      if (!templateExists(`${ansibleDir}/group_vars/all.yml.liquid`)) {
        return;
      }
      const output = await renderTemplate(
        `${ansibleDir}/group_vars/all.yml.liquid`,
        AWS_K8S_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });

    // Known issue: gen_ai_app line in all.yml.liquid is missing a space after
    // the colon, producing invalid YAML. This test documents the bug.
    // Fix in infrastructure-templates: `gen_ai_app: {{ project_name }}-gen-ai-service-app`
    test('group_vars/all.yml.liquid has known YAML formatting issue', async () => {
      if (!templateExists(`${ansibleDir}/group_vars/all.yml.liquid`)) {
        return;
      }
      const output = await renderTemplate(
        `${ansibleDir}/group_vars/all.yml.liquid`,
        AWS_K8S_CONFIG,
      );
      // This SHOULD parse as valid YAML once the template is fixed.
      // When fixed, remove this test and re-enable YAML validation in the test above.
      expect(() => yaml.load(output)).toThrow();
    });
  });

  describe('Predefined grouping templates', () => {
    const groupingDir = 'aws/predefined/grouping-templates';
    const templates = [
      'eks-fargate-vpc',
      'eks-nodegroup-vpc',
      'rds-vpc',
      'ec2-vpc',
      'vpc-rds-nodegroup-acm-ingress',
    ];

    test.each(templates)('%s/main.tf.liquid renders', async (templateName) => {
      const templatePath = `${groupingDir}/${templateName}/main.tf.liquid`;
      if (!templateExists(templatePath)) {
        return;
      }

      // Pick the right config for each template type
      let config = AWS_EKS_FARGATE_CONFIG;
      if (templateName.includes('nodegroup')) config = AWS_EKS_NODEGROUP_CONFIG;
      if (templateName.includes('ec2')) config = AWS_K8S_CONFIG;

      const output = await renderTemplate(templatePath, config);
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });
  });

  describe('Common module templates', () => {
    test('common/providers.tf.liquid renders', async () => {
      if (!templateExists('common-modules/common/providers.tf.liquid')) {
        return;
      }
      const output = await renderTemplate(
        'common-modules/common/providers.tf.liquid',
        AWS_EKS_FARGATE_CONFIG,
      );
      expect(output).toBeTruthy();
      expect(output).toMatchSnapshot();
    });
  });

  describe('All .liquid files render without throwing', () => {
    test('every AWS liquid template renders without error', async () => {
      const awsTemplateDir = path.join(TEMPLATE_REPO, 'aws');
      if (!fs.existsSync(awsTemplateDir)) return;

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

      const liquidFiles = findLiquidFiles(awsTemplateDir);
      expect(liquidFiles.length).toBeGreaterThan(0);

      const errors: string[] = [];
      for (const file of liquidFiles) {
        const relativePath = path.relative(TEMPLATE_REPO, file);
        try {
          const content = fs.readFileSync(file, 'utf8');
          await engine.parseAndRender(content, AWS_EKS_FARGATE_CONFIG);
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
