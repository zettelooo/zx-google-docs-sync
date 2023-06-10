import { ZettelServices } from '@zettelooo/api-server'
import { PageExtensionData } from 'shared'
import { ZETTEL_EXTENSION_ACCESS_KEY, ZETTEL_TARGET_ENVIRONMENT } from './constants'
import { synchronizeToGoogleDocs } from './synchronizeToGoogleDocs'

export function connectWsApi(): ZettelServices.Extension.Ws.GetUpdates<PageExtensionData> {
  const connection = new ZettelServices.Extension.Ws.GetUpdates<PageExtensionData>({
    extensionWsApi: { targetEnvironment: ZETTEL_TARGET_ENVIRONMENT },
    extensionAccessKey: ZETTEL_EXTENSION_ACCESS_KEY,
    startInitially: true,
    retryConnectionTimeoutMilliseconds: 10 * 1000,
    onStatusChange: status => {},
    onMutation: async mutation => {
      switch (mutation.type) {
        case 'page': {
          // TODO: Also clean pageCredentials database accordingly
          if (mutation.newPage.isDeleted) break
          const newPageExtensionData = mutation.newPage.extensionData
          const oldPageExtensionData = mutation.oldPage?.extensionData
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
  return connection
}
