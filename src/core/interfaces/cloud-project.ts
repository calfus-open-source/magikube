export interface CloudProject {
    // Profile activation methods
    AWSProfileActivate?(profileName: string): Promise<void>;
    
    // Terraform operations
    runTerraformInit(projectPath: string, backend: string, projectName: string): Promise<void>;
    runTerraformApply(projectPath: string, module?: string, moduleName?: string, varFile?: string): Promise<void>;
    runTerraformDestroy(projectPath: string, module?: string, varFile?: string): Promise<void>;
    runTerraformDestroyTemplate(projectPath: string, varFile?: string, statusFile?:any): Promise<void>;
    
    // SSH operations
    startSSHProcess(): Promise<void>;
    stopSSHProcess(): Promise<void>;
} 