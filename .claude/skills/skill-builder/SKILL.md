---
name: Skill Builder
description: Create new Claude Code skills from a given topic. Use when the user wants to create a custom skill, generate a SKILL.md file, or build automation for Claude.
allowed-tools: Read, Write, Bash, Glob
---

# Skill Builder

## Overview

This skill helps create new Claude Code skills. When a user provides a topic or use case, generate a complete, well-structured SKILL.md file following the official Claude Code skill format.

## Skill File Structure

Every skill must be saved in this format:
```
.claude/skills/{skill-name}/SKILL.md
```

## Required SKILL.md Format

```yaml
---
name: {Skill Name}                    # Required: Human-readable name (max 64 chars)
description: {What it does and when to use it}  # Required: max 200 chars
allowed-tools: {Tool1, Tool2, ...}    # Optional: Tools to auto-allow
---

# {Skill Name}

## Overview
{Brief description of what this skill does}

## Instructions
{Detailed instructions for Claude on how to use this skill}

## Key Features / Sections
{Relevant content based on the topic}
```

## Creation Guidelines

1. **Name**: Short, descriptive, title-case (e.g., "Code Reviewer", "API Designer")

2. **Description**: Must include:
   - What the skill does
   - When to use it (trigger phrases)
   - Keep under 200 characters

3. **Allowed Tools**: Common combinations:
   - Read-only: `Read, Grep, Glob`
   - Full access: `Read, Write, Edit, Bash, Glob, Grep`
   - Web-enabled: `Read, Write, WebFetch, WebSearch`

4. **Body Content**: Should include:
   - Clear overview
   - Step-by-step instructions
   - Reference data (if applicable)
   - Examples (if helpful)

## Example: Creating a "Python Best Practices" Skill

When user says: "Python 베스트 프랙티스 스킬 만들어줘"

Generate:

```yaml
---
name: Python Best Practices
description: Apply Python coding standards and best practices. Use when writing Python code, reviewing Python files, or refactoring Python projects.
allowed-tools: Read, Grep, Glob, Edit
---

# Python Best Practices

## Overview
Ensures Python code follows PEP 8, type hints, and modern Python idioms.

## Code Standards

### Naming Conventions
- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### Type Hints
Always use type hints for function signatures:
```python
def process_data(items: list[str], count: int = 10) -> dict[str, int]:
    ...
```

### Imports
Order: stdlib -> third-party -> local
Use absolute imports over relative

## Instructions
1. Read the Python files using Read tool
2. Check for PEP 8 violations
3. Suggest type hint additions
4. Recommend modern Python features (3.10+)
```

## Workflow

When creating a skill:

1. **Understand the Topic**: Ask clarifying questions if needed
2. **Design the Structure**: Plan sections based on the topic
3. **Generate SKILL.md**: Create complete file with proper format
4. **Save the File**: Write to `.claude/skills/{skill-name}/SKILL.md`
5. **Confirm**: Tell user the skill is ready to use

## Output Location

Always save skills to:
```
/home/user/algomlab/.claude/skills/{kebab-case-name}/SKILL.md
```

## Quick Templates by Category

### Development Skills
- Code review, testing, documentation, refactoring

### Domain Knowledge Skills
- Brand guidelines, API specs, architecture patterns

### Automation Skills
- Deployment, monitoring, data processing

### Learning Skills
- Tutorials, explanations, practice exercises
