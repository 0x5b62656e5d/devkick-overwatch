import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { startWatcher } from '#/lib/watcher'

startWatcher()

const fetch = createStartHandler(defaultStreamHandler)

export default createServerEntry({ fetch })
