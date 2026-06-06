---
name: Cleaner visibility for managers + Telegram direct contact
description: Admin controls per-cleaner visibility via profiles.visible_to_managers. Managers see only visible cleaners with calendar + telegram link (profiles.telegram_username -> t.me/...).
type: feature
---
- `profiles.visible_to_managers boolean default true` — global flag, toggled by admin in AdminUserList (Switch).
- `profiles.telegram_username text` — cleaner edits in EditProfileDialog. Stored without leading `@`.
- ManagerCleanersCard lists profiles where role in (cleaner, demo_cleaner) AND status=approved AND is_active AND visible_to_managers=true. Click row → dialog with OrdersCalendar (userRole='cleaner', cleanerId=that cleaner) and "Написать в Telegram" button linking to t.me/{username}.
- Telegram button uses brand color #229ED9.
