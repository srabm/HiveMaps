## Summary
-

## Why
-

## Testing
- [ ] Mobile unit: `cd hive-maps/apps/mobile && npm run test:ci`
- [ ] API unit: `cd hive-maps/services/api && ./gradlew test`
- [ ] API smoke: `cd hive-maps/services/api && docker compose up -d --build` then `curl http://localhost:8080/api/hello`
- [ ] If any item is not applicable, explain why:

## Checklist
- [ ] I kept this PR focused.
- [ ] I added/updated tests where needed, or this change does not require tests.
- [ ] I updated docs where needed, or this change does not require docs updates.
- [ ] CI is green.
- [ ] I have assigned the proper related items (reviewers, assignees, issues, branches, labels, etc)
