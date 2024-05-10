magikube
=================

CLI tool to bring up infrastructure and basic project


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/magikube.svg)](https://npmjs.org/package/magikube)
[![Downloads/week](https://img.shields.io/npm/dw/magikube.svg)](https://npmjs.org/package/magikube)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g magikube
$ magikube COMMAND
running command...
$ magikube (--version)
magikube/0.0.0 darwin-arm64 node-v21.7.3
$ magikube --help [COMMAND]
USAGE
  $ magikube COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`magikube hello PERSON`](#magikube-hello-person)
* [`magikube hello world`](#magikube-hello-world)
* [`magikube help [COMMAND]`](#magikube-help-command)
* [`magikube plugins`](#magikube-plugins)
* [`magikube plugins add PLUGIN`](#magikube-plugins-add-plugin)
* [`magikube plugins:inspect PLUGIN...`](#magikube-pluginsinspect-plugin)
* [`magikube plugins install PLUGIN`](#magikube-plugins-install-plugin)
* [`magikube plugins link PATH`](#magikube-plugins-link-path)
* [`magikube plugins remove [PLUGIN]`](#magikube-plugins-remove-plugin)
* [`magikube plugins reset`](#magikube-plugins-reset)
* [`magikube plugins uninstall [PLUGIN]`](#magikube-plugins-uninstall-plugin)
* [`magikube plugins unlink [PLUGIN]`](#magikube-plugins-unlink-plugin)
* [`magikube plugins update`](#magikube-plugins-update)

## `magikube hello PERSON`

Say hello

```
USAGE
  $ magikube hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ magikube hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/infrastructure/infrastructure/blob/v0.0.0/src/commands/hello/index.ts)_

## `magikube hello world`

Say hello world

```
USAGE
  $ magikube hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ magikube hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/infrastructure/infrastructure/blob/v0.0.0/src/commands/hello/world.ts)_

## `magikube help [COMMAND]`

Display help for magikube.

```
USAGE
  $ magikube help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for magikube.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.21/src/commands/help.ts)_

## `magikube plugins`

List installed plugins.

```
USAGE
  $ magikube plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ magikube plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/index.ts)_

## `magikube plugins add PLUGIN`

Installs a plugin into magikube.

```
USAGE
  $ magikube plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into magikube.

  Uses bundled npm executable to install plugins into /Users/neelshah/.local/share/magikube

  Installation of a user-installed plugin will override a core plugin.

  Use the MAGIKUBE_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MAGIKUBE_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ magikube plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ magikube plugins add myplugin

  Install a plugin from a github url.

    $ magikube plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ magikube plugins add someuser/someplugin
```

## `magikube plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ magikube plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ magikube plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/inspect.ts)_

## `magikube plugins install PLUGIN`

Installs a plugin into magikube.

```
USAGE
  $ magikube plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into magikube.

  Uses bundled npm executable to install plugins into /Users/neelshah/.local/share/magikube

  Installation of a user-installed plugin will override a core plugin.

  Use the MAGIKUBE_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MAGIKUBE_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ magikube plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ magikube plugins install myplugin

  Install a plugin from a github url.

    $ magikube plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ magikube plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/install.ts)_

## `magikube plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ magikube plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ magikube plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/link.ts)_

## `magikube plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ magikube plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ magikube plugins unlink
  $ magikube plugins remove

EXAMPLES
  $ magikube plugins remove myplugin
```

## `magikube plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ magikube plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/reset.ts)_

## `magikube plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ magikube plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ magikube plugins unlink
  $ magikube plugins remove

EXAMPLES
  $ magikube plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/uninstall.ts)_

## `magikube plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ magikube plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ magikube plugins unlink
  $ magikube plugins remove

EXAMPLES
  $ magikube plugins unlink myplugin
```

## `magikube plugins update`

Update installed plugins.

```
USAGE
  $ magikube plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.19/src/commands/plugins/update.ts)_
<!-- commandsstop -->
