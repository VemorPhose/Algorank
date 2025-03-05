# Contributing Problems to AlgoRank

## Problem Structure
```
problem-id/            # Unique 4-6 character code
├── description.md     # Problem description in Markdown
├── metadata.json      # Problem metadata
└── testcases/
    ├── inputs/        # Input test cases
    └── outputs/       # Expected outputs
```

## Guidelines
1. Use descriptive problem names
2. Include comprehensive test cases
3. Follow the metadata schema
4. Test locally before submitting

## Metadata Schema
```json
{
  "id": "2SUM",
  "title": "Sum of Two Numbers",
  "difficulty": "Easy",
  "tags": ["arrays", "hash-table"],
  "timeLimit": 1000,
  "memoryLimit": 256000
}
```