# AIPilot evals

These cases check that the rules change what the agent does. The document tests check only the rule text.

Run all cases from the plugin root:

```
claude plugin eval . --no-publish
```

Run one case once, without the no-plugin arm:

```
claude plugin eval . --case review-flags-names-and-comments --runs 1 --ablation none --no-publish
```

Each run is a full agent session on your account. A full run of the suite starts 30 sessions: 5 cases, 3 runs each, with and without the plugin.

## Cases

| Case | Rule under test |
|---|---|
| `review-flags-names-and-comments` | `code-reviewer` reports breaks of Code naming and Code text as P3 findings. |
| `precheck-finds-false-premise` | The arbiter's approach pre-check finds a premise that the code contradicts. |
| `review-flags-string-compared-state` | `code-reviewer` reports a string literal that the code compares in place of an existing enum. |
| `review-flags-mixed-member-order` | `code-reviewer` reports a private method between two public methods as a P3 break of Code layout. |
| `plan-lists-real-candidates` | `dev-plan-builder` lists real candidates with a source, a "Choose this if" condition, and premise statuses. It finds the existing project practice. |

All cases use only read-only tools. Each prompt holds its own fixture, so no scaffold script and no extra tool grant is needed.

## Not covered yet

No case covers `dev-builder` writing code. Such a case needs `--allow-tools Write Edit Bash`, a scaffold script, and a build tool in the run environment.

## Packaging

This folder is a development file. Leave it out of the release archive. Do not commit `evals/results/`.
