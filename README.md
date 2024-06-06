magikube
=================

⚡️ Run production grade applications in minutes ⚡️


[![Version](https://img.shields.io/npm/v/magikube.svg)](https://npmjs.org/package/magikube)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
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

1. AWS Access Key
2. Github personal access token for user that has admin rights
3. Github Organisation name
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

This is the auto-mode where we have pre-selected lot of options. You answer a few prompts and magikube does the rest.

```
USAGE
  $ magikube new PROJECT_NAME

ARGUMENTS
  PROJECT_NAME

DESCRIPTION
  Create a new cluster in auto mode. PROJECT_NAME will be the folder in which file

EXAMPLES
  $ magikube new my_awesome_project
  
```

_See code: [src/commands/hello/index.ts](https://github.com/calfus-open-source/magikube/blob/v0.0.0/src/commands/hello/index.ts)_
<!-- commandsstop -->
