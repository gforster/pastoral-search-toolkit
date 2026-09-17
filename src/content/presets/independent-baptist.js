export const STARTER_PRESET = {
  templateVersion: 1,
  name: 'Independent Baptist Congregational Starter',
  assumptions: [
    'Congregational final call',
    'A search or pulpit committee',
    'Independent Baptist context; review against adopted doctrine and governance',
  ],
  answers: {
    callAuthority: {
      status: 'known',
      value:
        'Suggested: the congregation makes the final call after an authorized committee recommendation. Confirm the governing provision.',
    },
    callMethod: { status: 'known', value: 'vote' },
    prospectPool: { status: 'known', value: 'parallel' },
    seriousConsideration: { status: 'known', value: 'one' },
    updateRhythm: {
      status: 'known',
      value:
        'Suggested: an authorized spokesperson gives a process update at least monthly, including current phase, completed work, next steps, participation, and prayer.',
    },
  },
  requirements: [],
  questions: ['i1', 'i3', 'i5', 'i6', 'i14', 'i18'],
};
