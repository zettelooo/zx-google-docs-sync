import { Id, Timestamp } from '@zettelyay/commons'
import keyFileStorage from 'key-file-storage'
import path from 'path'

const kfs = keyFileStorage(path.join(__dirname, '..', 'storage', 'page-credentials'))

export namespace PageCredentialsStorage {
  export function get(pageId: Id): Promise<PageCredentials | undefined> {
    return kfs<PageCredentials>(pageId)
  }

  export async function set(pageId: Id, pageCredentials: PageCredentials | undefined): Promise<void> {
    await kfs(pageId, pageCredentials)
  }

  export interface PageCredentials {
    readonly id: Id
    readonly accessToken: string
    readonly refreshToken: string
    readonly expiryTimestamp: Timestamp
  }
}
