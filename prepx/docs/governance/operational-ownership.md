# PrepX operational ownership register

Status: **Approval required before Production**  
Last updated: 2026-10-13

This register assigns authority for operating PrepX. Enter a real person in every required row before Production. A person may hold more than one role, but every role must also have a backup who can act during the examination/result period.

Do not store private phone numbers, passwords, recovery codes, API keys, or personal addresses in this repository. Put sensitive contact details in the UGSM private contact roster and record only its controlled location below.

Private contact roster location: ______________________________

## Required owners

| Responsibility | Primary owner | Backup owner | Authority and access that must be confirmed | Accepted/date |
| --- | --- | --- | --- | --- |
| Production and release approval | ____________________ | ____________________ | Final go/no-go, maintenance approval and stakeholder communication | ____________________ |
| Technical/on-call response | ____________________ | ____________________ | Application diagnosis, logs, incident coordination and verification | ____________________ |
| Vercel project | ____________________ | ____________________ | Deploy, environment configuration, logs and rollback | ____________________ |
| Supabase project and backups | ____________________ | ____________________ | Database/Auth administration, migrations, backup and restore | ____________________ |
| Domain and DNS | ____________________ | ____________________ | Registrar/DNS access, domain changes and certificate escalation | ____________________ |
| Data protection and privacy | ____________________ | ____________________ | Retention, correction/deletion decisions and privacy incident decisions | ____________________ |
| Examination content | ____________________ | ____________________ | Examination details, result notice, subject list and public wording | ____________________ |
| Publication administration | ____________________ | ____________________ | Publish, unpublish and emergency search-disable authority | ____________________ |
| QA and accessibility | ____________________ | ____________________ | Browser, mobile, multilingual, accessibility and print approval | ____________________ |
| Performance and monitoring | ____________________ | ____________________ | Load-test approval, alert review and capacity response | ____________________ |

## Examination-period coverage

| Decision | Approved value |
| --- | --- |
| Support window and timezone | ______________________________ |
| Primary administrator contact channel | Private roster reference: ______________________________ |
| Escalation channel | Private roster reference: ______________________________ |
| Maximum acknowledgement time for a critical incident | ______________________________ |
| Person authorized to unpublish results immediately | ______________________________ |
| Person authorized to approve restoration of public access | ______________________________ |

## Required access verification

- [ ] Vercel primary and backup can inspect logs, deploy and roll back.
- [ ] Supabase primary and backup can inspect Auth/database logs and execute the approved restore procedure.
- [ ] DNS primary and backup can access the registrar/DNS provider.
- [ ] Publication administrators have individual Supabase Auth accounts and approved `admin_profiles` rows.
- [ ] Departed or unauthorized users have been removed from Auth, `admin_profiles`, Vercel, Supabase and DNS access.
- [ ] Private contact roster is accessible to the release owner and on-call personnel.
- [ ] Every owner has read the deployment guide, incident procedure and privacy/content policy.

## Approval

| Approval | Name | Signature/record reference | Date/time |
| --- | --- | --- | --- |
| Register prepared by | ____________________ | ____________________ | ____________________ |
| UGSM release owner approval | ____________________ | ____________________ | ____________________ |
| Technical owner acknowledgement | ____________________ | ____________________ | ____________________ |

This document is complete only when every required role has a named primary and backup, access has been verified, and the UGSM release owner has approved it.
