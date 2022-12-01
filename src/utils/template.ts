import * as ejs from "ejs";

export interface TemplateData {
  projectName: string;
}

export function render(content: string, data: TemplateData) {
  return ejs.render(content, data);
}
export interface TemplateConfig {
  files?: string[];
  postMessage?: string;
}

export interface CliOptions {
  projectName: string;
  templateName: string;
  templatePath: string;
  tartgetPath: string;
  config: TemplateConfig;
}
