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
import { ChildDocuments } from './collections/ChildDocuments'
import { AuditLogs } from './collections/AuditLogs'
import { AboutPage } from './collections/AboutPage'
import { Posts } from './collections/Posts'
import { EconomyTransactions } from './collections/EconomyTransactions'
import { BankConnections } from './collections/BankConnections'
import { BankTransactions } from './collections/BankTransactions'
import { BankTransfers } from './collections/BankTransfers'
import { Notifications } from './collections/Notifications'
import { CalendarEvents } from './collections/CalendarEvents'
import { EconomyRequests } from './collections/EconomyRequests'



const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, LandingPage, Posts,
    AboutPage,Customers, Families, Children, ChildDocuments, AuditLogs, Notifications,
    EconomyTransactions,BankConnections,BankTransactions,BankTransfers,CalendarEvents,EconomyRequests],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URL || '',},
  }),
  sharp,
  plugins: [],
})
