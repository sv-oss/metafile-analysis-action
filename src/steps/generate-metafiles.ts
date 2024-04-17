import { execSync } from 'child_process';

export type GenerateMetafilesRequest = {
  command: string;
};

export function execute({ command }: GenerateMetafilesRequest) {
  execSync(`${command} > /dev/null`);
}
