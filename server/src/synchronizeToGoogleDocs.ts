import { docs, docs_v1, GaxiosPromise } from '@googleapis/docs'
import { ZettelTypes } from '@zettelooo/api-types'
import { Id, PartialRecord } from '@zettelooo/commons'
import { PageExtensionData } from 'shared'
import { createOAuth2Client } from './createOAuth2Client'
import { handleApiCallConnectionReset } from './handleApiCallConnectionReset'
import { PageCredentialsStorage } from './PageCredentialsStorage'
import { restApiClient } from './restApiClient'

type Page = ZettelTypes.Extension.Model.Page<PageExtensionData>

const { documents } = docs('v1')
const pageSynchronizationQueues: PartialRecord<Id, Page> = {}

export async function synchronizeToGoogleDocs(page: Page): Promise<void> {
  const toBeQueued = page.id in pageSynchronizationQueues
  pageSynchronizationQueues[page.id] = page
  if (!toBeQueued) {
    await start(page.id)
  }

  async function start(pageId: Id): Promise<void> {
    {
      const synchronizingPage = pageSynchronizationQueues[pageId]
      if (synchronizingPage) {
        try {
          await synchronizeOnce(synchronizingPage)
        } catch (error) {
          console.error(error)
        }
        if (pageSynchronizationQueues[pageId] === synchronizingPage) {
          delete pageSynchronizationQueues[pageId]
        } else {
          await start(pageId)
        }
      }
    }

    async function synchronizeOnce(synchronizingPage: Page): Promise<void> {
      const pageCredentials = await PageCredentialsStorage.get(synchronizingPage.id)
      if (!pageCredentials) return
      let { accessToken, refreshToken, expiryTimestamp } = pageCredentials
      const client = createOAuth2Client()
      if (!synchronizingPage.extensionData || synchronizingPage.extensionData.enabled) return
      const document =
        (await tryToGetDocumentAndUpdatePageIfNeeded(synchronizingPage.extensionData.document?.id)) ||
        (await createDocumentAndUpdatePage(synchronizingPage.name))
      await exportCardsToDocument()

      async function tryToGetDocumentAndUpdatePageIfNeeded(
        id: Id | undefined
      ): Promise<docs_v1.Schema$Document | undefined> {
        if (!id) return undefined
        try {
          const currentDocument = await performApiCall(() =>
            documents.get({
              access_token: accessToken,
              documentId: id,
            })
          )
          if (
            !synchronizingPage.extensionData?.enabled &&
            currentDocument.title !== synchronizingPage.extensionData?.document?.title
          ) {
            await updatePageExtensionDataDocument(currentDocument)
          }
          return currentDocument
        } catch (error: any) {
          if (error.code === 404) return undefined
          throw error
        }
      }

      async function createDocumentAndUpdatePage(title: string): Promise<docs_v1.Schema$Document> {
        const newDocument = await performApiCall(() =>
          documents.create({
            access_token: accessToken,
            requestBody: { title },
          })
        )
        await updatePageExtensionDataDocument(newDocument)
        return newDocument
      }

      async function updatePageExtensionDataDocument(updatedDocument: docs_v1.Schema$Document): Promise<void> {
        restApiClient.setPageExtensionData({
          pageId: synchronizingPage.id,
          data: {
            ...(synchronizingPage.extensionData as PageExtensionData.Activated),
            document: {
              id: updatedDocument.documentId ?? '',
              title: updatedDocument.title ?? '',
            },
          },
        })
      }

      async function exportCardsToDocument(): Promise<void> {
        const requests: docs_v1.Schema$Request[] = []
        const totalContentEndIndex = document.body!.content![document.body!.content!.length - 1]!.endIndex! - 1
        if (totalContentEndIndex > 1) {
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: totalContentEndIndex,
              },
            },
          })
        }
        const { cards } = await restApiClient.getCards({
          pageIds: [synchronizingPage.id],
        })
        const sortedCards = [...cards].sort((a, b) => (a.sequence > b.sequence ? +1 : a.sequence < b.sequence ? -1 : 0))
        sortedCards.forEach((card, cardIndex) => {
          if (cardIndex > 0) {
            requests.push({
              insertText: {
                endOfSegmentLocation: {},
                text: '\n\n\n',
              },
            })
          }
          if (card.text) {
            requests.push({
              insertText: {
                endOfSegmentLocation: {},
                text: card.text,
              },
            })
          }
        })
        if (requests.length > 0) {
          await documents.batchUpdate({
            access_token: accessToken,
            documentId: document.documentId ?? undefined,
            requestBody: {
              requests,
            },
          })
        }
      }

      async function performApiCall<T = any>(apiCall: () => GaxiosPromise<T>): Promise<T> {
        if (expiryTimestamp < Date.now()) {
          await refreshAccessToken()
        }
        try {
          const firstAttempt = await apiCall()
          return firstAttempt.data
        } catch (error: any) {
          if (error.code !== 401) throw error
          await refreshAccessToken()
          const secondAttempt = await apiCall()
          return secondAttempt.data
        }

        async function refreshAccessToken(): Promise<void> {
          client.setCredentials({ refresh_token: refreshToken })
          const { credentials } = await handleApiCallConnectionReset(() => client.refreshAccessToken())
          accessToken = credentials.access_token ?? accessToken
          refreshToken = credentials.refresh_token ?? refreshToken
          expiryTimestamp = credentials.expiry_date ?? expiryTimestamp
          await PageCredentialsStorage.set(synchronizingPage.id, {
            id: synchronizingPage.id,
            accessToken,
            refreshToken,
            expiryTimestamp,
          })
        }
      }
    }
  }
}
