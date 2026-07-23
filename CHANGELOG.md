# Changelog

All notable public changes to ChantLive are generated from `shared/changelog.json`.

Use GitHub Issues and pull requests for implementation details, then add approved user-facing changes to the structured changelog data before a release.

## 1.1.61 - 23 July 2026

Clearer organiser delivery controls and simpler QR-free participant sharing.

### Improved

- QR-free organiser quick start: The organiser dashboard now prioritises sharing the plain participant link and event code, with QR presented as an optional extra. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- Announcement recipient preview: Organisers now see a live delivery preview naming the audience that will receive an announcement before it is sent. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- One-tap announcement draft clearing: A dedicated Clear draft control lets organisers safely discard stale announcement text without editing it away manually.
- Explicit participant link copying: Participants can now copy the current event link directly, independently of the device's native share menu.
- Localized access reassurance: The participant access panel now explains in five languages that no account or QR scanner is needed.

## 1.1.60 - 22 July 2026

Clearer QR-free joining and safer multilingual live-event communication.

### Improved

- QR-free joining made explicit: The landing page now presents plain links and event codes alongside optional QR access, including a clear no-camera-required message.
- Safer announcement language switching: Changing the message language now translates the selected announcement starter instead of leaving an old-language draft behind. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- Right-to-left announcement editing: Arabic and Persian announcement drafts now use right-to-left editing with a language-matched example.
- Localized live-event numbers: Chant position, viewer, points, poll, and question numbers now follow the participant's selected language.
- Translated help-panel navigation: Screen readers now announce the participant help and safety panel in the selected language.

## 1.1.59 - 21 July 2026

Faster multilingual organiser messages and clearer localized live-event timing for participants.

### Improved

- Multilingual announcement starters: Organisers can draft route-change, pause, and accessibility updates in English, Spanish, French, Arabic, or Persian before reviewing and sending. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- Localized chant position: The visible chant and cycle position now follows the participant's selected language.
- Localized event times: Participant event dates and times now use the selected language's familiar date format.
- Translated progress announcements: Screen readers now describe leader and group chant progress in the participant's selected language.
- Right-to-left live timing: Arabic and Persian chant progress bars now advance in the expected right-to-left reading direction.

## 1.1.58 - 20 July 2026

Faster organiser announcements and clearer multilingual participant confirmations during live events.

### Improved

- Quick announcement starters: Organisers can draft route-change, pause, and accessibility updates with one tap, then review the audience and wording before sending. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- Multilingual announcement context: Announcement audience labels and the dismiss action now follow each participant's selected language.
- Multilingual support-action guidance: Organizer-provided action labels and new-tab guidance now appear in English, Spanish, French, Arabic, or Persian.
- Multilingual poll confirmations: Vote counts and vote success or failure messages now follow the participant's language.
- Multilingual participant action outcomes: Help, question, safety, and check-in confirmations and recovery messages now follow the participant's language.

## 1.1.57 - 19 July 2026

Weekly blog guidance for helping more people join peaceful events without overwhelm.

### Documentation

- Low-friction participation guide: A new weekly blog post helps organizers reduce the first step, offer small roles, support late arrivals, and use ChantLive for predictable live participation.

## 1.1.56 - 19 July 2026

Faster arrival preparation and multilingual live guidance for every participant.

### Improved

- Logistics character guidance: Meeting-point and arrival fields now show clear limits and live counts so organisers can prepare complete instructions without submission surprises. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- Arrival guidance starters: Organisers can add useful early-arrival, step-free-access, and route-change guidance with one tap while creating an event. [GitHub issue #15](https://github.com/barsham/ChantLive/issues/15)
- Multilingual live phase guidance: Leader and crowd turn-taking cues now follow the participant's selected English, Spanish, French, Arabic, or Persian language.
- Multilingual keep-screen-on control: The keep-screen-on action, active state, explanation, and device failure message now follow the participant's language.
- Multilingual accessibility announcements: Screen-reader chant progress and display-mode descriptions now use the participant's selected language during live events.

## 1.1.55 - 18 July 2026

Complete arrival details at creation and clearer multilingual participant guidance before and after events.

### Improved

- Meeting point during event creation: Organisers can add an exact assembly point while creating an event so participant pages and event materials are useful immediately.
- Arrival guidance during event creation: Organisers can add timing, entrance, preparation, or accessibility guidance before creating an event instead of returning to the editor later.
- Multilingual participant waiting screen: Waiting status, connection guidance, retry controls, and practical pre-event tips now follow the participant's selected language.
- Multilingual event detail labels: Date, venue, meeting-point, arrival, and event-detail labels now appear in English, Spanish, French, Arabic, or Persian across participant states.
- Multilingual ended-event experience: Ended-event guidance, support actions, feedback prompts, confirmation messages, and right-to-left layout now follow the participant's language.

## 1.1.54 - 17 July 2026

Faster event setup and multilingual participant recovery, sharing, and calendar tools.

### Added

- Practical event setup presets: Organisers can start a march, vigil, prayer circle, or community gathering with a suggested title and duration, then adjust any detail before creating the event.

### Improved

- Multilingual participant recovery: Connecting, offline, invalid-link, retry, and alternate-code guidance now follows the participant's selected language, with language choice available before an event connects.
- Multilingual event access actions: Participant event-code, copy, share, and confirmation text now appears in English, Spanish, French, Arabic, or Persian.
- Multilingual calendar choices: Google Calendar, Outlook Calendar, calendar-file download, and calendar result messages now follow the participant's selected language.
- Faster organiser registration: Registration fields now provide browser and password-manager hints for names, email addresses, and new passwords, reducing mobile typing and input mistakes.

## 1.1.53 - 16 July 2026

Clearer organiser scheduling, protected logistics edits, and calendar choices that work across participant devices.

### Improved

- Event duration during creation: Organisers can set a 15-to-300-minute event duration while creating a demonstration so calendar invitations reserve the right amount of time immediately.
- Local schedule and timezone preview: The creation flow now shows the full local date, time, timezone, and calendar duration before an organiser creates the event.

### Fixed

- Unsaved logistics protection: The event editor now identifies unsaved date, venue, meeting-point, and arrival-note changes, disables redundant saves, and warns before a browser exit could lose edits.

### Added

- Participant calendar choices: Scheduled participant screens now offer Google Calendar, Outlook Calendar, and downloadable calendar-file options from one mobile-friendly menu.
- Command-center calendar card: Organisers can confirm the saved schedule, duration, venue, and timezone from the command center, then open Google or Outlook Calendar or download an offline invite.

## 1.1.52 - 15 July 2026

Calendar-ready event planning and faster participant recovery from broken or unreachable links.

### Fixed

- Participant connection recovery: Invalid event codes now reach the recovery screen as soon as the public lookup returns not found, while stalled connections time out with clear retry and code-entry actions.

### Added

- Participant calendar invites: Scheduled waiting, live, and ended event screens now let participants download a calendar file containing the event time, duration, location, participant link, and join code.
- Share Kit calendar workflow: Organisers can download an event calendar invite and copy a ready-made save-the-date message that directs participants to the calendar action.

### Improved

- Handout calendar action: Participant handouts now offer a calendar download alongside QR, link, and short-code joining fallbacks when the organiser has scheduled the event.
- Faster scheduled event setup: The creation dialog now accepts an optional date, time, and venue, and local organiser times are converted accurately before saving across creation and event editing.

## 1.1.51 - 14 July 2026

Faster participant joining and sharing, screen-awake reliability, and event-day access controls for organisers.

### Improved

- Participant-first hero shortcut: A prominent Join an event action now takes mobile visitors directly to the participant code field, keeping the join path ahead of organiser-only navigation.
- Participant event code strip: Waiting, live, and ended participant screens now show the short event code with a copy action so people can confirm or relay access when QR scanning fails.
- Command center participant access: Organisers now have the short code, participant link, copy actions, and participant-page shortcut together beside live event controls.

### Added

- Participant event sharing: Participants can share the current event from the chant page using the device share sheet, with a copyable invitation fallback on browsers without native sharing.
- Keep screen on control: Supported devices can keep the participant screen awake during a live chant, with clear active state and automatic release when the event ends.

## 1.1.50 - 13 July 2026

Mobile-first navigation, clearer organizer registration, and resilient short-code sharing for live events.

### Improved

- Compact mobile navigation: The landing page now uses a keyboard-accessible mobile menu so joining guidance and account actions stay easy to reach without a crowded two-row header.
- Registration password visibility: Organizers can show or hide both password fields while creating an account, reducing typing errors on mobile devices.
- Registration trust guidance: Live password-match feedback and clear email and participant-privacy notes make organizer account creation easier to understand and correct.
- Handout short-code fallback: Printable participant handouts now feature the short event code and plain instructions for joining from the ChantLive home page when QR scanning fails.
- Share kit participant access: Organizers can copy the participant code or link from one quick panel, while participant-facing message templates include the short-code fallback.

## 1.1.49 - 12 July 2026

Participant join-code onboarding and faster organizer sharing fallbacks for real event conditions.

### Added

- Participant code entry: The landing page now lets participants open an event with the short code shared by an organizer, without scanning a QR code or creating an account.
- Flexible participant link entry: The join tool accepts either a short event code or a full participant URL, making copied messages and printed instructions easier to use.

### Improved

- Join guidance and privacy reassurance: Inline validation explains how to fix an invalid entry and confirms that participants join anonymously.
- Participant error recovery: Invalid or expired participant links now offer a direct route back to enter a different event code.
- Dashboard participant access copy: Organizers can copy either the participant link or short join code directly from each dashboard event card.

## 1.1.48 - 11 July 2026

Event logistics workflow for date, location, meeting point, and arrival instructions across organizer and participant surfaces.

### Added

- Event logistics editor: Organizers can add event date, time, location, meeting point, and arrival notes from the event editor.
- Participant event details: Participant waiting, live, and ended screens now show organizer-provided logistics so people know where to be and how to arrive.

### Improved

- Handout logistics: Printable participant handouts include event date, location, meeting point, and arrival instructions when configured.
- Share kit arrival details: The share kit now generates an arrival-details message and enriches participant invites with configured logistics.
- Logistics in organizer workflows: Dashboard cards, command center context, event-day plan, and export/import packages now carry event logistics.

## 1.1.47 - 10 July 2026

Organizer-controlled participant support actions for donations, signup, petitions, and campaign follow-up.

### Added

- Organizer support action: Event admins can add an approved support, donation, volunteer, petition, or campaign link directly from the event editor.
- Participant support CTA: Participants see the organizer action on waiting, live, and ended event screens without needing an account.
- Command center support workflow: The command center now shows whether a support action is configured and provides copy-ready follow-up text.

### Improved

- Handout support link: Printable participant handouts include the organizer support action so projector and paper fallback workflows stay complete.
- Support link portability: Support action metadata is validated server-side and included in demonstration export/import packages.

## 1.1.46 - 9 July 2026

Multilingual participant controls and organiser invite snippets for mixed-language events.

### Added

- Participant language selector: Participants can choose English, Spanish, French, Arabic, or Persian from the live participant page.
- Translated participant controls: Core Help, connection, accessibility, poll, safety check, check-in, Q&A, and feedback controls now follow the selected participant language.
- Multilingual organiser invites: The command center now provides ready-to-copy participant invite snippets in five languages.

### Improved

- Saved language preference: Participant language choice is saved locally so returning participants keep the same language after refresh.
- Browser language start: The participant page now starts in a supported browser language when possible before falling back to English.

## 1.1.45 - 8 July 2026

Real-time safety checks for organisers to run quick participant roll calls during disruptions.

### Added

- Live safety checks: Organisers can start a live safety check from the command center when plans change, people separate, or conditions become uncertain.
- Participant safety responses: Participants can respond from the Help panel with I'm OK, need help, leaving now, or not sure without creating an account.
- Safety attention queue: The command center highlights participants who need help or are not sure, including optional notes for organisers.

### Improved

- Safety assistance routing: Need-help safety responses automatically create a live safety assistance request for organisers to resolve.
- Safety readiness and engagement: Safety checks now appear in the command-center readiness summary and count toward participant engagement badges.

## 1.1.44 - 5 July 2026

Practical volunteer-role guidance for peaceful events with clearer arrivals, accessibility, and live communication handoffs.

### Documentation

- Volunteer role planning guide: The public blog now includes a practical guide to assigning volunteer roles for peaceful events before participants arrive.

## 1.1.43 - 3 July 2026

Competitor-informed live polling for real-time organiser decisions and participant engagement.

### Added

- Live crowd polls: Organisers can open a live poll from the command center to ask quick event-day decision questions.
- Participant poll voting: Participants can vote from the Help panel without signing in and can change their vote while the poll is open.
- Live poll results: The command center shows live vote totals and percentages so organisers can adapt the chant or event flow quickly.

### Improved

- Poll close workflow: Organisers can close an active poll, and opening a new poll automatically closes the previous one.
- Poll engagement readiness: Poll votes now contribute to participant engagement points and the command center readiness summary.

## 1.1.42 - 2 July 2026

Competitor-informed role-targeted announcements for segmented event communication.

### Added

- Role-targeted announcements: Admins can target live announcements to everyone, participants, marshals, speakers, or accessibility helpers.
- Participant role filtering: Participants only see role-targeted announcements that match their checked-in role, while everyone still receives all-hands updates.

### Improved

- Announcement audience selector: The command center now includes an audience selector beside the announcement composer.
- Role-aware participant banners: Participant announcement banners now identify whether an update is for everyone or a specific role.
- Segmented announcement API: ChantLive announcements now carry a target role so organisers can send segmented event-day instructions without requiring participant accounts.

## 1.1.41 - 1 July 2026

Competitor-informed participation points, badges, and organiser engagement leaderboard.

### Added

- Participation points: Participants now earn points for useful event actions such as checking in, sending pulse signals, asking questions, upvoting, requesting help, and leaving feedback.
- Participant badges: Participants can see earned badges in the Help panel, including checked in, pulse contributor, asked a question, gave feedback, and active participant.
- Command-center engagement leaderboard: Admins can see top participant engagement, total points, and badges in the command center.

### Improved

- Engagement readiness signal: The command-center readiness row now shows whether participants are actively engaging and how many points have been earned.
- Participant engagement API: ChantLive now has participant and organiser engagement endpoints that summarize useful event actions without requiring participant accounts.

## 1.1.40 - 30 June 2026

Competitor-informed participant feedback surveys with organiser analytics and report integration.

### Added

- Participant feedback survey: Participants can rate clarity, safety, and accessibility from the live Help panel or after the event ends.
- Post-event feedback capture: The ended participant screen now asks for quick feedback before people leave the page.
- Command-center feedback analytics: Admins can see participant feedback response counts, rating averages, and recent comments in the command center.

### Improved

- Post-event report feedback summary: Post-event reports now include participant feedback averages and comments in the visible report and copied report text.
- Participant feedback API: ChantLive now has public participant feedback submission and authenticated organiser feedback summary endpoints.

## 1.1.39 - 29 June 2026

Competitor-informed live participant check-in with role coverage for organisers.

### Added

- Live participant check-in: Participants can check in from the Help panel so organisers know who is present without requiring an account.
- Role coverage check-in: Participants can identify as participant, marshal, speaker, or accessibility helper during check-in.
- Command-center attendance view: Admins can see total check-ins, role counts, and recent check-ins directly in the command center.

### Improved

- Check-in readiness signal: The command-center readiness row now shows how many people have checked in before or during the event.
- Participant check-in API: ChantLive now has public participant check-in submission and authenticated organiser check-in summary endpoints.

## 1.1.38 - 28 June 2026

Practical backup communication guidance for peaceful events facing weak signal or noisy conditions.

### Documentation

- Backup communication planning guide: The public blog now includes a practical guide to building a simple backup communication plan for peaceful events when the main channel becomes unreliable.

## 1.1.37 - 28 June 2026

Competitor-informed live audience Q&A with anonymous participant questions, upvotes, and organiser moderation.

### Added

- Anonymous audience questions: Participants can submit short anonymous questions from the Help panel without creating an account or interrupting the chant.
- Participant question upvotes: Participants can vote up open questions so organisers can see which questions matter most to the crowd.
- Command-center Q&A queue: Admins can monitor live audience questions sorted by votes and submission time from the command center.

### Improved

- Question moderation workflow: Admins can mark audience questions as answered or dismissed so the live queue stays focused.
- Open question readiness signal: The command-center readiness row now shows the count of open audience questions requiring organiser attention.

## 1.1.36 - 27 June 2026

Competitor-informed live crowd pulse and organiser announcements for real-time event feedback.

### Added

- Live crowd pulse: Participants can send quick signals such as too fast, too slow, can't hear, or all good from the Help panel.
- Command-center pulse dashboard: Admins can monitor aggregate participant pulse signals in the command center while the event is running.
- Organizer announcements: Admins can send short live announcements from the command center to participant screens.

### Improved

- Participant announcement banner: Participant screens now show dismissible organiser updates without leaving the live chant view.
- Crowd pulse API: ChantLive now has public participant pulse submission and authenticated organiser pulse-reading endpoints without requiring participant accounts.

## 1.1.35 - 26 June 2026

Live participant assistance requests inspired by audience-engagement and event-app competitor patterns.

### Added

- Live participant assistance requests: Participants can request accessibility, connection, or safety help directly from the Help panel during a live event.
- Command-center assistance queue: Admins can see open participant help requests in the command center with participant labels, timestamps, and request categories.

### Improved

- Resolve assistance workflow: Admins can mark assistance requests as resolved so the command center remains focused on active participant needs.
- Help request readiness signal: The command-center readiness row now shows whether there are open participant help requests requiring organiser attention.
- Participant assistance API: ChantLive now has authenticated organiser endpoints and a participant submission endpoint for live help requests without requiring participants to create accounts.

## 1.1.34 - 26 June 2026

Run-of-show generator, safety coordination board, command/editor workflow links, share-kit handoffs, and participant support guidance.

### Added

- Run-of-show generator: Admins can open a printable and copyable run of show with arrival, safety, live chant, recovery, and debrief steps based on the event setup.
- Safety coordination board: Admins can print or copy a safety board for marshal briefing, accessibility support, organiser fallback, and participant guidance.

### Improved

- Event-day workflow links: The command center and event editor now surface run-of-show and safety-board actions alongside existing planning, recovery, sharing, and briefing tools.
- Share-kit event-day handoffs: Share kits now include copy-ready run-of-show and safety-board messages for speakers, co-organisers, marshals, and accessibility helpers.
- Participant support guidance: The participant Help panel now tells people how to ask marshals or accessibility helpers for the plain link, quiet space, repeated instructions, or help reading chants.

## 1.1.33 - 25 June 2026

Organizer command center, volunteer briefing role cards, dashboard command access, editor command/briefing shortcuts, and expanded share-kit handoffs.

### Added

- Organizer command center: Admins can open a command center that consolidates readiness, live context, participant link, and operational tools for an event.
- Volunteer briefing role cards: Admins can print or copy role cards for speakers, marshals, accessibility helpers, and backup admins.

### Improved

- Dashboard command access: The dashboard now opens the event command center from each demonstration card while keeping card actions contained.
- Editor command and briefing shortcuts: The event editor now surfaces command-center and volunteer-briefing entry points alongside planning, sharing, recovery, and reporting workflows.
- Share-kit command handoffs: Share kits now include copy-ready organiser command-center and volunteer-briefing handoff messages.

## 1.1.32 - 24 June 2026

Live recovery console, post-event reports, recovery/report editor shortcuts, and expanded share-kit recovery follow-ups.

### Added

- Live recovery console: Admins can open a recovery console with live status, participant fallback links, backup-admin handoff, and copy-ready recovery scripts.
- Post-event report: Admins can open a printable and copyable event report with chant review, runtime estimate, admin follow-up, viewer snapshot, and debrief checklist.

### Improved

- Recovery and report shortcuts: The event editor now surfaces recovery and post-event report entry points alongside planning and sharing workflows.
- Recovery share-kit messages: Share kits now include copy-ready connection recovery instructions for participants and organisers.
- Post-event follow-up message: Share kits now include an organiser follow-up message that points teams to the post-event report and reuse checklist.

## 1.1.31 - 23 June 2026

Dashboard card action buttons now stay inside each demonstration card.

### Fixed

- Dashboard action button layout fix: Demonstration card actions now use a contained two-column grid so Edit, Plan, Share, and Delete do not overlap card borders.

## 1.1.30 - 23 June 2026

Organizer share kits, copy-ready event messages, dashboard and editor share shortcuts, participant low-bandwidth mode, and simplified low-signal live display.

### Added

- Organizer share kit: Admins can open a dedicated share-kit page with plain-language messages for participants, backup admins, accessibility fallback, day-of announcements, and public posts.
- Participant low-bandwidth mode: Participants can enable a persistent low-bandwidth mode that reduces animation and hides next-up previews during live chants.

### Improved

- Copy-ready event messages: Each share-kit message can be copied individually, or copied together as a complete event communication pack.
- Share-kit shortcuts: Organizers can open the share kit from the dashboard, readiness actions, and event editor summary.
- Low-signal display guidance: The participant live screen now announces the active display mode and explains when the reduced-motion, low-bandwidth view is active.

## 1.1.29 - 22 June 2026

QR popup viewport fix, compact QR layout, responsive QR sizing, cleaner QR actions, and safer dialog scrolling.

### Fixed

- QR popup viewport fix: The QR code dialog now stays within the browser viewport and scrolls internally when content is taller than the screen.
- Safer dialog scrolling: Shared dialog content now has viewport-aware sizing, improving access to long admin popups beyond the QR flow.

### Improved

- Compact QR dialog layout: The QR dialog uses tighter spacing and a smaller card layout so organizers can reach the top, bottom, and close control more reliably.
- Responsive QR sizing: The QR image now scales down on smaller viewports while remaining large enough for participant scanning.
- QR action grid: QR actions are grouped into a compact Open, Print, and Handout grid to reduce vertical overflow.

## 1.1.28 - 21 June 2026

Accessible QR-code joining guidance for peaceful events and community participation.

### Documentation

- Accessible QR joining guide: The public blog now includes a practical guide for making participant QR-code joining more accessible and reliable at peaceful events.

## 1.1.27 - 21 June 2026

Event-day runbooks, organiser planning shortcuts, chant runtime estimates, dashboard plan access, and participant help guidance.

### Added

- Event-day runbook: Admins can open a generated event plan covering permits, accessibility, safety, participant joining, admin roles, and live controls.
- Participant help panel: Participants can open in-session guidance for reconnecting, improving visibility, and following local safety instructions.

### Improved

- Runbook copy and print tools: The event plan can be copied as a plain-text command sheet or printed for event-day volunteers.
- Editor planning shortcuts: The event editor now surfaces the event-day plan with chant runtime estimates and readiness actions.
- Dashboard plan access: Organizers can open an event plan directly from each demonstration card on the admin dashboard.

## 1.1.26 - 20 June 2026

Participant handout page, sharing tools, editor handout shortcuts, and participant accessibility display controls.

### Added

- Participant handout page: Admins can open a dedicated printable participant handout with the event title, QR code, fallback link, and joining instructions.
- Participant large text mode: Participants can enable a persistent large-text display mode from the live screen.
- Participant high contrast mode: Participants can enable a persistent high-contrast display mode for live chant text and progress bars.

### Improved

- Handout sharing tools: The handout page includes copy, native share, print, and open-participant-page actions for faster event-day distribution.
- Editor handout links: The event editor now links to the full handout page from readiness actions and the QR dialog.

## 1.1.25 - 19 June 2026

Dashboard onboarding, richer event templates, printable QR handouts, and participant end-state guidance.

### Improved

- Dashboard quick start: The admin dashboard now shows a quick-start card that explains the live-event setup flow and opens the create dialog.
- More event title starters: The create-demonstration dialog now includes more common gathering types such as vigils, prayers, walkouts, and rallies.
- Printable QR handout: The QR dialog now contains a handout-style block with event title, QR code, participant link, and keep-open instructions.
- QR handout print styles: Printing from the QR dialog now focuses the printout on the QR handout instead of the surrounding admin interface.
- Participant ended next step: Participants now see a short next-step message when a demonstration ends.

## 1.1.24 - 17 June 2026

Participant sharing, QR handout guidance, live next-up context, waiting tips, and blog topic suggestions.

### Improved

- Share participant link: Event editors now include a Share Link action that uses native device sharing when available and falls back to copying.
- QR handout checklist: The QR dialog now includes a short handout checklist so organizers know what to include when printing fallback materials.
- Live next-up context: The live control summary now shows what comes next for the active chant phase.
- Participant waiting tips: Participants waiting for an event to begin now see simple guidance for staying ready and recovering if updates stop.
- Blog topic suggestions: The blog index now links to a GitHub issue form so community members can suggest future guide topics.

## 1.1.22 - 15 June 2026

Faster participant sharing, clearer readiness actions, starter chants, waiting status, and blog discovery.

### Improved

- Direct participant link copy: Event editors now have a header action to copy the participant link without opening the QR dialog.
- Readiness test actions: The pre-live readiness card now links directly to the participant page and QR instructions.
- Empty event chant starters: Empty events now show starter chant buttons so organizers can create a first chant faster.
- Participant waiting connection status: Participants waiting for an event to begin now see whether they are connected or offline.
- Homepage latest guide: The homepage now promotes the latest community guide so new visitors can discover organizer education content.

## 1.1.21 - 14 June 2026

Public blog section with the first organizer guide and weekly content workflow.

### Added

- Public blog section: ChantLive now has a public blog index and article pages for community organizing, safety, accessibility, and live-event guidance.
- First organizer guide: The first blog post gives first-time peaceful demonstration organizers a practical checklist for participation, permits, safety roles, accessibility, and weak-signal planning.

### Improved

- Blog SEO metadata: Blog index and post routes now have dedicated metadata, structured data, and sitemap entries.
- Blog navigation: The homepage navigation and footer now link to the community blog.
- Weekly blog workflow: A weekly blog automation brief now documents the cadence, content standards, and topic backlog for future posts.

## 1.1.20 - 14 June 2026

Live-event readiness, accessibility fallback, and participant reliability improvements.

### Added

- Pre-live readiness checklist: Event editors now show a checklist for chants, participant-page testing, backup admins, and timing before going live.

### Improved

- Live control summary: Live event controls now summarize the active chant phase, viewer count, and reminder to keep the QR/link visible.
- Accessible QR fallback guidance: The QR dialog now tells organizers to announce and share the participant link for people who cannot scan a QR code.
- Waiting-screen offline warning: Participants waiting for a draft event now see a clear warning if their browser is offline.
- Real-crowd landing guidance: The homepage now explains QR fallback, accessible live prompts, and connection awareness for first-time organizers.

## 1.1.19 - 13 June 2026

Admin list controls and participant live-status clarity improvements.

### Added

- Dashboard sorting: Organizers can sort demonstrations by newest, oldest, or title so busy event lists are easier to scan.
- Admin user search: Super admins can filter admin users by name, email, or role before reviewing activity and demonstration counts.

### Improved

- Dashboard result count: The dashboard now shows how many demonstrations match the current search and status filters.
- Participant phase guidance: Participant screens now show whether the leader is speaking or everyone should respond during a live chant.
- Participant offline status: Participant screens now show an offline warning when the browser loses network connectivity.

## 1.1.18 - 13 June 2026

Readable demonstration creator labels in the admin dashboard.

### Improved

- Readable demonstration creators: Admin demonstration cards now show the creator name and email instead of only a raw user ID.
- Creator search: Dashboard search can now match demonstration creator names, emails, and user IDs.

## 1.1.17 - 12 June 2026

Admin dashboard creator visibility improvement.

### Improved

- Dashboard creator user ID: Admin demonstration cards now show the creator user ID and dashboard search can match creator IDs.

## 1.1.16 - 12 June 2026

SEO landing pages, crawlability, social metadata, and structured data improvements.

### Added

- For organizers SEO page: ChantLive now has a public organizer-focused page that explains the QR code live chant workflow for events.
- About ChantLive page: A new public about page gives civic-tech, accessibility, and community sites a clearer page to link to.

### Improved

- Public internal links: The homepage now links to the organizer and about pages so visitors and crawlers can discover them.
- Sitemap and structured data updates: The sitemap and route-specific JSON-LD now include the new public SEO pages.
- Social preview metadata: Open Graph and Twitter preview metadata now include image dimensions, alt text, and a corrected social card caption.

## 1.1.15 - 11 June 2026

Dashboard filtering, QR copy feedback, and participant retry improvements.

### Added

- Dashboard search: Organizers can search demonstrations by title to find the right event faster.
- Dashboard status filters: Organizers can filter demonstrations by all, live, draft, or ended status before opening an event.

### Improved

- Filtered empty state: When dashboard filters return no results, organizers see a clear message and one-click reset action.
- QR link copy feedback: Admins now get visible and screen-reader-friendly confirmation after copying a participant link.
- Participant retry controls: Participants can retry loading or failed join attempts without being stuck on a dead-end screen.

## 1.1.14 - 10 June 2026

Admin user activity and demonstration visibility improvements.

### Added

- Admin user metrics: Super admins can see when each user joined, when they were last active, and how many demonstrations they can manage.

### Improved

- User activity tracking: Authenticated admin activity is now recorded so super admins can identify recently active users.
- Safer admin user API: The admin user list now returns display-safe user summaries instead of raw account rows.

## 1.1.13 - 10 June 2026

Live-event readiness, QR joining, participant waiting, and trust improvements.

### Added

- Chant starter examples: Organizers can fill the add-chant form from common call-and-response examples instead of starting from a blank dialog.

### Improved

- Live readiness reminder: Admins see a pre-live reminder to add chants, test the participant link, and invite backup admins before an event starts.
- QR join instructions: The QR dialog now gives participants clearer scanning and page-open instructions for crowded live settings.
- Participant waiting guidance: Participants waiting for a draft demonstration now know to keep the page open because chants will appear automatically.
- Landing page trust cards: First-time visitors now see clearer privacy, mobile-use, and open-source trust signals before signing up.

## 1.1.12 - 9 June 2026

Customer-facing onboarding, organiser workflow, participant reliability, and QR sharing improvements.

### Improved

- Clearer event use cases: First-time visitors can quickly see that ChantLive supports marches, prayer circles, campus actions, and community gatherings.
- Dashboard status summary: Organizers can scan total, live, draft, and ended demonstrations before opening an event.
- Participant connection status: Participants can see and hear whether live updates are connected or reconnecting.
- QR fallback guidance: Admins get clear fallback guidance for sharing the participant link when QR scanning is difficult.

### Added

- Quick title starters: Organizers can start new demonstrations faster with common title prompts in the create dialog.

## 1.1.11 - 8 June 2026

Deployment monitoring, QR accessibility, and issue-reporting improvements.

### Improved

- Health check endpoint: Deployments and uptime monitors can check /healthz for status, version, uptime, and timestamp.

### Documentation

- Bug report issue template: Contributors can report reproducible bugs with clear steps, expected behavior, environment, and safety checks.
- QR accessibility checklist: Organizers have practical guidance for sharing participant QR codes with URL fallbacks and scan testing.
- Release health checks: The release checklist now includes health endpoint and QR sharing verification steps.
- Health endpoint documentation: README now documents the /healthz endpoint for uptime and deployment monitoring.

## 1.1.10 - 8 June 2026

Public release notes workflow and changelog visibility improvements.

### Added

- Public changelog page: Community members can review recent ChantLive releases directly on the website.

### Improved

- Structured release notes data: Release notes now have a structured source of truth for website, markdown, and automation output.

### Documentation

- Release note scripts: Maintainers can add, import, and generate changelog entries from npm scripts.
- Release item issue template: Feature requests can capture user impact and proposed public changelog wording.

### Internal

- Release item workflow: Repository automation can record approved release-note items into the structured changelog.

## 1.1.9 - 8 June 2026

Security, accessibility, deployment, and release communication improvements.

### Improved

- Baseline HTTP security headers: API and page responses now include baseline security headers.
- Reduced motion support: Animations now respect users who prefer reduced motion.

### Added

- Screen reader live chant announcements: Participant chant updates are announced to assistive technologies.

### Documentation

- Release checklist: Deployment verification steps and common Replit Git recovery notes are documented.
- Project changelog: Community members can now review project changes before deploying or contributing.
