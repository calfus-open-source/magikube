/**
 * Template Contract Validation Tests
 *
 * Validates that the config objects magikube passes to LiquidJS
 * contain ALL variables listed in the template contract manifest.
 * If a variable is missing, the template will render with an empty
 * string instead of failing — making this a silent bug.
 *
 * These tests catch: variable renames in magikube config that break templates.
 */

import fs from 'fs';
import path from 'path';
import {
  AWS_EKS_FARGATE_CONFIG,
  AWS_EKS_NODEGROUP_CONFIG,
  AWS_K8S_CONFIG,
  AZURE_AKS_CONFIG,
} from './template-fixtures.js';

const CONTRACT_PATH = path.resolve(
  process.cwd(),
  'test/fixtures/template-contract.json',
);
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

describe('Template Contract Validation', () => {
  describe('AWS required variables', () => {
    const requiredVars: string[] = contract.aws.required_variables;

    test('EKS-Fargate config provides all required AWS variables', () => {
      const configKeys = Object.keys(AWS_EKS_FARGATE_CONFIG);
      const missing = requiredVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });

    test('EKS-Nodegroup config provides all required AWS variables', () => {
      const configKeys = Object.keys(AWS_EKS_NODEGROUP_CONFIG);
      const missing = requiredVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });

    test('K8S config provides all required AWS variables', () => {
      const configKeys = Object.keys(AWS_K8S_CONFIG);
      const missing = requiredVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });
  });

  describe('AWS conditional variables', () => {
    test('K8S config provides all k8s-specific variables', () => {
      const k8sVars: string[] =
        contract.aws.conditional_variables['cluster_type:k8s'];
      const configKeys = Object.keys(AWS_K8S_CONFIG);
      const missing = k8sVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });

    test('EKS-Fargate config provides all fargate-specific variables', () => {
      const fargateVars: string[] =
        contract.aws.conditional_variables['cluster_type:eks-fargate'];
      const configKeys = Object.keys(AWS_EKS_FARGATE_CONFIG);
      const missing = fargateVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });

    test('EKS-Nodegroup config provides all nodegroup-specific variables', () => {
      const nodegroupVars: string[] =
        contract.aws.conditional_variables['cluster_type:eks-nodegroup'];
      const configKeys = Object.keys(AWS_EKS_NODEGROUP_CONFIG);
      const missing = nodegroupVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });
  });

  describe('Azure required variables', () => {
    const requiredVars: string[] = contract.azure.required_variables;

    test('Azure AKS config provides all required Azure variables', () => {
      const configKeys = Object.keys(AZURE_AKS_CONFIG);
      const missing = requiredVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });
  });

  describe('Common module variables', () => {
    const requiredVars: string[] = contract.common.required_variables;

    test('AWS config provides all common module variables', () => {
      const configKeys = Object.keys(AWS_EKS_FARGATE_CONFIG);
      const missing = requiredVars.filter((v) => !configKeys.includes(v));
      expect(missing).toEqual([]);
    });
  });

  describe('Contract manifest integrity', () => {
    test('contract file is valid JSON with expected sections', () => {
      expect(contract).toHaveProperty('aws');
      expect(contract).toHaveProperty('azure');
      expect(contract).toHaveProperty('common');
      expect(contract.aws).toHaveProperty('required_variables');
      expect(contract.azure).toHaveProperty('required_variables');
      expect(contract.common).toHaveProperty('required_variables');
    });

    test('no duplicate variables in any section', () => {
      for (const section of ['aws', 'azure', 'common']) {
        const vars: string[] = contract[section].required_variables;
        const unique = [...new Set(vars)];
        expect(vars.length).toBe(unique.length);
      }
    });
  });
});
