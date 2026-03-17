## Summary
-

## Why
-

## Testing
- [ ] Mobile unit: `cd hive-maps/apps/mobile && npm run test:ci`
- [ ] API unit: `cd hive-maps/services/api && docker compose down -v && docker compose up -d --wait db && ./gradlew test`
- [ ] API smoke: `cd hive-maps/services/api && docker compose up -d --build` then `curl http://localhost:8080/api/hello`
- [ ] End-2-End Testing (script and screen-recording)
- [ ] If any item is not applicable, explain why:

## Checklist
- [ ] I kept this PR focused.
- [ ] I added/updated tests where needed, or this change does not require tests.
- [ ] I updated docs where needed, or this change does not require docs updates.
- [ ] I reviewed the acceptance criteria related to this user story and attached screenshots to the AT issue.
- [ ] CI is green.
- [ ] I have assigned the proper related items (reviewers, assignees, issues, branches, labels, etc)
