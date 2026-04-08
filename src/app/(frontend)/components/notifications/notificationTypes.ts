export type NotificationItem = {
  id: string | number
  title: string
  message?: string
  type: 'calendar' | 'expense' | 'status' | 'documents'
  event:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'confirmed'
    | 'commented'
    | 'liked'
    | 'uploaded'
    | 'replaced'
  isRead: boolean 
  link?: string
  createdAt?: string
}