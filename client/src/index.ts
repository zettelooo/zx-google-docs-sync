import { ZettelExtensions } from '@zettelooo/extension-api'
import { PageExtensionData } from '../../shared/PageExtensionData'
import { provideActivate } from './provideActivate'
import { provideSignIn } from './provideSignIn'
import { registerQuickAction } from './registerQuickAction'
import { registerTipMessage } from './registerTipMessage'

void ((window as ZettelExtensions.WindowWithStarter).$starter = function (api) {
  this.while('activated', function ({ activatedApi }) {
    this.while('signedIn', function ({ signedInApi }) {
      this.while('pagePanel', function ({ pagePanelApi }) {
        if (!this.scopes.includes(ZettelExtensions.Scope.Page)) return

        const applyPageExtensionData = (): void => {
          const pageExtensionData = this.data.page.extensionData as PageExtensionData
          if (pageExtensionData?.enabled) {
            setPageExtensionData(undefined)
            activate(pageExtensionData.command) // TODO: Replace it with signIn() and await here and make that count for this extension's activation somehow
            return
          }
          initializeQuickAction(Boolean(pageExtensionData?.signedInEmail))
          updateTipMessage(pageExtensionData)
        }

        this.register(pagePanelApi.watch(data => data.page.extensionData as PageExtensionData, applyPageExtensionData))

        async function setPageExtensionData(newPageExtensionData: PageExtensionData): Promise<void> {
          try {
            loadingIndicatorRegistration.activate()
            await signedInApi.access.setPageExtensionData<PageExtensionData>(
              pagePanelApi.target.pageId,
              newPageExtensionData
            )
          } catch {
            // Do nothing!
          } finally {
            loadingIndicatorRegistration.deactivate()
          }
        }

        const { signIn } = provideSignIn.bind(this)(
          { api, activatedApi, pagePanelApi },
          {
            onRequestStart() {
              // setQuickActionDisabled(true)
              loadingIndicatorRegistration.activate()
            },
            onRequestEnd() {
              // setQuickActionDisabled(false)
              loadingIndicatorRegistration.deactivate()
            },
          }
        )

        const { activate } = provideActivate({ signIn })

        const { initializeQuickAction, setQuickActionDisabled } = registerQuickAction.bind(this)(
          { api, pagePanelApi },
          { setPageExtensionData, signIn }
        )

        const loadingIndicatorRegistration = this.register(
          pagePanelApi.registry.loadingIndicator(() => 'Initializing synchronization...'),
          { initiallyInactive: true }
        )

        const { updateTipMessage } = registerTipMessage.bind(this)({ api, pagePanelApi })

        applyPageExtensionData()
      })
    })
  })
})
