import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 80, scroll: { offset: 0, bodyRows: 6 }, view: {} },
} as const

test('shows a placeholder before any reading', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'limit-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /появится/ })).toBeDefined()
    await ui.unmount()
  }
})

test('shows what is left of each window', async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: {} as never,
    rateLimits: [
      { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2099-01-01T00:00:00Z' },
      { kind: 'seven_day', percentUsed: 95 },
    ],
    changed: ['rateLimits'],
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'limit-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /осталось 77%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /осталось 5%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /неделя/ })).toBeDefined()
    await ui.unmount()
  }
})
