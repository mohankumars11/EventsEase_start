/**
 * The free Celebration Toolkit — the seven digital features every event
 * gets, at no cost, without hiring anybody.
 *
 * These are NOT services and must never be mixed in with the partner
 * recommendations: nothing here is bookable, nothing here is quoted, and
 * no master is dispatched for any of it. The plan screen shows the bundle
 * once, at the top, under one FREE badge.
 *
 * Four of the seven already exist in the app and are reused, never
 * rebuilt — `ready: true` means the feature is live and `to` is the route
 * that opens it:
 *
 *   invitations   invitations + invitation_functions   (/invites/new)
 *   rsvp          invitation_guests                    (the host screen)
 *   chat          invitation_circle_messages           (the circle)
 *   community     invitation_circles + members         (the circle)
 *
 * Three are new and ship with migration 211; until it is applied they are
 * marked `ready: false` and say so on the card rather than pretending:
 *
 *   polls         sambramo_event_polls
 *   budget        sambramo_event_contributions (+ the computed estimate)
 *   schedule      sambramo_event_updates (+ the blueprint's timeline)
 *
 * `modes` is how an occasion narrows a feature — a kids' party makes RSVP
 * guardian-only, a proposal makes everything organiser-only. The engine
 * (lib/occasionPlan.toolkitFor) reads the occasion's `toolkit` block and
 * attaches the matching note.
 */
export const TOOLKIT = [
  {
    key: 'invitations', hook: 'Invite', label: 'Invitations', long: 'Digital invitations', icon: 'invite', ready: true, to: '/invites/new',
    line: 'Create and share a beautiful invitation for your celebration.',
    does: ['Occasion-specific designs', 'Edit any template', 'One link, shared on WhatsApp', 'See who opened it'],
    modes: {
      private: 'Sent one by one. Never posted to a shared feed.',
      quiet: 'Sent quietly, with no reminders and no follow-ups.',
      casual: 'A link in the group chat is usually enough.',
      formal: 'A printed-looking invitation, sent as a link.',
      optional: 'Only if you want one.',
    },
  },
  {
    key: 'rsvp', hook: 'Connect', label: 'RSVP & guests', long: 'RSVP & guest management', icon: 'rsvp', ready: true, to: '/invites',
    line: 'Know who’s coming, and keep every guest organised.',
    does: ['Coming, not coming, waiting', 'Head count that updates itself', 'Meal preferences', 'Your own questions', 'Gentle reminders'],
    modes: {
      guardian: 'Parents answer for their children, and give the name of whoever collects them.',
      organiser: 'Only you see the list. Nobody else knows who was asked.',
      private: 'The list stays with the family.',
      optional: 'Only if you need a count.',
    },
  },
  {
    key: 'chat', hook: 'Together', label: 'Event chat', long: 'Private event group chat', icon: 'chat', ready: true, to: '/invites',
    line: 'Keep everyone connected in one celebration space.',
    does: ['One thread for the event', 'Announcements from the host', 'Photos and messages', 'Nobody outside can see it'],
    modes: {
      guardian: 'Parents only. Children are never put in a group together.',
      organiser: 'Only the people organising. The guest of honour is not in it.',
      private: 'Family only, and quiet by default.',
      optional: 'Turn it on if the group needs it.',
    },
  },
  {
    key: 'community', hook: 'Collaborate', label: 'Event group', long: 'Group community & collaboration', icon: 'group', ready: true, to: '/invites',
    line: 'Bring your celebration group together to plan every detail.',
    does: ['A private group for this event', 'Host and guest roles', 'Shared planning updates', 'Joined by invitation only'],
    modes: {
      organiser: 'Organisers only, until the day.',
      private: 'Family only.',
    },
  },
  {
    key: 'polls', hook: 'Decide', label: 'Smart polls', icon: 'poll', ready: false, to: null,
    line: 'Let everyone vote, and settle it without forty messages.',
    does: ['Date', 'Place', 'Food', 'Theme', 'Dress code', 'Anything you ask'],
    polls: ['date', 'venue', 'food'],
  },
  {
    key: 'budget', hook: 'Balance', label: 'Budget tracker', long: 'Shared budget tracker', icon: 'budget', ready: false, to: null,
    line: 'Keep the celebration budget and everyone’s share in one place.',
    does: ['Your budget', 'What the plan is estimated at', 'What’s actually been paid', 'Who owes what', 'What’s left'],
    modes: {
      shared: 'Several households contributing — each share tracked separately.',
      split: 'Split across the group, with everyone’s share visible.',
    },
  },
  {
    key: 'schedule', hook: 'Schedule', label: 'Schedule', long: 'Event schedule & updates', icon: 'schedule', ready: false, to: null,
    line: 'Keep everyone updated on what happens and when.',
    does: ['The running order', 'Timings and the address', 'Changes, pushed to everyone', 'Before, during and after'],
  },
]

export const TOOLKIT_BY_KEY = Object.fromEntries(TOOLKIT.map(f => [f.key, f]))

/** What the poll keys mean, where an occasion names them. */
export const POLL_LABEL = {
  date: 'Which date suits everyone?',
  venue: 'Where should we hold it?',
  location: 'Which part of town?',
  food: 'What should we eat?',
  menu: 'Which menu?',
  theme: 'Which theme?',
  activity: 'What should we do?',
  outfit: 'What are we wearing?',
  music: 'What should be playing?',
  budget: 'What’s a comfortable spend each?',
  gifts: 'What should we give?',
}
