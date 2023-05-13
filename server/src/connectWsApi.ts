import { ZettelServices } from '@zettelyay/api-server'
import { EXTENSION_ACCESS_KEY } from './constants'
import { synchronizeToGoogleDocs } from './synchronizeToGoogleDocs'
import { PageExtensionData } from '../../shared/PageExtensionData'

export function connectWsApi(): void {
  const connection = new ZettelServices.Extension.Ws.GetUpdates({
    extensionWsApiBaseUrl: undefined,
    extensionAccessKey: EXTENSION_ACCESS_KEY,
    startInitially: true,
    retryConnectionTimeoutMilliseconds: 10 * 1000,
    onStatusChange: status => {},
    onMutation: async mutation => {
      switch (mutation.type) {
        case 'page': {
          // TODO: Also clean pageCredentials database accordingly
          if (mutation.newPage.isDeleted) break
          const newPageExtensionData = mutation.newPage.extensionData as PageExtensionData
          const oldPageExtensionData = mutation.oldPage?.extensionData as PageExtensionData | undefined
          if (
            !newPageExtensionData?.enabled &&
            newPageExtensionData?.signedInEmail &&
            (oldPageExtensionData?.enabled ||
              newPageExtensionData.signedInEmail !== oldPageExtensionData?.signedInEmail ||
              (!newPageExtensionData.document && oldPageExtensionData.document))
          ) {
            await synchronizeToGoogleDocs(mutation.newPage)
          }
          break
        }

        case 'card': {
          if (mutation.page.hasExtensionInstalled) {
            await synchronizeToGoogleDocs(mutation.page)
          }
          break
        }
      }
    },
  })
}
