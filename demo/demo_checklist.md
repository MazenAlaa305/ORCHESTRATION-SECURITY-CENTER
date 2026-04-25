# Pre-Demo Checklist — run T-30 minutes before stage

## Stack
- [ ] `docker compose down -v && docker compose up -d`
- [ ] `docker compose -f docker-compose.lab.yml up -d`
- [ ] `infra/healthcheck.sh` returns exit 0

## App
- [ ] Browser: open https://localhost — page loads, no console errors
- [ ] Login as admin · password change works
- [ ] Trigger a throwaway scan against `http://lab_webserver:3000` — completes within 90 s
- [ ] Wazuh dashboard at https://localhost:5601 reachable (login `admin / SecretPassword`)
- [ ] PDF export works on the throwaway scan

## Data reset (so the demo starts clean)
- [ ] Reset DB:
  ```bash
  docker compose exec backend python -c "from app.core.database import Base, engine; Base.metadata.drop_all(engine); Base.metadata.create_all(engine)"
  ```
- [ ] Re-seed admin (auto on first login attempt)

## Stage logistics
- [ ] HDMI / projector tested on stage laptop
- [ ] External display mirroring at 1920×1080
- [ ] Sound output tested (for backup video)
- [ ] Slide deck open + presenter notes ready
- [ ] Backup demo video (`evidence/demo_recording.mp4`) opens and plays sound
- [ ] Phone hotspot ready as Wi-Fi backup
- [ ] Charger plugged in

## Speakers
- [ ] All four speakers present and mic-checked
- [ ] Q&A answers reviewed (`FINAL_PRESENTATION.md` §Q&A)
