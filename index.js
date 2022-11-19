const inquirer = require("inquirer");

const execa = require("execa");

const ora = require("ora");

const fs = require("node:fs");

const path = require("path");

const simpleGit = require("simple-git");

const chalk = require("chalk");

const git = simpleGit();

const semver = require("semver");

const process = require("node:process");

const pkgPath = path.join(process.cwd(), "./package.json");

async function publish() {
  const { publishType } = await inquirer.prompt({
    type: "list",
    name: "publishType",
    message: "please choose the publish type",
    choices: [
      { name: "beta", value: 0 },
      { name: "release", value: 1 },
    ],
  });

  const isBeta = publishType === 0;

  if (!fs.existsSync(pkgPath)) {
    console.log();
    console.log(chalk.red("package.json is not exist"));
    console.log();
  }
  const pkgVersion = require(pkgPath).version;

  const { version } = await inquirer.prompt({
    type: "input",
    name: "version",
    message: `please input a version, the last version is ${pkgVersion}`,
  });

  if (!version) {
    console.log();
    console.log(chalk.red("please input a version"));
    console.log();
    process.exit(1);
  }

  if (!semver.valid(version)) {
    console.log();
    console.log(chalk.red("the version is not valid"));
    console.log();
    process.exit(1);
  }

  const { confirmVersion } = await inquirer.prompt({
    type: "confirm",
    name: "confirmVersion",
    message: `confirm version: ${version}`,
    default: false,
  });

  if (!confirmVersion) {
    process.exit(1);
  }

  const spinner = ora("Git Pushing...").start();

  const pkg = require(pkgPath);

  pkg.version = version;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");

  await git.add(".");

  if (isBeta) {
    await git.commit(`chore(release): publish beta ${version}`);
  } else {
    await git.commit(`chore(release): publish ${version}`);
  }

  try {
    const { current: currentBranch } = await git.branchLocal();
    await git.tag(`${pkg.name}@${version}`);
    await git.push("origin", currentBranch);
  } catch (e) {
    console.log();
    console.log(e);
    console.log();
    process.exit(1);
  }

  spinner.text = "Publish Start...";

  if (isBeta) {
    await execa("yarn", ["publish", "--tag", "beta"]);
  } else {
    await execa("yarn", ["publish"]);
  }

  spinner.stop();
  console.log();
  console.log(chalk.green("Publish Successfully"));
  console.log();
}

publish();
