import type { CollectionConfig } from 'payload'

function getCollectionSlug(req : any){
  return req?.user?.collection ?? req?.user?._collection
}
function isAdmin(req: any){
  return getCollectionSlug(req) === 'users'
}

function isCustomer(req: any){
  return getCollectionSlug(req) === 'customers'
}
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({req}) =>!!req.user && (isAdmin(req)||isCustomer(req)),
    update: ({req}) =>!!req.user && (isAdmin(req)||isCustomer(req)),
    delete: ({req}) =>!!req.user && isAdmin(req),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false,
    },
  ],
  upload: true,
}
