/**
 * handlePrompts-utils.test.ts
 *
 * Jest tests for the handlePrompts function
 */

import { Answers } from "inquirer";
import * as fs from "fs";
import { AppLogger } from "../../src/logger/appLogger.js";
import { dotMagikubeConfig } from "../../src/core/utils/projectConfigReader-utils.js";
import { v4 as uuidv4 } from "uuid";

jest.mock("fs", () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

jest.mock("inquirer", () => ({
    prompt: jest.fn(),
}));
import inquirer from "inquirer";

jest.mock("../../src/prompts/prompt-generator.js", () => {
    return jest.fn().mockImplementation(() => ({
        getCloudProvider: () => [{ name: "cloud_provider" }],
        getRegion: () => [{ name: "region" }],
        getAwsProfile: () => [{ name: "aws_profile" }],
        getEnvironment: () => [{ name: "environment" }],
        getDomainPrompt: () => [{ name: "domain" }],
        getCIDRPrompt: () => [{ name: "cidr" }],
        getVPCPrompt: (vpcArray: any) => [{ name: "vpc" }],
        getFrontendApplicationType: () => [{ name: "frontend_type" }],
        getBackendApplicationType: () => [{ name: "backend_type" }],
        getgenAIApplication: () => [{ name: "genai" }],
        getCloudProviderPrompts: (provider: string) => [{ name: `${provider}_extra` }],
        getVersionControlPrompts: (repo: string) => [{ name: "vc" }],
        getLifecycles: (env: string) => [{ name: "lifecycle" }],
        getMicroService: () => [{ name: "service_type" }],
        getServiceName: () => [{ name: "service_name" }],
        getSourceCodeRepositories: () => [{ name: "source_code_repository" }],
    }));
});
import PromptGenerator from "../../src/prompts/prompt-generator.js";

jest.mock("../../src/prompts/credentials-prompts.js", () => {
    return jest.fn().mockImplementation(() => ({
        getCredentialsPrompts: (provider: string, responses: any) =>
            provider === "aws" ? [{ name: "access_key" }] : [],
        saveCredentials: jest.fn(),
    }));
});
import CredentialsPrompts from "../../src/prompts/credentials-prompts.js";

jest.mock("uuid", () => ({
    v4: jest.fn(),
}));
jest.mock("path", () => jest.requireActual("path"));

jest.mock("../../src/core/utils/projectConfigReader-utils.js", () => ({
    dotMagikubeConfig: jest.fn(),
}));

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        error: jest.fn(),
    },
}));

import { handlePrompts } from "../../src/core/utils/handlePrompts-utils";

describe("handlePrompts", () => {
    const mockedInquirer = inquirer as unknown as { prompt: jest.Mock };
    const mockedDotMagikube = dotMagikubeConfig as jest.Mock;
    const mockedUuid = uuidv4 as jest.Mock;
    const mockedSaveCredentials = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        mockedUuid.mockReturnValue("fixed-uuid-1234");

        (CredentialsPrompts as jest.Mock).mockImplementation(() => ({
            getCredentialsPrompts: (provider: string) =>
                provider === "aws" ? [{ name: "access_key" }] : [],
            saveCredentials: mockedSaveCredentials,
        }));

        mockedDotMagikube.mockReturnValue({ services: [] });

        jest.spyOn(fs, "existsSync").mockReturnValue(false);
        jest.spyOn(fs, "readFileSync").mockImplementation(() => Buffer.from("{}"));

        mockedInquirer.prompt.mockImplementation(async (prompt: any) => {
            const name = prompt.name;
            const mapping: Record<string, any> = {
                project_name: "my-project",
                cloud_provider: "aws",
                region: "us-west-2",
                aws_profile: "default",
                access_key: "AKIA_FAKE",
                environment: "dev",
                domain: "example.com",
                cidr: "10.0.0.0/16",
                vpc: "vpc-1",
                frontend_type: "react",
                backend_type: "express",
                genai: "none",
                aws_extra: "aws-extra",
                source_code_repository: "github",
                vc: "github-token",
                lifecycle: "daily",
                service_type: "backend-service",
                service_name: "my-backend-service",
            };
            return { [name]: mapping[name] ?? "unknown" };
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should run new with empty template and save credentials", async () => {
        const args = { name: "my-project" };

        const res = await handlePrompts(args, "new", "empty");

        expect(res.project_name).toBe("my-project");
        expect(res.project_id).toBe("fixed-uuid-1234");
        expect(res.cloud_provider).toBe("aws");
        expect(res.region).toBe("us-west-2");
        expect(res.aws_profile).toBe("default");

        expect(mockedSaveCredentials).toHaveBeenCalled();
    });

    it("should run new with vpc-rds-nodegroup-acm-ingress template and get domain", async () => {
        const args = { name: "project2" };

        const res = await handlePrompts(args, "new", "vpc-rds-nodegroup-acm-ingress");

        expect(res.domain).toBe("example.com");
    });

    it("should process module type vpc", async () => {
        const res = await handlePrompts({}, "module", undefined, "vpc");

        expect(res.cidr).toBe("10.0.0.0/16");
    });

    it("should process module type acm", async () => {
        const res = await handlePrompts({}, "module", undefined, "acm");

        expect(res.domain).toBe("example.com");
    });

    it("should fail rds module when vpc list empty", async () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        jest.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from(JSON.stringify({ moduleName: [] })));

        const exitSpy = jest
            .spyOn(process, "exit")
            .mockImplementation((() => {
                throw new Error("process.exit:1");
            }) as any);

        await expect(handlePrompts({}, "module", undefined, "rds")).rejects.toThrow(
            "process.exit:1"
        );

        expect(AppLogger.error).toHaveBeenCalled();

        exitSpy.mockRestore();
    });

    it("should process rds module with valid vpcs", async () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        jest.spyOn(fs, "readFileSync").mockReturnValue(
            Buffer.from(JSON.stringify({ moduleName: ["vpc-1", "vpc-2"] }))
        );

        const res = await handlePrompts({}, "module", undefined, "rds");

        expect(res.vpc).toBe("vpc-1");
    });

    it("should run full new flow when template undefined", async () => {
        const args = { name: "full-project" };

        const res = await handlePrompts(args, "new");

        expect(res.project_name).toBe("full-project");
        expect(res.project_id).toBe("fixed-uuid-1234");

        expect(res.cloud_provider).toBe("aws");
        expect(res.aws_extra).toBe("aws-extra");

        expect(res.environment).toBe("dev");
        expect(res.lifecycle).toBe("daily");

        expect(res.frontend_type).toBe("react");
        expect(res.backend_type).toBe("express");
        expect(res.genai).toBe("none");
    });

    it("should run create flow and ask repo prompts when no services exist", async () => {
        const res = await handlePrompts({}, "create");

        expect(res.service_type).toBe("backend-service");
        expect(res.backend_type).toBe("express");
        expect(res.source_code_repository).toBe("github");
        expect(res.vc).toBe("github-token");
    });

    it("should NOT ask repo prompts in create flow when services exist", async () => {
        mockedDotMagikube.mockReturnValueOnce({ services: ["abc"] });

        const res = await handlePrompts({}, "create");

        expect(res.service_type).toBe("backend-service");
        expect(res.source_code_repository).toBeUndefined();
    });
});
