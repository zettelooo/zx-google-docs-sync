import { ZettelExtensions } from '@zettelooo/extension-api'
import { PageExtensionData } from 'shared'

export const registerTipMessage: ZettelExtensions.Helper<
  'pagePanel',
  'api' | 'pagePanel',
  [],
  {
    updateTipMessage: (pageExtensionData: PageExtensionData.Activated | undefined) => void
  }
> = function ({ api, pagePanelApi }) {
  const tipMessageRegistration = this.register(
    pagePanelApi.registry.message<PageExtensionData.Activated | undefined>(() => ({
      initialState: undefined,
      render: ({ renderContext }) => {
        if (!renderContext.state) return { encapsulated: true, html: '<p>Please wait...</p>' }
        const documentUrl = renderContext.state.document?.id
          ? `https://docs.google.com/document/d/${renderContext.state.document.id}`
          : ''
        return {
          encapsulated: true,
          html: `
<style>
  .idea-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .field {
    white-space: nowrap;
  }
</style>

<div>
  <p class="idea-container">
    <img src="${api.getFileUrl({ filePath: 'idea.png' })}" alt="tip" />
    All the cards of this page will be automatically synchronized into Google Docs.
  </p>
  <div class="field">User email: <strong>${renderContext.state.signedInEmail}</strong></div>
  <br />
  <div class="field">Document name: <strong>${renderContext.state.document?.title ?? 'Please wait...'}</strong></div>
  <br />
  <div class="field">Document URL:
    <strong>${
      documentUrl ? `<a href="${documentUrl}" target="_blank" rel="noreferrer">${documentUrl}</a>` : 'Please wait...'
    }</strong>
  </div>
</div>
`,
        }
      },
      variant: 'information',
    }))
  )

  return {
    updateTipMessage(pageExtensionData) {
      tipMessageRegistration.reference.current?.update({
        initialState: pageExtensionData,
        hidden: !pageExtensionData,
      })
    },
  }
}
