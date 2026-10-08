import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'limit-band', key: 'limits' } as const, [] as Limit[])

const NAMES: Record<string, string> = {
  five_hour: '5 ч',
  seven_day: 'неделя',
  spend_limit: 'бюджет',
}

function bar(percent: number, width = 10): string {
  const filled = Math.min(width, Math.max(0, Math.round((percent / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function resetText(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const ms = Date.parse(iso) - now
  if (!(ms > 0)) return ''
  const min = Math.round(ms / 60000)
  if (min < 60) return ` · сброс через ${min} мин`
  const hours = Math.floor(min / 60)
  if (hours < 24) return ` · сброс через ${hours} ч ${min % 60} мин`
  return ` · сброс через ${Math.floor(hours / 24)} д ${hours % 24} ч`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { rateLimits } = await $.session.usage()
    await update($, limits, () => rateLimits)
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, limits)

    if (list.length === 0) {
      return (
        <Box>
          <Text dimColor>Лимит: появится после первого ответа</Text>
        </Box>
      )
    }

    const now = await $.clock.now()

    return (
      <Box flexDirection="column">
        {list.map(l => {
          const left = Math.max(0, 100 - l.percentUsed)
          const color = left <= 10 ? 'red' : left <= 30 ? 'yellow' : 'green'
          return (
            <Box key={l.kind}>
              <Text dimColor>Лимит {NAMES[l.kind] ?? l.kind}: </Text>
              <Text color={color}>{bar(l.percentUsed)}</Text>
              <Text> осталось {Math.round(left)}%</Text>
              <Text dimColor>{resetText(l.resetsAt, now)}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
