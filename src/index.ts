#!/usr/bin/env node
//todo : add three level : small advanced and intermediate
import * as inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";
import * as shell from "shelljs";
import * as template from "./utils/template";
import chalk from "chalk";
import * as yargs from "yargs";

//checks for templates installed in templates folder where index.ts is located
const CHOICES = fs.readdirSync(path.join(__dirname, "templates"));
const QUESTIONS: inquirer.Questions = [
  {
    name: "template",
    type: "list",
    message: "Template:",
    choices: CHOICES,
    when: () => !yargs.argv["template"],
  },
  {
    name: "size",
    type: "list",
    message: "Project size:",
    when: () => !yargs.argv["size"],
    choices: (answers) => {
      return fs
        .readdirSync(path.join(__dirname, `templates`, answers.template))
        .filter((fn) => fn !== ".git" && fn !== "LICENSE");
    },
  },
  {
    name: "name",
    type: "input",
    message: "Project name:",
    when: () => !yargs.argv["name"],
    validate: (input: string) => {
      if (/^([A-Za-z\-\_\d])+$/.test(input)) return true;
      else
        return "Project name may only include letters, numbers, underscores and hashes.";
    },
  },
  {
    name: "CSS",
    type: "list",
    message: "CSS",
    choices: ["Tailwind (POSTCSS)", "Sass", "none"],
    when: () => !yargs.argv["CSS"],
  },
];

const CURR_DIR = process.cwd();

inquirer.prompt(QUESTIONS).then((answers: any) => {
  answers = Object.assign({}, answers, yargs.argv);
  const projectChoice = answers["template"];
  const projectName = answers["name"];
  const styling = answers["CSS"];
  console.log(answers);
  const size = answers["size"];
  const templatePath = path.join(__dirname, "templates", projectChoice, size);
  //change just to be just the current directory
  const tartgetPath = path.join(CURR_DIR, projectName);

  const templateConfig = getTemplateConfig(templatePath);
  const options: template.CliOptions = {
    projectName,
    templateName: projectChoice,
    templatePath,
    tartgetPath,
    config: templateConfig,
  };

  if (!createProject(tartgetPath)) {
    return;
  }

  createDirectoryContents(templatePath, projectName, templateConfig);

  if (!postProcess(options, styling)) {
    return;
  }

  showMessage(options);
});

function showMessage(options: template.CliOptions) {
  console.log("");
  console.log(chalk.green("Done."));
  console.log(chalk.green(`Go into the project: cd ${options.projectName}`));

  const message = options.config.postMessage;

  if (message) {
    console.log("");
    console.log(chalk.yellow(message));
    console.log("");
  }
}

function getTemplateConfig(templatePath: string): template.TemplateConfig {
  const configPath = path.join(templatePath, ".template.json");

  if (!fs.existsSync(configPath)) return {};

  const templateConfigContent = fs.readFileSync(configPath);

  if (templateConfigContent) {
    return JSON.parse(templateConfigContent.toString());
  }

  return {};
}

function createProject(projectPath: string) {
  if (fs.existsSync(projectPath)) {
    console.log(
      chalk.red(`Folder ${projectPath} exists. Delete or use another name.`)
    );
    return false;
  }

  fs.mkdirSync(projectPath);
  return true;
}

function postProcess(options: template.CliOptions, styling = "") {
  if (isNode(options)) {
    return postProcessNode(options, styling);
  }
  return true;
}

function isNode(options: template.CliOptions) {
  return fs.existsSync(path.join(options.templatePath, "package.json"));
}

function postProcessNode(options: template.CliOptions, css = "") {
  shell.cd(options.tartgetPath);
  let cmd = "";

  if (shell.which("npm")) {
    cmd = "npm install";
  }

  if (cmd) {
    if (css === "Tailwind (POSTCSS)") {
      cmd = `${cmd} && ${cmd} -D tailwindcss postcss autoprefixer && npx tailwindcss init`;
    }
    if (css === "Sass") {
      cmd = `${cmd} sass`;
    }
    const result = shell.exec(cmd);
    if (result.code !== 0) {
      return false;
    }
  } else {
    console.log(chalk.red("No yarn or npm found. Cannot run installation."));
  }
  return true;
}

const SKIP_FILES = ["node_modules", ".template.json"];

function createDirectoryContents(
  templatePath: string,
  projectName: string,
  config: template.TemplateConfig
) {
  const filesToCreate = fs.readdirSync(templatePath);
  filesToCreate.forEach((file) => {
    const origFilePath = path.join(templatePath, file);
    // get stats about the current file
    const stats = fs.statSync(origFilePath);
    if (SKIP_FILES.indexOf(file) > -1) return;

    if (stats.isFile()) {
      let contents = fs.readFileSync(origFilePath, "utf8");
      contents = template.render(contents, {projectName});

      const writePath = path.join(CURR_DIR, projectName, file);
      fs.writeFileSync(writePath, contents, "utf8");
    } else if (stats.isDirectory()) {
      fs.mkdirSync(path.join(CURR_DIR, projectName, file));

      // recursive call
      createDirectoryContents(
        path.join(templatePath, file),
        path.join(projectName, file),
        config
      );
    }
  });
}
