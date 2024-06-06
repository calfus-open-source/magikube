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
  - [`magikube help`](#magikube-help)
  - [`magikube new PROJECT_NAME`](#magikube-new-project_name)
<!-- tocstop -->
# Get Ready
<!-- getready -->
1. Install homebrew from https://brew.sh
2. Lets install tfenv now
   ```bash 
   brew install tfenv
   ```
3. Install 1.8.2 version of Terraform
   ```bash 
   tfenv install 1.8.2
   ```
You are all set for magikube now.
<!-- getreadystop -->
<!-- quickinstall -->
# Quick Install
With npm:
```bash
npm i magikube
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
## `magikube help`

When you need to find what magikube can do for you and how.

```
USAGE
  $ magikube help
```

## `magikube new PROJECT_NAME`

This is the auto-mode where we have pre-selected a lot of options for you which will get you production ready in few minutes 🚀🚀. You answer a few prompts and magikube does the rest.

```
USAGE
  $ magikube new PROJECT_NAME

ARGUMENTS
  PROJECT_NAME

DESCRIPTION
  Create a new cluster in auto mode. PROJECT_NAME will be the folder in which files will be created before execution.

EXAMPLES
  $ magikube new my_awesome_project
  
```
<!-- commandsstop -->
