magikube
=================

⚡️ Run production grade applications in minutes ⚡️


[![Version](https://img.shields.io/npm/v/magikube.svg)](https://npmjs.org/package/magikube)


<!-- toc -->
- [magikube](#magikube)
- [Get Ready](#get-ready)
- [Quick Install](#quick-install)
- [What you will need to start](#what-you-will-need-to-start)
- [Commands](#commands)
  - [`magikube destroy NAME`](#magikube-destroy-name)
  - [`magikube new NAME`](#magikube-new-name)
<!-- tocstop -->
# Get Ready
<!-- getready -->
1. Node.js version 18.0 or above
2. homebrew from https://brew.sh
3. Python 3.12
   ```bash
   brew install python@3.12
   ```
4. tfenv
   ```bash 
   brew install tfenv
   ```
5. Terraform 1.8.2
   ```bash 
   tfenv install 1.8.2
   ```
6. Ansible
   ```bash
   brew install ansible@10
   ```
You are all set for magikube now.
<!-- getreadystop -->
<!-- quickinstall -->
# Quick Install
With npm:
```bash
npm i -g magikube
```
<!-- quickinstallstop -->

<!-- needs -->
# What you will need to start
Magikube will need a few things to be able to setup environment for you.

1. If you have already configured AWS credentials then you will need profile name and skip to step 3
2. AWS Access Key / Secret
3. Github personal access token for user that has admin rights
4. Github Organisation name
<!-- needsstop -->

# Commands
<!-- commands -->
- [magikube](#magikube)
- [Get Ready](#get-ready)
- [Quick Install](#quick-install)
- [What you will need to start](#what-you-will-need-to-start)
- [Commands](#commands)
  - [`magikube destroy NAME`](#magikube-destroy-name)
  - [`magikube new NAME`](#magikube-new-name)

## `magikube destroy NAME`

Destroy infrastructure as code project

```
USAGE
  $ magikube destroy NAME [-d]

ARGUMENTS
  NAME  Infrastructure project name to be destroyed

FLAGS
  -d, --dryrun  Dry run the destroy operation

DESCRIPTION
  Destroy infrastructure as code project

EXAMPLES
  $ magikube destroy sample 
  Destroying infrastructure as code project named 'sample' in the current directory
```

## `magikube new NAME`

Create a new infrastructure as code project

```
USAGE
  $ magikube new NAME [-d]

ARGUMENTS
  NAME  Infrastructure project name to be created

FLAGS
  -d, --dryrun  Dry run the create operation

DESCRIPTION
  Create a new infrastructure as code project

EXAMPLES
  $ magikube new sample 
  Creating a new infrastructure as code project named 'sample' in the current directory
```
<!-- commandsstop -->
