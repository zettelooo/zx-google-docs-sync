import { ExtensionHelperFunction, ExtensionLifeSpans } from '@zettelooo/extension-api'
import { PageExtensionData } from '../../shared/PageExtensionData'

export const registerQuickAction: ExtensionHelperFunction<
  'pagePanelRendered',
  'api' | 'pagePanelRendered',
  [
    {
      setPageExtensionData: (pageExtensionData: PageExtensionData) => Promise<void>
      signIn: () => Promise<void>
    }
  ],
  {
    initializeQuickAction: (switchChecked: boolean) => void
    setQuickActionDisabled: (disabled: boolean) => void
  }
> = function ({ api, pagePanelRenderedApi }, { setPageExtensionData, signIn }) {
  const quickActionRegistration = this.register(
    pagePanelRenderedApi.registry.quickAction(() => ({
      title: api.extensionHeader.name,
      description: api.extensionHeader.description,
      avatarUrl: api.extensionHeader.avatar.file
        ? api.getFileUrl(api.extensionHeader.avatar.file)
        : api.extensionHeader.avatar.dataUrl,
      category: ExtensionLifeSpans.PagePanelRendered.QuickAction.Category.Productivity,
      disabled: true,
      switchChecked: false,
      async onClick() {
        await signIn()
      },
      async onToggleSwitch(checked) {
        if (!checked) {
          await setPageExtensionData(undefined)
        } else {
          await signIn()
        }
      },
    }))
  )

  return {
    initializeQuickAction(switchChecked) {
      quickActionRegistration.reference.current?.update({
        disabled: false,
        switchChecked,
      })
    },
    setQuickActionDisabled(disabled) {
      quickActionRegistration.reference.current?.update({ disabled })
    },
  }
}
