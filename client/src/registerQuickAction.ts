import { ExtensionHelperFunction, ExtensionLifeSpans } from '@zettelyay/extension-api'
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
        quickActionRegistration.reference.current?.update({ disabled: true })
        await signIn()
        quickActionRegistration.reference.current?.update({ disabled: false })
      },
      async onToggleSwitch(checked) {
        quickActionRegistration.reference.current?.update({ disabled: true })
        if (!checked) {
          await setPageExtensionData(undefined)
        } else {
          await signIn()
        }
        quickActionRegistration.reference.current?.update({ disabled: false })
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
