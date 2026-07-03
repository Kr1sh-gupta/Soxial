import { createServer, type RequestListener } from 'http'
import { runAgent, getAgentConfig } from './agent'
import { logger } from './log'

export function startApiServer(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/api/chat') {
        res.writeHead(404)
        res.end()
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk)
      const { messages } = JSON.parse(Buffer.concat(chunks).toString())

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })

      let doneCalled = false
      const send = (data: any) => {
        if (!doneCalled) res.write(`data: ${JSON.stringify(data)}\n\n`)
      }

      await runAgent(
        messages,
        (text) => send({ type: 'text', content: text }),
        (name, args) => send({ type: 'tool_call', name, args }),
        (name, result) => send({ type: 'tool_result', name, result }),
        (fullText) => {
          send({ type: 'done', fullText })
          doneCalled = true
          res.end()
        },
        (error) => {
          send({ type: 'error', error })
          doneCalled = true
          res.end()
        }
      )
    })

    server.listen(0, () => {
      const port = (server.address() as any).port
      logger.info('api-server', `started on port ${port}`)
      resolve(port)
    })
  })
}
