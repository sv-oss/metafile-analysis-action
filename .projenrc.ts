import { javascript, github } from 'projen';
import { GitHubActionTypeScriptProject, RunsUsing } from 'projen-github-action-typescript';

const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: 'main',
  devDeps: [
    'projen-github-action-typescript',
    'esbuild',
    '@types/bytes',
  ],
  deps: [
    'bytes',
    'glob',
  ],
  name: 'metafile-analysis-action',
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  minNodeVersion: '20.12.1',
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['deps-upgrade'],
    },
  },
  projenCredentials: github.GithubCredentials.fromApp({
    appIdSecret: 'CICD_APP_ID',
    privateKeySecret: 'CICD_APP_PRIVKEY',
  }),
  autoApproveOptions: {
    label: 'deps-upgrade',
    allowedUsernames: [
      'sv-oss-continuous-delivery[bot]',
    ],
  },
  dependabot: false,
  mutableBuild: false,
  minMajorVersion: 1,
  license: 'MIT',
  copyrightOwner: 'Service Victoria',
  actionMetadata: {
    author: 'Service Victoria Platform Engineering',
    name: 'ESBuild Metafile Analysis',
    description: 'Generates a PR comment based on the metafile data analysis completed',
    runs: {
      using: RunsUsing.NODE_20,
      main: 'dist/index.js',
    },
    inputs: {
      'github-token': {
        description: 'The Github token to use',
        required: true,
        default: '${{ github.token }}',
      },
      'generate-metafiles-command': {
        description: 'The command to execute within the repo to generate the metafiles in the directory',
        required: true,
        default: 'npm run synth',
      },
      'metafile-directory': {
        description: 'The directory in the file-system where to source all metafiles',
        required: true,
      },
      'metafile-glob': {
        description: 'A glob to filter out and include only specific metafiles',
        required: false,
        default: '**/*.json',
      },
      'comment-header': {
        description: 'Any details to put in the header of the comment before rendering the table of files',
      },
      'comment-footer': {
        description: 'Any details to put at the end of the comment after rendering the table of files',
      },
      'comment-threshold-critical': {
        description: 'The file size (including unit) to start marking files as a critical status',
        default: '5mb',
      },
      'comment-threshold-high': {
        description: 'The file size (including unit) to start marking files as a high status',
        default: '1mb',
      },
      'comment-threshold-medium': {
        description: 'The file size (including unit) to start marking files as a medium status',
        default: '500kb',
      },
      'comment-threshold-low': {
        description: 'The file size (including unit) to start marking files as a low status',
        default: '300kb',
      },
      'comment-large-node-modules-threshold': {
        description: 'The threshold to start adding the specific node_modules in the list of large node_modules',
        default: '25kb',
      },
      'comment-min-threshold': {
        description: 'The minimum severity to render in the comment. By default, all files will be rendered. Accepted values are CRITICAL/HIGH/MEDIUM/LOW/INFO',
        default: 'LOW',
      },
      'check-mark-failure': {
        description: 'Whether to add a check to the Pull Request as a failure when any file meets the threshold limit',
        default: 'true',
      },
      'check-mark-file-count': {
        description: 'The number of files that need to reach the threshold to mark the Pull Request as a failure',
        default: '1',
      },
      'check-mark-min-threshold': {
        description: 'The threshold for considering a file as a failure for whether or not to add a check',
        default: 'HIGH',
      },
      'display-summary': {
        description: 'Whether to render the summary of files',
        default: 'true',
      },
      'display-key-issues': {
        description: 'Whether to render the key issues that were found',
        default: 'true',
      },
      'display-deltas': {
        description: 'Whether to render the file deltas that were detected',
        default: 'true',
      },
    },
  },
});


project.packageTask.reset('esbuild ./src/index.ts --bundle --outdir=dist --platform=node --target=node20 --packages=bundle');

// Build the project after upgrading so that the compiled JS ends up being committed
project.tasks.tryFind('post-upgrade')?.spawn(project.buildTask);

project.release?.addJobs({
  'floating-tags': {
    permissions: {
      contents: github.workflows.JobPermission.WRITE,
    },
    runsOn: ['ubuntu-latest'],
    needs: ['release_github'],
    steps: [
      { uses: 'actions/checkout@v4' },
      { uses: 'giantswarm/floating-tags-action@v1' },
    ],
  },
});


project.synth();
