# Attendly Hackathon MVP

Attendly is an Android attendance planning application for college students.

DEADLINE:
This is a hackathon MVP that must be fully demoable.

PRIMARY DEMO FLOW:

1. User logs in.
2. User adds subjects and current attendance.
3. User creates a weekly timetable.
4. User saves their college latitude, longitude and campus radius.
5. Dashboard shows current attendance.
6. User taps CHECK ATTENDANCE.
7. App gets current device location.
8. App checks whether the user is inside the saved campus radius.
9. App checks the timetable for the currently scheduled class.
10. App creates an attendance suggestion.
11. User confirms PRESENT or ABSENT.
12. Subject attendance updates.
13. User opens CAN I BUNK.
14. App calculates whether a class can be missed.
15. AI explains the result using funny student-friendly language.

IMPORTANT:

This is a personal attendance tracker.

Never claim this is official college attendance.

LOCATION:

Do not implement background geofencing.

Do not implement continuous tracking.

Only get current device location when:

- App dashboard loads if permission is available.
- User taps CHECK ATTENDANCE.

Use the Haversine formula to determine whether the user is inside the campus radius.

ATTENDANCE:

All attendance mathematics must be deterministic Kotlin code.

AI must never calculate attendance.

TECH STACK:

Kotlin
Jetpack Compose
Material 3
MVVM
Firebase Authentication
Cloud Firestore
Google Play Services Location

DESIGN:

Dark Gen-Z student app.

Playful.

Funny.

Large attendance cards.

Status:

SAFE 😎
BORDERLINE 👀
DANGER 💀

MAIN SCREENS:

Login
Dashboard
Subjects
Add Subject
Timetable
College Setup
Attendance Check
Can I Bunk
Simulator
Settings

DO NOT IMPLEMENT:

Background geofencing
WorkManager
Google Sign-In
Notifications
AI chat
Multiple campuses
Advanced analytics

The application must compile after every phase.

Never leave visible buttons without functionality.
