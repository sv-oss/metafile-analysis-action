import { execSync } from 'child_process';

export async function execute(targetBranch: string) {
  execSync('git fetch --all --depth=1 > /dev/null');
  execSync(`git checkout -f ${targetBranch} > /dev/null`);
}
