import { ZettelServices } from '@zettelooo/api-server'
import { ZETTEL_EXTENSION_ACCESS_KEY, ZETTEL_TARGET_ENVIRONMENT } from './constants'
import { PageExtensionData } from 'shared'

export const restApiClient = new ZettelServices.Extension.Rest<PageExtensionData>({
  extensionRestApi: { targetEnvironment: ZETTEL_TARGET_ENVIRONMENT },
  extensionAccessKey: ZETTEL_EXTENSION_ACCESS_KEY,
})
