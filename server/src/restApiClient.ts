import { ZettelServices } from '@zettelyay/api-server'
import { ZETTEL_EXTENSION_ACCESS_KEY, ZETTEL_TARGET_ENVIRONMENT } from '../../shared/constants'

export const restApiClient = new ZettelServices.Extension.Rest({
  extensionRestApi: { targetEnvironment: ZETTEL_TARGET_ENVIRONMENT },
  extensionAccessKey: ZETTEL_EXTENSION_ACCESS_KEY,
})
