import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const lambdaRoot = join(projectRoot, 'lambda');
const lambdaBuildDir = join(lambdaRoot, 'build');
const distDir = join(projectRoot, 'dist');

function assertDistExists() {
  if (!existsSync(distDir)) {
    throw new Error('dist directory not found. Run "npm run build" first.');
  }
}

function runBuild() {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
}

function resetBuildDir() {
  rmSync(lambdaBuildDir, { recursive: true, force: true });
  mkdirSync(lambdaBuildDir, { recursive: true });
}

function copyLambdaFiles() {
  cpSync(join(lambdaRoot, 'handler.mjs'), join(lambdaBuildDir, 'handler.mjs'));
  const lambdaPackageJson = join(lambdaRoot, 'package.json');
  if (existsSync(lambdaPackageJson)) {
    cpSync(lambdaPackageJson, join(lambdaBuildDir, 'package.json'));
  }
  cpSync(distDir, join(lambdaBuildDir, 'dist'), { recursive: true });
}

function main() {
  runBuild();
  assertDistExists();
  resetBuildDir();
  copyLambdaFiles();
  console.log('Lambda bundle prepared in lambda/build');
  console.log('Zip contents before uploading:');
  console.log('  cd lambda/build && zip -r ../curve-fitter-ui-lambda.zip .');
}

main();
