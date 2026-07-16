# Runtime Integrity Direct Repair

Branch: `repair/runtime-integrity-direct`
Base: `7cf77ebb09f080707db3f82128474d19ad15481c`

This branch keeps the OCV enforcement path and changes only the boundaries proven to be unsafe during the July 2026 manual tests:

- candidate-quality findings are not vocational incompatibility;
- Vigia and the promotion gate reserve vocational hard failure for forbidden or incompatible operations;
- preview authentication remains on the exact preview host;
- preview pages display the deployed commit fingerprint.

Production is not changed by this branch.
