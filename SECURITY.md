# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

Email the maintainers via [GitHub Security Advisories](https://github.com/guilyx/btview-vscode-plugin/security/advisories/new) or open a private security issue.

Do not disclose security issues in public GitHub issues before a fix is available.

## Scope

BTView reads and writes workspace XML files and may resolve ROS package paths. It does not execute behavior tree logic or run arbitrary code from XML content.
