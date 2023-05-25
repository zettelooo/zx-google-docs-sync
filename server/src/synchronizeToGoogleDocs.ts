import { docs, docs_v1, GaxiosPromise } from '@googleapis/docs'
import { ZettelTypes } from '@zettelooo/api-types'
import { Id, PartialRecord } from '@zettelooo/commons'
import { PageExtensionData } from '../../shared/PageExtensionData'
import { createOAuth2Client } from './createOAuth2Client'
import { handleApiCallConnectionReset } from './handleApiCallConnectionReset'
import { PageCredentialsStorage } from './PageCredentialsStorage'
import { restApiClient } from './restApiClient'

type Page = ZettelTypes.Extension.Entity.Page<PageExtensionData>

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
        const ccc = restApiClient.setPageExtensionData({
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
        let currentIndex = 1
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
            currentIndex += 3
          }
          card.blocks.forEach(block => {
            const blockStartIndex = currentIndex
            switch (block.type) {
              case ZettelTypes.Model.Block.Type.Paragraph:
                pushStyledText(block)
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType: 'NORMAL_TEXT',
                    },
                  },
                })
                break

              case ZettelTypes.Model.Block.Type.Header:
                pushStyledText(block)
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType:
                        block.level === 1
                          ? 'HEADING_1'
                          : block.level === 2
                          ? 'HEADING_2'
                          : block.level === 3
                          ? 'HEADING_3'
                          : block.level === 4
                          ? 'HEADING_4'
                          : block.level === 5
                          ? 'HEADING_5'
                          : block.level === 6
                          ? 'HEADING_6'
                          : '',
                    },
                  },
                })
                break

              case ZettelTypes.Model.Block.Type.Quote:
                pushStyledText(block, 1)
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType: 'SUBTITLE',
                      spaceAbove: { magnitude: 5, unit: 'PT' },
                      spaceBelow: { magnitude: 5, unit: 'PT' },
                      borderRight: {
                        color: { color: { rgbColor: { blue: 0.2 } } },
                        dashStyle: 'DOT',
                        padding: { magnitude: 10, unit: 'PT' },
                        width: { magnitude: 2, unit: 'PT' },
                      },
                      borderLeft: {
                        color: { color: { rgbColor: { blue: 0.2 } } },
                        dashStyle: 'DOT',
                        padding: { magnitude: 10, unit: 'PT' },
                        width: { magnitude: 2, unit: 'PT' },
                      },
                    },
                  },
                })
                break

              case ZettelTypes.Model.Block.Type.Code:
                requests.push({
                  insertText: {
                    endOfSegmentLocation: {},
                    text: block.text,
                  },
                })
                currentIndex += block.text.length
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType: 'SUBTITLE',
                      spaceAbove: { magnitude: 3, unit: 'PT' },
                      spaceBelow: { magnitude: 3, unit: 'PT' },
                      borderTop: {
                        color: { color: { rgbColor: { blue: 0.2 } } },
                        dashStyle: 'SOLID',
                        padding: { magnitude: 3, unit: 'PT' },
                        width: { magnitude: 1, unit: 'PT' },
                      },
                      borderRight: {
                        color: { color: { rgbColor: { blue: 0.2 } } },
                        dashStyle: 'SOLID',
                        padding: { magnitude: 3, unit: 'PT' },
                        width: { magnitude: 1, unit: 'PT' },
                      },
                      borderBottom: {
                        color: { color: { rgbColor: { blue: 0.2 } } },
                        dashStyle: 'SOLID',
                        padding: { magnitude: 3, unit: 'PT' },
                        width: { magnitude: 1, unit: 'PT' },
                      },
                      borderLeft: {
                        color: { color: { rgbColor: { blue: 0.2 } } },
                        dashStyle: 'SOLID',
                        padding: { magnitude: 3, unit: 'PT' },
                        width: { magnitude: 1, unit: 'PT' },
                      },
                    },
                  },
                })
                break

              case ZettelTypes.Model.Block.Type.ListItem:
                pushStyledText(block)
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  createParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    bulletPreset: block.ordered ? 'NUMBERED_DECIMAL_ALPHA_ROMAN' : 'BULLET_DISC_CIRCLE_SQUARE',
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType: 'NORMAL_TEXT',
                    },
                  },
                })
                break

              case ZettelTypes.Model.Block.Type.Task:
                pushStyledText(block)
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  createParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    bulletPreset: 'BULLET_CHECKBOX',
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType: 'NORMAL_TEXT',
                    },
                  },
                })
                break

              case ZettelTypes.Model.Block.Type.Attachment:
                // TODO: Implement images
                //  block.files
                //    .filter(file => file.mimeType.startsWith('image/'))
                //    .forEach(file => {
                //      requests.push({
                //        insertInlineImage: {
                //          endOfSegmentLocation: {},
                //          uri: file.id,
                //        },
                //      })
                //      currentIndex += 1
                //    })
                requests.push({
                  deleteParagraphBullets: {
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                  },
                })
                requests.push({
                  updateParagraphStyle: {
                    fields: '*',
                    range: { startIndex: blockStartIndex, endIndex: currentIndex },
                    paragraphStyle: {
                      namedStyleType: 'NORMAL_TEXT',
                    },
                  },
                })
                break
            }
            requests.push({
              insertText: {
                endOfSegmentLocation: {},
                text: '\n',
              },
            })
            currentIndex += 1

            function pushStyledText(styledText: ZettelTypes.Model.Block.StyledText, indentation = 0): void {
              void [
                {
                  start: 0,
                  end: styledText.annotations[0]?.from ?? styledText.text.length,
                  annotation: undefined,
                },
                ...styledText.annotations.flatMap((annotation, annotationIndex) => [
                  {
                    start: annotation.from,
                    end: annotation.to,
                    annotation,
                  },
                  {
                    start: annotation.to,
                    end: styledText.annotations[annotationIndex + 1]?.from ?? styledText.text.length,
                    annotation: undefined,
                  },
                ]),
              ]
                .filter(annotationRange => annotationRange.start !== annotationRange.end)
                .forEach(annotationRange => {
                  // TODO: Also apply inline styles
                  if (!annotationRange.annotation) {
                    requests.push({
                      insertText: {
                        endOfSegmentLocation: {},
                        text: styledText.text.slice(annotationRange.start, annotationRange.end),
                      },
                    })
                    currentIndex += annotationRange.end - annotationRange.start
                  } else {
                    switch (annotationRange.annotation.type) {
                      case ZettelTypes.Model.Block.StyledText.Annotation.Type.HyperLink:
                      case ZettelTypes.Model.Block.StyledText.Annotation.Type.PlainLink:
                        // TODO: Distinguish inline images and bookmark links
                        requests.push({
                          insertText: {
                            endOfSegmentLocation: {},
                            text: styledText.text.slice(annotationRange.start, annotationRange.end),
                          },
                        })
                        requests.push({
                          updateTextStyle: {
                            fields: 'link',
                            range: {
                              startIndex: currentIndex,
                              endIndex: currentIndex + annotationRange.end - annotationRange.start,
                            },
                            textStyle: {
                              link: { url: annotationRange.annotation.url },
                            },
                          },
                        })
                        currentIndex += annotationRange.end - annotationRange.start
                        break

                      case ZettelTypes.Model.Block.StyledText.Annotation.Type.ReferencedUser:
                        // TODO: Not implemented
                        break

                      case ZettelTypes.Model.Block.StyledText.Annotation.Type.ReferencedPage:
                        // TODO: Not implemented
                        break

                      case ZettelTypes.Model.Block.StyledText.Annotation.Type.ReferencedCard:
                        // TODO: Not implemented
                        break
                    }
                  }
                })
            }
          })
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
