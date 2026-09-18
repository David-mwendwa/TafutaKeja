/**
 * What an agent has to have in place before the team will look at their account.
 *
 * One definition, read by the agent's own dashboard and enforced on the request
 * endpoint. Restating it in the UI is how a checklist ends up disagreeing with
 * the rule that actually decides — the same reason the listing state machine is
 * fetched rather than copied into the React tree.
 *
 * The badge itself is still awarded by a person: this is the paperwork that has
 * to be complete before there is anything for them to check.
 */
export const verificationSteps = (user, publishedCount) => [
  {
    key: 'phone',
    label: 'Add a phone number to your profile',
    detail: 'The team calls it to confirm you are reachable on the number buyers will see.',
    href: '/profile',
    done: Boolean(user.phone),
  },
  {
    key: 'identity',
    label: 'Say who you are: agency name, or a short bio if you work alone',
    detail: 'This is what appears on your public agent page beside your listings.',
    href: '/profile',
    done: Boolean(user.agencyName || user.bio),
  },
  {
    key: 'listing',
    label: 'Get at least one listing published',
    detail: 'A live advert that cleared review is what there is to check you against.',
    href: '/agent',
    done: publishedCount > 0,
  },
];

export const stepsRemaining = (steps) => steps.filter((step) => !step.done);
