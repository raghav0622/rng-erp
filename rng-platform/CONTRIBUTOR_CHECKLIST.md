# RNG Platform – Mechanical Enforcement Checklist

- [ ] All contracts reference BaseEntity from rng-repository where applicable
- [ ] All domain contracts enumerate all possible states and transitions
- [ ] All error types are enums or string unions, never free-text
- [ ] All invariants are explicit and documented
- [ ] No runtime code, stubs, or TODOs in contract files
- [ ] All amendments and version changes are documented in contract comments
- [ ] All new terms are added to GLOSSARY.md
- [ ] All audit/event logging contracts are explicit
- [ ] No React, Firebase, or repository implementation in kernel/domain contracts
