import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { LandingPage } from './collections/LandingPage'
import { Customers } from './collections/Customers'
import { Families } from './collections/Families'
import { Children } from './collections/Children'
import { CalendarEvents } from './collections/CalendarEvents'
import { ChildDocuments } from './collections/ChildDocuments'
import { AuditLogs } from './collections/AuditLogs'


const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, LandingPage, Customers, Families, Children, ChildDocuments, AuditLogs, CalendarEvents],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
