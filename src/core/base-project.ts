import { Liquid } from "liquidjs";
import fs from "fs-extra";
import { dirname, join } from "path";
import SystemConfig from "../config/system.js";
import BaseCommand from "../commands/base.js";
import TerraformProject from "./terraform-project.js";
import { AppLogger } from "../logger/appLogger.js";
import { executeCommandWithRetry } from "./common-functions/execCommands.js";
import { readStatusFile } from "./utils/statusUpdater-utils.js";
import { modules } from "./constants/constants.js";

export default abstract class BaseProject {
  protected config: any = {};
  public command: BaseCommand;
  protected engine = new Liquid();
  protected projectPath: string = "";

  constructor(command: BaseCommand, config: any) {
    this.config = config;
    this.command = command;
  }

  async destroyProject(projectName: string, path: string): Promise<void> {
    //initialize terraform in the path
    this.projectPath = join(path, projectName);
    // Run terraform destroy
    AppLogger.debug(`Destroying project '${projectName}' in the path`, true);
    await this.terraformDestroy(projectName);
    await this.deleteFolder();
  }

  async terraformDestroy(projectName: string): Promise<void> {
    // Run terraform destroy
    AppLogger.info(`Running terraform destroy in the path`, true);
    const terraform = await TerraformProject.getProject(this.command);
    const modules = [
      "module.rds",
      "module.environment",
      "module.argo",
      "module.ingress-controller",
      "module.repository",
      "module.gitops",
      "module.ecr-repo",
      "module.acm",
      "module.eks",
      "module.vpc",
    ];

    if (
      this.config.cluster_type === "eks-fargate" ||
      this.config.cluster_type === "eks-nodegroup"
    ) {
      // Initialize Terraform once
      await terraform?.runTerraformInit(
        this.projectPath + `/infrastructure`,
        `${this.config.environment}-config.tfvars`,
        projectName
      );
      const readFile = readStatusFile(projectName);
      // Destroy modules one by one
      for (const module of modules) {
        if (readFile.modules[module] == "success") {
          try {
            AppLogger.debug(`Starting Terraform destroy for module: ${module}`);
            await terraform?.runTerraformDestroy(
              this.projectPath + `/infrastructure`,
              module,
              "terraform.tfvars"
            );
            AppLogger.debug(
              `Successfully destroyed Terraform for module: ${module}`
            );
          } catch (error) {
            AppLogger.error(
              `Error destroying Terraform for module: ${module}, ${error}`,
              true
            );
          }
        }
      }
    }
    // Check if it has multiple modules
    if (this.config.cluster_type === "k8s") {
      // Initialize the terraform
      // await terraform?.runTerraformInit(`${this.projectPath}/infrastructure`, `/infrastructure/${this.config.environment}-config.tfvars`);
      await terraform?.runTerraformInit(
        this.projectPath + `/infrastructure`,
        `${this.config.environment}-config.tfvars`,
        projectName
      );
      for (const module of modules) {
        try {
          terraform?.startSSHProcess();
          // Destroy the ingress and other helm modules
          await terraform?.runTerraformDestroy(
            this.projectPath + "/infrastructure",
            module,
            `terraform.tfvars`
          );
          terraform?.stopSSHProcess();
          AppLogger.debug(
            `Successfully destroyed Terraform for module: ${module}`,
            true
          );
        } catch (error) {
          AppLogger.error(
            `Error destroying Terraform for module: ${module}, ${error}`,
            true
          );
        }
      }
    }
    //await terraform?.runTerraformDestroy(this.projectPath);
  }

  async deleteFolder(): Promise<void> {
    if (fs.existsSync(this.projectPath)) {
      AppLogger.debug(`Removing folder '${this.projectPath}'`, true);
      fs.rmSync(this.projectPath, { recursive: true });
    } else {
      AppLogger.debug(
        `Folder '${this.projectPath}' does not exist in the path`,
        true
      );
    }
  }

  async createProject(name: string, path: string): Promise<void> {
    //initialize terraform in the path
    this.projectPath = join(path, name);
    await this.createFolder();

    const projectConfigFile = join(this.projectPath, ".magikube");
    AppLogger.debug(`Creating project '${name}' in the path`, true);
    fs.writeFileSync(projectConfigFile, JSON.stringify(this.config, null, 4));

    await this.createProviderFile();
  }
  async createFolder(): Promise<void> {
    //create a folder with the name in the path

    if (fs.existsSync(this.projectPath)) {
      AppLogger.debug(
        `Folder '${this.projectPath}' already exists in the path`
      );
      AppLogger.error(
        `Folder '${this.projectPath}' already exists in the path`
      );
    } else {
      AppLogger.debug(`Creating folder '${this.projectPath}' in the path`);
      fs.mkdirSync(this.projectPath);
    }
  }

  //   async createProviderFile(): Promise<void> {
  //     //create a providers.tf file in the path
  //     await this.createFile(
  //       "providers.tf",
  //       `${process.cwd()}/dist/templates/common/providers.tf.liquid`,
  //       "/infrastructure",
  //       true
  //     );
  //   }

  async createProviderFile(): Promise<void> {
    const providerFilePath = join(
      this.projectPath,
      "infrastructure",
      "providers.tf"
    );

    // Check if the file already exists
    if (fs.existsSync(providerFilePath)) {
      AppLogger.debug(
        `'providers.tf' already exists at ${providerFilePath}. Skipping creation.`
      );
      return; // Exit the function early
    }

    // Proceed to create the file if it doesn't exist
    AppLogger.debug(`Creating 'providers.tf' at ${providerFilePath}`);
    await this.createFile(
      "providers.tf",
      `${process.cwd()}/dist/templates/common/providers.tf.liquid`,
      "/infrastructure",
      true
    );
  }

  // async createFile(filename: string, templateFilename: string, folderName: string = '.', CreateProjectFile : boolean= false): Promise<void> {
  //     if(!CreateProjectFile){
  //     AppLogger.debug(`Creating ${filename} file`);
  //     const templateFile = fs.readFileSync(join(new URL('.', import.meta.url).pathname, templateFilename), 'utf8');
  //     const output = await this.engine.parseAndRender(templateFile, { ...this.config } );
  //     const folderPath = join(this.projectPath, folderName);
  //     if (!fs.existsSync(folderPath)) {
  //         fs.mkdirSync(folderPath, { recursive: true });
  //     }
  //     fs.writeFileSync(join(folderPath, filename), output);
  //     }else{
  //           const templateFile = fs.readFileSync(templateFilename, 'utf8');
  //           const output = await this.engine.parseAndRender(templateFile, { ...this.config } );
  //           const folderPath = join(this.projectPath, folderName);
  //           if (!fs.existsSync(folderPath)) {
  //             fs.mkdirSync(folderPath, { recursive: true });
  //         }
  //         fs.writeFileSync(join(folderPath, filename), output);
  //     }
  // }
  // async createFile(
  //   filename: string,
  //   templateFilename: string,
  //   folderName: string = ".",
  //   CreateProjectFile: boolean = false
  // ): Promise<void> {
  //   AppLogger.debug(`Creating or appending to ${filename} file`);

  //   // Read the template file
  //   const templateFile = fs.readFileSync(
  //     CreateProjectFile
  //       ? templateFilename
  //       : join(new URL(".", import.meta.url).pathname, templateFilename),
  //     "utf8"
  //   );

  //   // Render the template using Liquid.js
  //   const output = await this.engine.parseAndRender(templateFile, {
  //     ...this.config,
  //   });

  //   // Ensure the folder exists
  //   const folderPath = join(this.projectPath, folderName);
  //   if (!fs.existsSync(folderPath)) {
  //     fs.mkdirSync(folderPath, { recursive: true });
  //   }

  //   // Path to the file
  //   const filePath = join(folderPath, filename);

  //   // Append to the file if it exists, otherwise create it
  //   if (fs.existsSync(filePath)) {
  //     AppLogger.debug(`${filename} already exists. Appending content.`);
  //     fs.appendFileSync(filePath, `\n${output}`);
  //   } else {
  //     AppLogger.debug(`${filename} does not exist. Creating new file.`);
  //     fs.writeFileSync(filePath, output);
  //   }
  // }
  async createFile(
    filename: string,
    templateFilename: string,
    folderName: string = ".",
    CreateProjectFile: boolean = false,
    command: string = ""
  ): Promise<void> {
    AppLogger.debug(`Creating or appending to ${filename} file`);
    const project_config = SystemConfig.getInstance().getConfig();
    // Determine the template file path based on the command and CreateProjectFile flag
    const templateFilePath = CreateProjectFile
      ? templateFilename
      : project_config.command === "restart"
      ? join(new URL(".", import.meta.url).pathname, templateFilename)
      : templateFilename;

    // Read the template file
    const templateFile = fs.readFileSync(templateFilePath, "utf8");

    // Render the template using Liquid.js
    const output = await this.engine.parseAndRender(templateFile, {
      ...this.config,
    });

    // Ensure the folder exists
    const folderPath = join(this.projectPath, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Define the full path to the file
    const filePath = join(folderPath, filename);

    if (
      project_config.command === "new" ||
      project_config.command === "restart" ||
      project_config.command === "new_template"
    ) {
      // Logic for the "restart" command
      AppLogger.debug(`Creating ${filename} file for restart command.`);
      fs.writeFileSync(filePath, output);
    } else if (project_config.command === "new_module") {
      // Logic for the "new_module" command
      AppLogger.debug(
        `Creating or appending to ${filename} file for new_module command.`
      );
      if (fs.existsSync(filePath)) {
        AppLogger.debug(`${filename} already exists. Appending content.`);
        fs.appendFileSync(filePath, `\n${output}`);
      } else {
        AppLogger.debug(`${filename} does not exist. Creating new file.`);
        fs.writeFileSync(filePath, output);
      }
    }
  }

  async generateContent(templateFilename: string): Promise<any> {
    AppLogger.debug(`Creating content from ${templateFilename}`);
    const templateFile = fs.readFileSync(
      join(process.cwd(), templateFilename),
      "utf8"
    );
    return await this.engine.parseAndRender(templateFile, { ...this.config });
  }

  async copyFolderAndRender(
    source: string,
    destination: string
  ): Promise<void> {
    const fullPath = join(new URL(".", import.meta.url).pathname, source);
    const destFullPath = join(this.projectPath, destination);

    if (!fs.existsSync(fullPath)) {
      AppLogger.error(`Source path ${fullPath} does not exist`);
      return;
    }

    const files = fs.readdirSync(fullPath, "utf8");

    for (const file of files) {
      const srcPath = join(fullPath, file);
      const destPath = join(destFullPath, file);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        await this.copyFolderAndRender(
          join(source, file),
          join(destination, file)
        );
      } else if (file.endsWith(".liquid")) {
        const templateFile = fs.readFileSync(srcPath, "utf8");
        const output = await this.engine.parseAndRender(templateFile, {
          ...this.config,
        });

        const outputFilePath = destPath.replace(".liquid", "");
        if (!fs.existsSync(dirname(outputFilePath))) {
          fs.mkdirSync(dirname(outputFilePath), { recursive: true });
        }

        fs.writeFileSync(outputFilePath, output);
      } else {
        if (!fs.existsSync(dirname(destPath))) {
          fs.mkdirSync(dirname(destPath), { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
